/**
 * Provider-neutral image generation port. No vendor DTOs cross this boundary: adapters serialize
 * provider requests and decode provider responses behind it.
 */
export type ImageGenerationMode = 'text_to_image' | 'sketch_to_image' | 'image_to_image';
export type ImageQuality = 'preview' | 'standard';
export type ProviderId = 'openai' | 'gemini';

export type ImageGenerationInput = {
  /** Bobby catalog model id. The provider model sent on the wire comes from the validated worker profile. */
  modelId: string;
  mode: ImageGenerationMode;
  prompt: string;
  inputImage?: { bytes: Uint8Array; mimeType: string };
  width: number;
  height: number;
  quality: ImageQuality;
};

export type ProviderContext = {
  signal: AbortSignal;
  correlationId: string;
  /** Absolute ISO-8601 deadline for the whole provider call. */
  deadlineAt: string;
};

export type ImageGenerationOutput = {
  /** width/height are measured from the decoded image, not copied from the request. */
  images: Array<{ bytes: Uint8Array; mimeType: string; width?: number; height?: number }>;
  providerRequestId?: string;
  usage?: { unit: string; quantity: number; simulated: boolean };
};

export interface ProviderCapabilities {
  modes: readonly ImageGenerationMode[];
  sizes: ReadonlyArray<{ width: number; height: number }>;
  qualities: readonly ImageQuality[];
  /** False when `quality` is accepted but does not change the provider request. */
  qualityAffectsOutput: boolean;
  maxPromptChars: number;
  maxInputImageBytes: number;
  inputMimeTypes: readonly string[];
  negativePrompt: false;
  seed: false;
  sketchStrength: false;
  controlNet: false;
  lora: false;
  partialImages: false;
  cancellation: false;
}

export interface ImageProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  /**
   * One provider attempt. Adapters never retry: the caller owns the single retry policy and must
   * consult `ProviderError.outcomeUnknown` before re-invoking a paid call.
   */
  generate(input: ImageGenerationInput, ctx: ProviderContext): Promise<ImageGenerationOutput>;
}

export type ProviderErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_CAPABILITY'
  | 'PROVIDER_AUTH'
  | 'PROVIDER_QUOTA_EXHAUSTED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_OUTCOME_UNKNOWN'
  | 'PROVIDER_MALFORMED_OUTPUT'
  | 'PROVIDER_NO_IMAGE'
  | 'CANCELLED';

export interface ProviderErrorOptions {
  retryAfterMs?: number;
  httpStatus?: number;
  /** True when the request may have reached the provider and a paid result may exist. */
  outcomeUnknown?: boolean;
  /** Short sanitized provider error code/type (never the provider's free-text message). */
  providerErrorCode?: string;
}

/** Normalized provider failure. Messages never contain keys, prompts or image data. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryAfterMs?: number;
  readonly httpStatus?: number;
  readonly outcomeUnknown: boolean;
  readonly providerErrorCode?: string;

  constructor(code: ProviderErrorCode, message: string, options: ProviderErrorOptions = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.retryAfterMs = options.retryAfterMs;
    this.httpStatus = options.httpStatus;
    this.outcomeUnknown = options.outcomeUnknown ?? false;
    this.providerErrorCode = options.providerErrorCode;
  }
}

/** Minimal logger surface; Nest's Logger satisfies it. */
export interface ProviderLogger {
  log(message: string): void;
  warn(message: string): void;
}
