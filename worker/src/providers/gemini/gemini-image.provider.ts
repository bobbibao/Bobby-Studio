import { Logger } from '@nestjs/common';
import { decodeStrictBase64, verifyOutputImage } from '../image-bytes';
import { normalizeBaseUrl, validateGenerationInput } from '../input-validation';
import { classifyHttpFailure, parseJson, parseRetryAfterMs, safeToken, sendProviderRequest, type ProviderHttpResponse } from '../provider-http';
import {
  ProviderError,
  type ImageGenerationInput,
  type ImageGenerationOutput,
  type ImageProvider,
  type ProviderCapabilities,
  type ProviderContext,
  type ProviderLogger,
} from '../provider.port';

/**
 * Gemini native generateContent adapter. It sends a text part, an optional inlineData part and
 * generationConfig.responseModalities / imageConfig.aspectRatio only, and never retries. A 200 is not
 * an image: the adapter requires an inlineData image part. Same code for simulator and live profiles.
 */
const GEMINI_SIZES = [
  { width: 1024, height: 1024, aspectRatio: '1:1' },
  { width: 832, height: 1248, aspectRatio: '2:3' },
  { width: 1248, height: 832, aspectRatio: '3:2' },
  { width: 864, height: 1184, aspectRatio: '3:4' },
  { width: 1184, height: 864, aspectRatio: '4:3' },
  { width: 768, height: 1344, aspectRatio: '9:16' },
  { width: 1344, height: 768, aspectRatio: '16:9' },
] as const;

export const geminiCapabilities: ProviderCapabilities = {
  modes: ['text_to_image', 'sketch_to_image', 'image_to_image'],
  sizes: GEMINI_SIZES.map(({ width, height }) => ({ width, height })),
  qualities: ['preview', 'standard'],
  // generateContent has no quality control; quality is accepted but not sent.
  qualityAffectsOutput: false,
  maxPromptChars: 4000,
  maxInputImageBytes: 10 * 1024 * 1024,
  inputMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  negativePrompt: false,
  seed: false,
  sketchStrength: false,
  controlNet: false,
  lora: false,
  partialImages: false,
  cancellation: false,
};

export interface GeminiImageProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Whether the configured profile is the simulator; only labels usage, never changes behavior. */
  simulated: boolean;
  logger?: ProviderLogger;
  maxResponseBytes?: number;
}

const BLOCKING_FINISH_REASONS = new Set(['SAFETY', 'IMAGE_SAFETY', 'PROHIBITED_CONTENT', 'IMAGE_PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'NO_IMAGE', 'OTHER']);

interface GeminiErrorEnvelope {
  error?: { code?: unknown; status?: unknown; message?: unknown; details?: unknown };
}

interface GeminiPart {
  text?: unknown;
  inlineData?: { mimeType?: unknown; data?: unknown };
  inline_data?: { mime_type?: unknown; data?: unknown };
}

function detailsOf(envelope: GeminiErrorEnvelope | undefined): Array<Record<string, unknown>> {
  const details = envelope?.error?.details;
  return Array.isArray(details) ? details.filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null) : [];
}

/** Parses Google RetryInfo delays such as "30s" or "1.5s". */
function retryInfoMs(details: Array<Record<string, unknown>>): number | undefined {
  for (const detail of details) {
    const delay = detail.retryDelay;
    const match = typeof delay === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(delay) : null;
    if (match) return Math.round(Number(match[1]) * 1000);
  }
  return undefined;
}

export class GeminiImageProvider implements ImageProvider {
  readonly id = 'gemini' as const;
  readonly capabilities = geminiCapabilities;
  private readonly baseUrl: string;
  private readonly logger: ProviderLogger;

  constructor(private readonly options: GeminiImageProviderOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    if (!options.apiKey || !/^[A-Za-z0-9._-]{1,100}$/.test(options.model)) {
      throw new Error('Gemini image provider requires an API key and a valid model name.');
    }
    this.logger = options.logger ?? new Logger('GeminiImageProvider');
  }

  async generate(input: ImageGenerationInput, ctx: ProviderContext): Promise<ImageGenerationOutput> {
    validateGenerationInput(input, this.capabilities);
    const size = GEMINI_SIZES.find((candidate) => candidate.width === input.width && candidate.height === input.height);
    if (!size) throw new ProviderError('UNSUPPORTED_CAPABILITY', `Size ${input.width}x${input.height} is not supported by this provider.`);

    const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
    if (input.inputImage) {
      parts.push({ inlineData: { mimeType: input.inputImage.mimeType, data: Buffer.from(input.inputImage.bytes).toString('base64') } });
    }
    const body = JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: size.aspectRatio } },
    });

    const response = await sendProviderRequest(
      {
        url: `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.options.model)}:generateContent`,
        headers: { 'x-goog-api-key': this.options.apiKey, 'content-type': 'application/json' },
        body,
      },
      ctx,
      { provider: this.id, logger: this.logger, maxResponseBytes: this.options.maxResponseBytes },
    );
    if (response.status < 200 || response.status >= 300) throw this.failure(response);
    return this.decode(response);
  }

  private failure(response: ProviderHttpResponse): ProviderError {
    const envelope = parseJson(response.body) as GeminiErrorEnvelope | undefined;
    const status = safeToken(envelope?.error?.status);
    const details = detailsOf(envelope);
    const reason = safeToken(details.find((d) => typeof d.reason === 'string')?.reason);
    const retryAfterMs = parseRetryAfterMs(response.headers) ?? retryInfoMs(details);

    if (response.status === 400 && reason === 'API_KEY_INVALID') {
      return classifyHttpFailure(401, { providerErrorCode: reason });
    }
    if (response.status === 429) {
      // Gemini reports rate limits and exhausted quota with the same status; separate them by evidence.
      const dailyQuota = details.some((d) =>
        Array.isArray(d.violations) && d.violations.some((v: { quotaId?: unknown }) => typeof v?.quotaId === 'string' && /PerDay/i.test(v.quotaId)),
      );
      const message = typeof envelope?.error?.message === 'string' ? envelope.error.message : '';
      const exhausted = retryAfterMs === undefined && (dailyQuota || /exceeded your current quota/i.test(message));
      return classifyHttpFailure(429, { providerErrorCode: status, quotaExhausted: exhausted, retryAfterMs });
    }
    return classifyHttpFailure(response.status, { providerErrorCode: reason ?? status, retryAfterMs });
  }

  private async decode(response: ProviderHttpResponse): Promise<ImageGenerationOutput> {
    const json = parseJson(response.body) as
      | { candidates?: unknown; promptFeedback?: { blockReason?: unknown }; responseId?: unknown }
      | undefined;
    const malformed = (message: string) => new ProviderError('PROVIDER_MALFORMED_OUTPUT', message, { httpStatus: response.status });
    const noImage = (message: string) => new ProviderError('PROVIDER_NO_IMAGE', message, { httpStatus: response.status });
    if (typeof json !== 'object' || json === null) throw malformed('The provider response is not a JSON object.');
    if (json.promptFeedback?.blockReason) throw noImage('The provider blocked the prompt.');
    if (!Array.isArray(json.candidates)) throw malformed('The provider response has no candidates.');
    if (json.candidates.length === 0) throw noImage('The provider returned no candidates.');

    const candidate = json.candidates[0] as { content?: { parts?: unknown }; finishReason?: unknown } | null;
    const finishReason = typeof candidate?.finishReason === 'string' ? candidate.finishReason : undefined;
    const rawParts = candidate?.content?.parts;
    const parts = Array.isArray(rawParts) ? (rawParts as GeminiPart[]) : [];
    const inline = parts
      .map((part) => ({ mimeType: part.inlineData?.mimeType ?? part.inline_data?.mime_type, data: part.inlineData?.data ?? part.inline_data?.data }))
      .filter((part) => typeof part.mimeType === 'string' && part.mimeType.startsWith('image/'));

    if (inline.length === 0) {
      throw noImage(finishReason && BLOCKING_FINISH_REASONS.has(finishReason) ? `The provider stopped without an image (${finishReason}).` : 'The provider response contains no image part.');
    }
    if (finishReason && finishReason !== 'STOP') throw noImage(`The provider finished with ${finishReason}.`);

    const images: ImageGenerationOutput['images'] = [];
    for (const part of inline) {
      if (typeof part.data !== 'string') throw malformed('The provider image part has no data.');
      const bytes = decodeStrictBase64(part.data);
      if (!bytes) throw malformed('The provider image is not valid base64.');
      const image = await verifyOutputImage(bytes, response.status);
      images.push({ bytes: image.bytes, mimeType: image.mimeType, width: image.width, height: image.height });
    }
    return {
      images,
      providerRequestId: safeToken(json.responseId),
      usage: { unit: 'image', quantity: images.length, simulated: this.options.simulated },
    };
  }
}
