import type { WorkerRuntimeConfig } from '../config/worker-config';
import { GeminiImageProvider } from './gemini/gemini-image.provider';
import { OpenAiImageProvider } from './openai/openai-image.provider';
import type { ImageProvider, ProviderLogger } from './provider.port';

/**
 * Builds the one configured provider. Selection is by `config.id` only: never by key prefix, never
 * with a fallback to another provider, and never by silently choosing a live endpoint.
 */
export function createImageProvider(config: WorkerRuntimeConfig['imageProvider'], logger?: ProviderLogger): ImageProvider {
  const options = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    simulated: config.mode === 'simulated',
    logger,
  };
  switch (config.id) {
    case 'openai':
      return new OpenAiImageProvider(options);
    case 'gemini':
      return new GeminiImageProvider(options);
    default: {
      const unsupported: never = config.id;
      throw new Error(`Unsupported image provider id: ${String(unsupported)}`);
    }
  }
}
