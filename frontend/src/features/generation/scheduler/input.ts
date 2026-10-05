import type { CatalogModel, CreateGenerationRequest, GenerationIntent, GenerationMode } from '../contracts';
import { hasInk } from '../canvas/strokes';
import type { InputIssueCode, PreparedInput, StudioInput } from './types';

export const MAX_PROMPT_CHARS = 4000;

export function sameSize(a: { width: number; height: number } | null, b: { width: number; height: number } | null): boolean {
  if (a === b) {
    return true;
  }
  return a !== null && b !== null && a.width === b.width && a.height === b.height;
}

/** Equality over everything that makes up the committed input; sketch content is identified by its version. */
export function sameInput(a: StudioInput, b: StudioInput): boolean {
  if (a === b) {
    return true;
  }
  const refA = a.reference;
  const refB = b.reference;
  const sameRef =
    refA === refB || (refA !== null && refB !== null && refA.key === refB.key && refA.assetId === refB.assetId);
  return (
    a.prompt === b.prompt &&
    a.mode === b.mode &&
    a.modelId === b.modelId &&
    a.quality === b.quality &&
    sameSize(a.size, b.size) &&
    a.sketch.version === b.sketch.version &&
    sameRef
  );
}

/** The generation mode a committed input maps to before upload. A blank sketch is prompt-only. */
export function intendedMode(input: StudioInput): GenerationMode {
  if (input.mode === 'reference') {
    return 'image_to_image';
  }
  if (input.mode === 'sketch' && hasInk(input.sketch.strokes)) {
    return 'sketch_to_image';
  }
  return 'text_to_image';
}

export function validateInput(input: StudioInput, model: CatalogModel | null): InputIssueCode | null {
  const prompt = input.prompt.trim();
  if (prompt.length === 0) {
    return 'prompt_empty';
  }
  const maxChars = Math.min(MAX_PROMPT_CHARS, model?.limits.maxPromptChars ?? MAX_PROMPT_CHARS);
  if (prompt.length > maxChars) {
    return 'prompt_too_long';
  }
  if (!model || input.modelId === null) {
    return 'model_missing';
  }
  if (!model.entitled) {
    return 'model_not_entitled';
  }
  if (!input.size || !model.capabilities.sizes.some((size) => size.width === input.size?.width && size.height === input.size?.height)) {
    return 'size_unsupported';
  }
  if (!model.capabilities.qualities.includes(input.quality)) {
    return 'quality_unsupported';
  }
  if (input.mode === 'reference') {
    if (!input.reference) {
      return 'reference_required';
    }
    if (input.reference.assetId === null) {
      return 'reference_uploading';
    }
  }
  if (!model.capabilities.modes.includes(intendedMode(input))) {
    return 'mode_unsupported';
  }
  return null;
}

/** Builds the immutable request body. A sketch that produced no upload falls back to prompt-only. */
export function buildCreateRequest(args: {
  sessionId: string;
  revision: number;
  intent: GenerationIntent;
  input: StudioInput;
  prepared: PreparedInput;
}): CreateGenerationRequest {
  const { sessionId, revision, intent, input, prepared } = args;
  if (!input.modelId || !input.size) {
    throw new Error('A model and size are required before building a generation request.');
  }
  const inputAssetId = prepared.inputAssetId;
  const mode: GenerationMode =
    input.mode === 'reference' ? 'image_to_image' : input.mode === 'sketch' && inputAssetId ? 'sketch_to_image' : 'text_to_image';
  const body: CreateGenerationRequest = {
    studioSessionId: sessionId,
    clientRevision: revision,
    intent,
    modelId: input.modelId,
    mode,
    prompt: input.prompt.trim(),
    size: { width: input.size.width, height: input.size.height },
    quality: input.quality,
  };
  if (inputAssetId && mode !== 'text_to_image') {
    body.inputAssetId = inputAssetId;
  }
  return body;
}

/** Deterministic serialization used to match a replayed request to its idempotency key. */
export function requestFingerprint(body: CreateGenerationRequest): string {
  return JSON.stringify([
    body.studioSessionId,
    body.clientRevision,
    body.intent,
    body.modelId,
    body.mode,
    body.prompt,
    body.inputAssetId ?? null,
    body.size.width,
    body.size.height,
    body.quality,
  ]);
}
