import { randomUUID } from 'node:crypto';
import { checkInputImage, INPUT_MIME_TYPES } from './image-input';
import { headerValue, type ErrorKind, type RenderedImage, type RequestContext, type Responders } from './facade';
import type { HttpReply } from './http-utils';
import { keysMatch } from './auth';
import { renderSimulatedImage, type RenderQuality } from './render';

/**
 * OpenAI Images subset: POST /v1/images/generations (JSON) and POST /v1/images/edits (multipart, one image).
 * Field names, enums and error shapes follow the public Images API reference (checked against the openai
 * SDK 7.28.0 type definitions); only the subset below is accepted and everything else fails explicitly.
 */
export const OPENAI_MODEL = 'simulated-openai-image';
export const OPENAI_SIZES = ['1024x1024', '1536x1024', '1024x1536'] as const;
export const OPENAI_QUALITIES = ['low', 'medium', 'high', 'auto'] as const;
const GENERATION_FIELDS = new Set(['model', 'prompt', 'n', 'size', 'quality', 'output_format']);
const EDIT_FIELDS = new Set(['model', 'prompt', 'n', 'size', 'quality', 'output_format', 'image', 'image[]']);
// Fields the real API documents but this simulator deliberately does not implement.
const UNSUPPORTED_DOCUMENTED_FIELDS = new Set([
  'background', 'moderation', 'output_compression', 'partial_images', 'response_format', 'stream', 'style', 'user', 'mask', 'input_fidelity',
]);
const MAX_PROMPT_CHARS = 32_000;

interface OpenAiErrorBody {
  error: { message: string; type: string; param: string | null; code: string | null };
}

function errorBody(message: string, type: string, param: string | null, code: string | null): OpenAiErrorBody {
  return { error: { message, type, param, code } };
}

function invalid(message: string, param: string | null, code: string | null = 'invalid_value'): HttpReply {
  return { status: 400, body: errorBody(message, 'invalid_request_error', param, code) };
}

export function openAiError(kind: ErrorKind): HttpReply {
  switch (kind) {
    case 'auth':
      return { status: 401, body: errorBody('Incorrect API key provided.', 'invalid_request_error', null, 'invalid_api_key') };
    case 'permission':
      return { status: 403, body: errorBody('You do not have access to this resource (simulated).', 'invalid_request_error', null, 'permission_denied') };
    case 'validation':
      return invalid('Simulated validation failure for the prompt.', 'prompt');
    case 'rate_limit':
      return {
        status: 429,
        headers: { 'retry-after': '1' },
        body: errorBody('Rate limit reached for requests (simulated). Please try again in 1s.', 'requests', null, 'rate_limit_exceeded'),
      };
    case 'quota':
      return {
        status: 429,
        body: errorBody('You exceeded your current quota, please check your plan and billing details. (simulated)', 'insufficient_quota', null, 'insufficient_quota'),
      };
    case 'unavailable':
      return { status: 503, body: errorBody('The server is overloaded or not ready yet. (simulated)', 'server_error', null, null) };
    case 'safety':
      return {
        status: 400,
        body: errorBody('Your request was rejected by the safety system. (simulated)', 'image_generation_user_error', null, 'moderation_blocked'),
      };
    case 'internal':
      return { status: 500, body: errorBody('The simulator failed to render the image.', 'server_error', null, null) };
  }
}

export function openAiMissingKey(): HttpReply {
  return {
    status: 401,
    body: errorBody(
      "You didn't provide an API key. You need to provide your API key in an Authorization header using Bearer auth (i.e. Authorization: Bearer YOUR_KEY).",
      'invalid_request_error',
      null,
      null,
    ),
  };
}

export function openAiTooLarge(): HttpReply {
  return { status: 413, body: errorBody('The request body is too large.', 'invalid_request_error', null, 'request_too_large') };
}

/** Returns an error reply when the Authorization header is absent or wrong, otherwise null. */
export function authenticateOpenAi(ctx: RequestContext): HttpReply | null {
  const header = headerValue(ctx.req, 'authorization');
  if (!header) return openAiMissingKey();
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match || !keysMatch(match[1], ctx.config.apiKey)) return openAiError('auth');
  return null;
}

export interface ParsedOpenAiRequest {
  prompt: string;
  width: number;
  height: number;
  quality: RenderQuality;
  inputImage?: Uint8Array;
}

function resolveSettings(fields: Record<string, unknown>): HttpReply | { size: (typeof OPENAI_SIZES)[number]; quality: RenderQuality } {
  if (fields.model !== OPENAI_MODEL) {
    return { status: 404, body: errorBody(`The model does not exist or is not supported by the simulator. Use '${OPENAI_MODEL}'.`, 'invalid_request_error', 'model', 'model_not_found') };
  }
  if (typeof fields.prompt !== 'string' || fields.prompt.trim() === '') return invalid("'prompt' is required and must be a non-empty string.", 'prompt', 'missing_required_parameter');
  if (fields.prompt.length > MAX_PROMPT_CHARS) return invalid(`'prompt' is longer than ${MAX_PROMPT_CHARS} characters.`, 'prompt', 'string_above_max_length');
  if (fields.n !== undefined && fields.n !== null && Number(fields.n) !== 1) return invalid("The simulator supports only n=1.", 'n');
  const size = fields.size === undefined ? '1024x1024' : fields.size;
  if (!(OPENAI_SIZES as readonly unknown[]).includes(size)) return invalid(`'size' must be one of ${OPENAI_SIZES.join(', ')}.`, 'size');
  const quality = fields.quality === undefined ? 'auto' : fields.quality;
  if (!(OPENAI_QUALITIES as readonly unknown[]).includes(quality)) return invalid(`'quality' must be one of ${OPENAI_QUALITIES.join(', ')}.`, 'quality');
  if (fields.output_format !== undefined && fields.output_format !== 'png') return invalid("The simulator supports only output_format 'png'.", 'output_format');
  return { size: size as (typeof OPENAI_SIZES)[number], quality: (quality === 'auto' ? 'medium' : quality) as RenderQuality };
}

function rejectFieldNames(names: Iterable<string>, allowed: Set<string>): HttpReply | null {
  for (const name of names) {
    if (allowed.has(name)) continue;
    if (UNSUPPORTED_DOCUMENTED_FIELDS.has(name)) {
      return invalid(`Parameter '${name}' is not supported by the Bobby image simulator.`, name, 'unsupported_parameter');
    }
    return invalid(`Unknown parameter: '${name}'.`, name, 'unknown_parameter');
  }
  return null;
}

export async function parseGenerationRequest(contentType: string | undefined, body: Buffer): Promise<HttpReply | ParsedOpenAiRequest> {
  if (!contentType || !/^application\/json\b/i.test(contentType)) {
    return invalid("Content-Type must be 'application/json'.", null, 'invalid_content_type');
  }
  let json: unknown;
  try {
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return invalid('We could not parse the JSON body of your request.', null, 'invalid_json');
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return invalid('The JSON body must be an object.', null, 'invalid_json');
  const fields = json as Record<string, unknown>;
  const rejected = rejectFieldNames(Object.keys(fields), GENERATION_FIELDS);
  if (rejected) return rejected;
  const settings = resolveSettings(fields);
  if ('status' in settings) return settings;
  const [width, height] = settings.size.split('x').map(Number);
  return { prompt: fields.prompt as string, width, height, quality: settings.quality };
}

export async function parseEditRequest(
  contentType: string | undefined,
  body: Buffer,
  limits: { maxInputImageBytes: number; maxInputPixels: number },
): Promise<HttpReply | ParsedOpenAiRequest> {
  if (!contentType || !/^multipart\/form-data\b/i.test(contentType)) {
    return invalid("Content-Type must be 'multipart/form-data'.", null, 'invalid_content_type');
  }
  let form: FormData;
  try {
    form = await new Response(body, { headers: { 'content-type': contentType } }).formData();
  } catch {
    return invalid('The multipart body could not be parsed.', null, 'invalid_multipart');
  }
  const names = [...new Set([...form.keys()])];
  const rejected = rejectFieldNames(names, EDIT_FIELDS);
  if (rejected) return rejected;

  const fields: Record<string, unknown> = {};
  for (const name of names) {
    if (name === 'image' || name === 'image[]') continue;
    const values = form.getAll(name);
    if (values.length !== 1 || typeof values[0] !== 'string') return invalid(`'${name}' must be a single text field.`, name);
    fields[name] = values[0];
  }
  const files = [...form.getAll('image'), ...form.getAll('image[]')];
  if (files.length !== 1) return invalid('Exactly one image is required (field "image" or "image[]").', 'image', 'invalid_image_count');
  const file = files[0];
  if (typeof file === 'string') return invalid("'image' must be a file upload.", 'image');
  if (!INPUT_MIME_TYPES.includes(file.type)) return invalid("The image must be uploaded as image/png, image/jpeg or image/webp.", 'image', 'invalid_image_format');

  const settings = resolveSettings(fields);
  if ('status' in settings) return settings;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = await checkInputImage(bytes, limits);
  if (!check.ok) return invalid(check.message, 'image', 'invalid_image');
  const [width, height] = settings.size.split('x').map(Number);
  return { prompt: fields.prompt as string, width, height, quality: settings.quality, inputImage: bytes };
}

// Documented approximate output-token counts for square images; synthetic values, not metering.
const OUTPUT_TOKENS: Record<RenderQuality, number> = { low: 272, medium: 1056, high: 4160 };

export function openAiResponders(parsed: ParsedOpenAiRequest | null): Responders {
  const quality = parsed?.quality ?? 'medium';
  const size = parsed ? `${parsed.width}x${parsed.height}` : '1024x1024';
  const base = { created: Math.floor(Date.now() / 1000), output_format: 'png', quality, size };
  return {
    error: openAiError,
    noImage: () => ({ status: 200, body: { ...base, data: [] } }),
    image: (payload) => {
      const textTokens = Math.ceil((parsed?.prompt.length ?? 0) / 4);
      const inputImageTokens = parsed?.inputImage ? 256 : 0;
      const outputTokens = OUTPUT_TOKENS[quality];
      return {
        status: 200,
        body: {
          ...base,
          data: [{ b64_json: payload.dataB64 }],
          usage: {
            input_tokens: textTokens + inputImageTokens,
            input_tokens_details: { image_tokens: inputImageTokens, text_tokens: textTokens },
            output_tokens: outputTokens,
            total_tokens: textTokens + inputImageTokens + outputTokens,
          },
        },
      };
    },
  };
}

export function renderOpenAi(parsed: ParsedOpenAiRequest, maxInputPixels: number): () => Promise<RenderedImage> {
  return async () => ({
    png: await renderSimulatedImage({ ...parsed, maxInputPixels }),
    width: parsed.width,
    height: parsed.height,
  });
}

export const newRequestId = (): string => `req_${randomUUID().replace(/-/g, '')}`;
