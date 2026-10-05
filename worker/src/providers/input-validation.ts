import { sniffImageMimeType } from './image-bytes';
import { ProviderError, type ImageGenerationInput, type ProviderCapabilities } from './provider.port';

/** Pre-flight checks shared by adapters. Failures happen before anything leaves the process. */
export function validateGenerationInput(input: ImageGenerationInput, capabilities: ProviderCapabilities): void {
  if (!capabilities.modes.includes(input.mode)) {
    throw new ProviderError('UNSUPPORTED_CAPABILITY', `Mode ${input.mode} is not supported by this provider.`);
  }
  if (!capabilities.qualities.includes(input.quality)) {
    throw new ProviderError('UNSUPPORTED_CAPABILITY', `Quality ${input.quality} is not supported by this provider.`);
  }
  if (typeof input.prompt !== 'string' || input.prompt.trim() === '' || input.prompt.length > capabilities.maxPromptChars) {
    throw new ProviderError('INVALID_INPUT', `The prompt must contain 1 to ${capabilities.maxPromptChars} characters.`);
  }
  if (!capabilities.sizes.some((size) => size.width === input.width && size.height === input.height)) {
    throw new ProviderError('UNSUPPORTED_CAPABILITY', `Size ${input.width}x${input.height} is not supported by this provider.`);
  }
  if (input.mode === 'text_to_image') {
    if (input.inputImage) throw new ProviderError('INVALID_INPUT', 'text_to_image does not accept an input image.');
    return;
  }
  const image = input.inputImage;
  if (!image) throw new ProviderError('INVALID_INPUT', `${input.mode} requires an input image.`);
  if (image.bytes.length === 0 || image.bytes.length > capabilities.maxInputImageBytes) {
    throw new ProviderError('INVALID_INPUT', `The input image must be 1 to ${capabilities.maxInputImageBytes} bytes.`);
  }
  const sniffed = sniffImageMimeType(image.bytes);
  if (!sniffed || sniffed !== image.mimeType || !capabilities.inputMimeTypes.includes(sniffed)) {
    throw new ProviderError('INVALID_INPUT', 'The input image must be PNG, JPEG or WebP and match its declared MIME type.');
  }
}

/** Validates and normalizes a provider base URL once, at construction. Errors never include credentials. */
export function normalizeBaseUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('Image provider base URL is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Image provider base URL must use http or https.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Image provider base URL must not contain credentials, a query string or a fragment.');
  return url.toString().replace(/\/+$/, '');
}
