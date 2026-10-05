import { randomUUID } from 'node:crypto';
import { keysMatch } from './auth';
import { headerValue, type ErrorKind, type RenderedImage, type RequestContext, type Responders } from './facade';
import type { HttpReply } from './http-utils';
import { checkInputImage, INPUT_MIME_TYPES } from './image-input';
import { renderSimulatedImage } from './render';

/**
 * Gemini native generateContent subset: POST /v1beta/models/{model}:generateContent with text and
 * optional inlineData parts, generationConfig.responseModalities and generationConfig.imageConfig.aspectRatio.
 * Field names and error shapes follow the public generateContent reference (checked against the
 * @google/genai type definitions). Everything outside this subset fails with INVALID_ARGUMENT.
 */
export const GEMINI_MODEL = 'simulated-gemini-image';
export const GEMINI_PATH = /^\/v1beta\/models\/([^/:]+):generateContent$/;

/** Output sizes for each supported aspect ratio (modeled on the documented 1K outputs; Bobby fixtures). */
export const GEMINI_ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '2:3': { width: 832, height: 1248 },
  '3:2': { width: 1248, height: 832 },
  '3:4': { width: 864, height: 1184 },
  '4:3': { width: 1184, height: 864 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
};

const TOP_LEVEL_FIELDS = new Set(['contents', 'generationConfig']);
const UNSUPPORTED_DOCUMENTED_TOP_LEVEL = new Set(['systemInstruction', 'tools', 'toolConfig', 'safetySettings', 'cachedContent', 'labels', 'serviceTier', 'store']);
const MAX_PROMPT_CHARS = 32_000;

type GeminiStatus = 'INVALID_ARGUMENT' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'RESOURCE_EXHAUSTED' | 'INTERNAL' | 'UNAVAILABLE';

function geminiError(code: number, status: GeminiStatus, message: string, details?: unknown[], headers?: Record<string, string>): HttpReply {
  return { status: code, headers, body: { error: { code, message, status, ...(details ? { details } : {}) } } };
}

const invalid = (message: string): HttpReply => geminiError(400, 'INVALID_ARGUMENT', message);

export function geminiErrorFor(kind: ErrorKind): HttpReply {
  switch (kind) {
    case 'auth':
      return geminiError(400, 'INVALID_ARGUMENT', 'API key not valid. Please pass a valid API key.', [
        { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com', metadata: { service: 'generativelanguage.googleapis.com' } },
      ]);
    case 'permission':
      return geminiError(403, 'PERMISSION_DENIED', 'Permission denied: the key cannot use this model (simulated).');
    case 'validation':
      return invalid('Simulated validation failure for the request.');
    case 'rate_limit':
      return geminiError(
        429,
        'RESOURCE_EXHAUSTED',
        'Resource has been exhausted (e.g. check quota). Please retry later (simulated).',
        [
          { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_requests', quotaId: 'GenerateRequestsPerMinutePerProjectPerModel' }] },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '1s' },
        ],
        { 'retry-after': '1' },
      );
    case 'quota':
      return geminiError(429, 'RESOURCE_EXHAUSTED', 'You exceeded your current quota, please check your plan and billing details. (simulated)', [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_requests', quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] },
      ]);
    case 'unavailable':
      return geminiError(503, 'UNAVAILABLE', 'The model is overloaded. Please try again later. (simulated)');
    case 'safety':
      // Gemini reports blocked output as a 200 without an image part, not as an HTTP error.
      return { status: 200, body: { candidates: [{ finishReason: 'IMAGE_SAFETY', index: 0 }], usageMetadata: { promptTokenCount: 0, totalTokenCount: 0 }, modelVersion: GEMINI_MODEL, responseId: newResponseId() } };
    case 'internal':
      return geminiError(500, 'INTERNAL', 'The simulator failed to render the image.');
  }
}

export function geminiTooLarge(): HttpReply {
  return geminiError(413, 'INVALID_ARGUMENT', 'The request body is too large.');
}

export function geminiNotFound(model: string): HttpReply {
  return geminiError(404, 'NOT_FOUND', `models/${model} is not found for API version v1beta, or is not supported for generateContent. Use '${GEMINI_MODEL}'.`);
}

export function geminiBadScenarioHeader(message: string): HttpReply {
  return invalid(message);
}

/** Returns an error reply when the key is absent or wrong, otherwise null. Header wins over ?key=. */
export function authenticateGemini(ctx: RequestContext): HttpReply | null {
  const provided = headerValue(ctx.req, 'x-goog-api-key') ?? ctx.url.searchParams.get('key') ?? undefined;
  if (!provided) {
    return geminiError(403, 'PERMISSION_DENIED', "Method doesn't allow unregistered callers (callers without established identity). Please use API Key or other form of API consumer identity to call this API.");
  }
  return keysMatch(provided, ctx.config.apiKey) ? null : geminiErrorFor('auth');
}

export interface ParsedGeminiRequest {
  prompt: string;
  aspectRatio: string;
  width: number;
  height: number;
  includeText: boolean;
  inputImage?: Uint8Array;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function unknownName(name: string, documented: Set<string>): HttpReply {
  return documented.has(name)
    ? invalid(`Field "${name}" is not supported by the Bobby image simulator.`)
    : invalid(`Invalid JSON payload received. Unknown name "${name}": Cannot find field.`);
}

// Flat character class (no repeated groups) so very long inputs cannot overflow the regex engine's stack.
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

export async function parseGenerateContentRequest(
  body: Buffer,
  limits: { maxInputImageBytes: number; maxInputPixels: number },
): Promise<HttpReply | ParsedGeminiRequest> {
  let json: unknown;
  try {
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return invalid('Invalid JSON payload received. The body is not valid JSON.');
  }
  if (!isObject(json)) return invalid('Invalid JSON payload received. The body must be an object.');
  for (const name of Object.keys(json)) {
    if (!TOP_LEVEL_FIELDS.has(name)) return unknownName(name, UNSUPPORTED_DOCUMENTED_TOP_LEVEL);
  }

  const { contents, generationConfig } = json;
  if (!Array.isArray(contents) || contents.length !== 1 || !isObject(contents[0])) {
    return invalid("'contents' must contain exactly one content entry.");
  }
  const content = contents[0];
  for (const name of Object.keys(content)) {
    if (name !== 'role' && name !== 'parts') return unknownName(`contents[0].${name}`, new Set());
  }
  if (content.role !== undefined && content.role !== 'user') return invalid("contents[0].role must be 'user' when present.");
  if (!Array.isArray(content.parts) || content.parts.length < 1 || content.parts.length > 2) {
    return invalid('contents[0].parts must contain one text part and at most one inlineData part.');
  }

  let prompt: string | undefined;
  let inputImage: Uint8Array | undefined;
  for (const [index, part] of content.parts.entries()) {
    if (!isObject(part)) return invalid(`contents[0].parts[${index}] must be an object.`);
    const keys = Object.keys(part);
    if (keys.length !== 1) return invalid(`contents[0].parts[${index}] must carry exactly one of 'text' or 'inlineData'.`);
    const key = keys[0];
    if (key === 'text') {
      if (prompt !== undefined) return invalid('Only one text part is supported.');
      if (typeof part.text !== 'string' || part.text.trim() === '') return invalid('The text part must be a non-empty string.');
      if (part.text.length > MAX_PROMPT_CHARS) return invalid(`The text part is longer than ${MAX_PROMPT_CHARS} characters.`);
      prompt = part.text;
    } else if (key === 'inlineData' || key === 'inline_data') {
      if (inputImage !== undefined) return invalid('Only one inlineData part is supported.');
      const inline = part[key];
      if (!isObject(inline)) return invalid('inlineData must be an object.');
      const mimeType = inline.mimeType ?? inline.mime_type;
      const data = inline.data;
      for (const name of Object.keys(inline)) {
        if (!['mimeType', 'mime_type', 'data'].includes(name)) return unknownName(`inlineData.${name}`, new Set());
      }
      if (typeof mimeType !== 'string' || !INPUT_MIME_TYPES.includes(mimeType)) return invalid('inlineData.mimeType must be image/png, image/jpeg or image/webp.');
      if (typeof data === 'string' && data.length > Math.ceil(limits.maxInputImageBytes / 3) * 4) {
        return invalid(`inlineData.data exceeds the ${limits.maxInputImageBytes} byte image limit.`);
      }
      if (typeof data !== 'string' || data.length === 0 || data.length % 4 !== 0 || !BASE64_PATTERN.test(data)) {
        return invalid('inlineData.data must be standard base64.');
      }
      const bytes = new Uint8Array(Buffer.from(data, 'base64'));
      const check = await checkInputImage(bytes, limits);
      if (!check.ok) return invalid(`inlineData: ${check.message}`);
      if (check.mimeType !== mimeType) return invalid('inlineData.mimeType does not match the image data.');
      inputImage = bytes;
    } else {
      return unknownName(`contents[0].parts[${index}].${key}`, new Set());
    }
  }
  if (prompt === undefined) return invalid('A text part is required.');

  let aspectRatio = '1:1';
  let includeText = true;
  if (generationConfig !== undefined) {
    if (!isObject(generationConfig)) return invalid("'generationConfig' must be an object.");
    for (const name of Object.keys(generationConfig)) {
      if (name !== 'responseModalities' && name !== 'imageConfig') return unknownName(`generationConfig.${name}`, new Set());
    }
    const modalities = generationConfig.responseModalities;
    if (modalities !== undefined) {
      if (!Array.isArray(modalities) || !modalities.every((m) => m === 'TEXT' || m === 'IMAGE') || !modalities.includes('IMAGE') || new Set(modalities).size !== modalities.length) {
        return invalid("generationConfig.responseModalities must be ['IMAGE'] or ['TEXT', 'IMAGE'].");
      }
      includeText = modalities.includes('TEXT');
    }
    const imageConfig = generationConfig.imageConfig;
    if (imageConfig !== undefined) {
      if (!isObject(imageConfig)) return invalid('generationConfig.imageConfig must be an object.');
      for (const name of Object.keys(imageConfig)) {
        if (name !== 'aspectRatio') return unknownName(`generationConfig.imageConfig.${name}`, new Set(['imageSize']));
      }
      if (imageConfig.aspectRatio !== undefined) {
        if (typeof imageConfig.aspectRatio !== 'string' || !(imageConfig.aspectRatio in GEMINI_ASPECT_RATIOS)) {
          return invalid(`generationConfig.imageConfig.aspectRatio must be one of ${Object.keys(GEMINI_ASPECT_RATIOS).join(', ')}.`);
        }
        aspectRatio = imageConfig.aspectRatio;
      }
    }
  }
  const { width, height } = GEMINI_ASPECT_RATIOS[aspectRatio];
  return { prompt, aspectRatio, width, height, includeText, inputImage };
}

const newResponseId = (): string => randomUUID().replace(/-/g, '').slice(0, 22);

export function geminiResponders(parsed: ParsedGeminiRequest | null): Responders {
  const promptTokens = Math.ceil((parsed?.prompt.length ?? 0) / 4) + (parsed?.inputImage ? 258 : 0);
  const base = { modelVersion: GEMINI_MODEL, responseId: newResponseId() };
  return {
    error: geminiErrorFor,
    noImage: () => ({
      status: 200,
      body: {
        candidates: [{ content: { role: 'model', parts: [{ text: 'No image was produced (simulated text-only response).' }] }, finishReason: 'STOP', index: 0 }],
        usageMetadata: { promptTokenCount: promptTokens, candidatesTokenCount: 12, totalTokenCount: promptTokens + 12 },
        ...base,
      },
    }),
    image: (payload) => {
      const parts: unknown[] = [];
      if (parsed?.includeText !== false) parts.push({ text: 'Simulated image (deterministic fixture, not AI inference).' });
      parts.push({ inlineData: { mimeType: payload.mimeType, data: payload.dataB64 } });
      return {
        status: 200,
        body: {
          candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP', index: 0 }],
          usageMetadata: { promptTokenCount: promptTokens, candidatesTokenCount: 1290, totalTokenCount: promptTokens + 1290 },
          ...base,
        },
      };
    },
  };
}

export function renderGemini(parsed: ParsedGeminiRequest, maxInputPixels: number): () => Promise<RenderedImage> {
  return async () => ({
    png: await renderSimulatedImage({ prompt: parsed.prompt, width: parsed.width, height: parsed.height, quality: 'medium', inputImage: parsed.inputImage, maxInputPixels }),
    width: parsed.width,
    height: parsed.height,
  });
}
