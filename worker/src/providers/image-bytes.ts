import * as sharp from 'sharp';
import { ProviderError } from './provider.port';

export const ACCEPTED_OUTPUT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_OUTPUT_PIXELS = 36_000_000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/** Strict standard-alphabet base64 decoding: rejects whitespace, URL-safe alphabet and bad padding. */
export function decodeStrictBase64(text: string): Buffer | null {
  if (text.length === 0 || text.length % 4 !== 0 || !BASE64_PATTERN.test(text)) return null;
  const bytes = Buffer.from(text, 'base64');
  return bytes.length > 0 ? bytes : null;
}

/** Detects PNG, JPEG or WebP from magic bytes only. */
export function sniffImageMimeType(bytes: Uint8Array): (typeof ACCEPTED_OUTPUT_MIME_TYPES)[number] | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export interface DecodedImage {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Verifies provider output: magic bytes, a bounded full decode (so truncated data fails) and measured
 * dimensions. Any failure is PROVIDER_MALFORMED_OUTPUT; the paid call completed, so it is not unknown.
 */
export async function verifyOutputImage(bytes: Buffer, httpStatus?: number): Promise<DecodedImage> {
  const malformed = (message: string) => new ProviderError('PROVIDER_MALFORMED_OUTPUT', message, { httpStatus });
  if (bytes.length > MAX_OUTPUT_BYTES) throw malformed('The provider image exceeds the size limit.');
  const mimeType = sniffImageMimeType(bytes);
  if (!mimeType) throw malformed('The provider output is not a PNG, JPEG or WebP image.');
  try {
    const { info } = await sharp(bytes, { limitInputPixels: MAX_OUTPUT_PIXELS, failOn: 'warning' }).raw().toBuffer({ resolveWithObject: true });
    return { bytes, mimeType, width: info.width, height: info.height };
  } catch {
    throw malformed('The provider image could not be decoded.');
  }
}
