export const REFERENCE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const REFERENCE_MAX_BYTES = 10 * 1024 * 1024;

export type ReferenceFileIssue = 'type' | 'size' | 'empty';

/** Client-side check only; the server re-validates type, size and decoded dimensions. */
export function checkReferenceFile(
  file: Pick<File, 'type' | 'size'>,
  options: { maxBytes?: number; mimeTypes?: readonly string[] } = {}
): ReferenceFileIssue | null {
  const maxBytes = Math.min(REFERENCE_MAX_BYTES, options.maxBytes ?? REFERENCE_MAX_BYTES);
  const mimeTypes = options.mimeTypes ?? REFERENCE_MIME_TYPES;
  if (!mimeTypes.includes(file.type)) {
    return 'type';
  }
  if (file.size === 0) {
    return 'empty';
  }
  if (file.size > maxBytes) {
    return 'size';
  }
  return null;
}

/** First image among pasted or dropped items, or null. */
export function firstImageFile(files: ArrayLike<File> | null | undefined): File | null {
  if (!files) {
    return null;
  }
  for (let index = 0; index < files.length; index += 1) {
    if (files[index].type.startsWith('image/')) {
      return files[index];
    }
  }
  return null;
}
