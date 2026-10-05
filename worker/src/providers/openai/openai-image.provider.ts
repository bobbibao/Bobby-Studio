import { Logger } from '@nestjs/common';
import { decodeStrictBase64, verifyOutputImage } from '../image-bytes';
import { normalizeBaseUrl, validateGenerationInput } from '../input-validation';
import { classifyHttpFailure, parseJson, parseRetryAfterMs, safeToken, sendProviderRequest, type ProviderHttpResponse } from '../provider-http';
import {
  ProviderError,
  type ImageGenerationInput,
  type ImageGenerationOutput,
  type ImageProvider,
  type ImageQuality,
  type ProviderCapabilities,
  type ProviderContext,
  type ProviderLogger,
} from '../provider.port';

/**
 * OpenAI Images adapter (JSON generations and multipart edits). It serializes only the documented
 * fields below and never retries. The same code runs against a simulator or a live endpoint: only the
 * validated profile (base URL, model, key) differs. Compatibility is limited to this subset.
 */
export const openAiCapabilities: ProviderCapabilities = {
  modes: ['text_to_image', 'sketch_to_image', 'image_to_image'],
  sizes: [
    { width: 1024, height: 1024 },
    { width: 1536, height: 1024 },
    { width: 1024, height: 1536 },
  ],
  qualities: ['preview', 'standard'],
  qualityAffectsOutput: true,
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

/** Bobby quality to OpenAI `quality`: preview is low, standard is medium. */
export const OPENAI_QUALITY_MAP: Record<ImageQuality, 'low' | 'medium'> = { preview: 'low', standard: 'medium' };

export interface OpenAiImageProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Whether the configured profile is the simulator; only labels usage, never changes behavior. */
  simulated: boolean;
  logger?: ProviderLogger;
  maxResponseBytes?: number;
}

const OPENAI_QUOTA_CODES = new Set(['insufficient_quota', 'billing_hard_limit_reached']);

export class OpenAiImageProvider implements ImageProvider {
  readonly id = 'openai' as const;
  readonly capabilities = openAiCapabilities;
  private readonly baseUrl: string;
  private readonly logger: ProviderLogger;

  constructor(private readonly options: OpenAiImageProviderOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    if (!options.apiKey || !options.model) throw new Error('OpenAI image provider requires an API key and a model.');
    this.logger = options.logger ?? new Logger('OpenAiImageProvider');
  }

  async generate(input: ImageGenerationInput, ctx: ProviderContext): Promise<ImageGenerationOutput> {
    validateGenerationInput(input, this.capabilities);
    const fields = {
      model: this.options.model,
      prompt: input.prompt,
      n: 1,
      size: `${input.width}x${input.height}`,
      quality: OPENAI_QUALITY_MAP[input.quality],
      output_format: 'png',
    };
    const headers: Record<string, string> = { authorization: `Bearer ${this.options.apiKey}` };

    let url: string;
    let body: string | FormData;
    if (input.inputImage) {
      const form = new FormData();
      for (const [name, value] of Object.entries(fields)) form.set(name, String(value));
      form.append('image', new Blob([input.inputImage.bytes], { type: input.inputImage.mimeType }), 'input');
      url = `${this.baseUrl}/v1/images/edits`;
      body = form;
    } else {
      headers['content-type'] = 'application/json';
      url = `${this.baseUrl}/v1/images/generations`;
      body = JSON.stringify(fields);
    }

    const response = await sendProviderRequest({ url, headers, body }, ctx, {
      provider: this.id,
      logger: this.logger,
      maxResponseBytes: this.options.maxResponseBytes,
    });
    if (response.status < 200 || response.status >= 300) throw this.failure(response);
    return this.decode(response);
  }

  private failure(response: ProviderHttpResponse): ProviderError {
    const parsed = parseJson(response.body) as { error?: { code?: unknown; type?: unknown } } | undefined;
    const code = safeToken(parsed?.error?.code);
    const type = safeToken(parsed?.error?.type);
    return classifyHttpFailure(response.status, {
      providerErrorCode: code ?? type,
      quotaExhausted: (code !== undefined && OPENAI_QUOTA_CODES.has(code)) || type === 'insufficient_quota',
      noImage: code === 'moderation_blocked',
      retryAfterMs: parseRetryAfterMs(response.headers),
    });
  }

  private async decode(response: ProviderHttpResponse): Promise<ImageGenerationOutput> {
    const json = parseJson(response.body) as { data?: unknown } | undefined;
    const malformed = (message: string) => new ProviderError('PROVIDER_MALFORMED_OUTPUT', message, { httpStatus: response.status });
    if (typeof json !== 'object' || json === null || !Array.isArray(json.data)) throw malformed('The provider response has no data array.');
    if (json.data.length === 0) throw new ProviderError('PROVIDER_NO_IMAGE', 'The provider returned no image.', { httpStatus: response.status });
    if (json.data.length !== 1) throw malformed('The provider returned more images than requested.');
    const item = json.data[0] as { b64_json?: unknown } | null;
    if (!item || typeof item.b64_json !== 'string') throw malformed('The provider response has no base64 image.');
    const bytes = decodeStrictBase64(item.b64_json);
    if (!bytes) throw malformed('The provider image is not valid base64.');
    const image = await verifyOutputImage(bytes, response.status);
    return {
      images: [{ bytes: image.bytes, mimeType: image.mimeType, width: image.width, height: image.height }],
      providerRequestId: safeToken(response.headers.get('x-request-id') ?? undefined),
      usage: { unit: 'image', quantity: 1, simulated: this.options.simulated },
    };
  }
}
