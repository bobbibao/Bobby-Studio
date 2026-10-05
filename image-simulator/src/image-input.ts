import sharp from 'sharp';

export interface InputImageLimits {
  maxInputImageBytes: number;
  maxInputPixels: number;
}

export type InputImageCheck = { ok: true; mimeType: string; width: number; height: number } | { ok: false; message: string };

const FORMAT_TO_MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
export const INPUT_MIME_TYPES = Object.values(FORMAT_TO_MIME);

/** Verifies an uploaded image: size cap, decodable PNG/JPEG/WebP, pixel cap. Never fetches anything. */
export async function checkInputImage(bytes: Uint8Array, limits: InputImageLimits): Promise<InputImageCheck> {
  if (bytes.length === 0) return { ok: false, message: 'The image is empty.' };
  if (bytes.length > limits.maxInputImageBytes) {
    return { ok: false, message: `The image exceeds ${limits.maxInputImageBytes} bytes.` };
  }
  try {
    const meta = await sharp(bytes, { limitInputPixels: limits.maxInputPixels, failOn: 'error' }).metadata();
    const mimeType = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
    if (!mimeType) return { ok: false, message: 'Only PNG, JPEG and WebP images are supported.' };
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 1 || height < 1 || width * height > limits.maxInputPixels) {
      return { ok: false, message: `The image exceeds ${limits.maxInputPixels} pixels.` };
    }
    // Full decode of one tiny frame proves the data is not just a valid header.
    await sharp(bytes, { limitInputPixels: limits.maxInputPixels, failOn: 'error' }).resize(8, 8, { fit: 'inside' }).raw().toBuffer();
    return { ok: true, mimeType, width, height };
  } catch {
    return { ok: false, message: 'The image could not be decoded.' };
  }
}
