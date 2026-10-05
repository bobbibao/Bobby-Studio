import { createHash } from 'crypto';
import { GenerationMode, GenerationQuality, GenerationSize } from './contracts';

/** What is stored in ImageRequest.parameters and ImageJob.payload (never image bytes). */
export interface JobPayload {
  modelId: string;
  mode: GenerationMode;
  prompt: string;
  size: GenerationSize;
  quality: GenerationQuality;
  inputAssetId: string | null;
  inputHash: string;
}

/**
 * Deterministic fingerprint of the logical request: normalized prompt, input content digest, model,
 * mode, size, quality and intent. Timestamps, revisions and temporary URLs are excluded.
 */
export function computeInputHash(parts: {
  prompt: string;
  inputSha256: string | null;
  modelId: string;
  mode: GenerationMode;
  size: GenerationSize;
  quality: GenerationQuality;
  intent: string;
}): string {
  const canonical = JSON.stringify([
    1,
    parts.prompt.normalize('NFC').trim(),
    parts.inputSha256,
    parts.modelId,
    parts.mode,
    parts.size.width,
    parts.size.height,
    parts.quality,
    parts.intent,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}
