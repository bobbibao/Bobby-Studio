import { createHash } from 'node:crypto';
import sharp from 'sharp';

/** Bump when the drawing algorithm changes: output bytes are a pure function of this version and the inputs. */
export const RENDERER_VERSION = 'bobby-sim-render-1';

export type RenderQuality = 'low' | 'medium' | 'high';

export interface RenderRequest {
  prompt: string;
  width: number;
  height: number;
  quality: RenderQuality;
  /** Raw bytes of the optional input image, validated by the caller. */
  inputImage?: Uint8Array;
  maxInputPixels: number;
}

const SHAPES_BY_QUALITY: Record<RenderQuality, number> = { low: 6, medium: 12, high: 24 };

/** Seeded xorshift128 over a SHA-256 digest: deterministic, never time or Math.random based. */
class HashRandom {
  private s: Uint32Array;

  constructor(digest: Buffer) {
    this.s = new Uint32Array([digest.readUInt32LE(0) | 1, digest.readUInt32LE(4), digest.readUInt32LE(8), digest.readUInt32LE(12)]);
  }

  next(): number {
    const s = this.s;
    let t = s[3];
    const x = s[0];
    s[3] = s[2];
    s[2] = s[1];
    s[1] = x;
    t ^= t << 11;
    t ^= t >>> 8;
    s[0] = t ^ x ^ (x >>> 19);
    return s[0] / 0x100000000;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function fillCircle(px: Buffer, w: number, h: number, cx: number, cy: number, r: number, color: [number, number, number], alpha: number): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * w + x) * 3;
      px[i] = mix(px[i], color[0], alpha);
      px[i + 1] = mix(px[i + 1], color[1], alpha);
      px[i + 2] = mix(px[i + 2], color[2], alpha);
    }
  }
}

function fillRect(px: Buffer, w: number, h: number, x: number, y: number, rw: number, rh: number, color: [number, number, number], alpha: number): void {
  for (let yy = Math.max(0, y); yy < Math.min(h, y + rh); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(w, x + rw); xx++) {
      const i = (yy * w + xx) * 3;
      px[i] = mix(px[i], color[0], alpha);
      px[i + 1] = mix(px[i + 1], color[1], alpha);
      px[i + 2] = mix(px[i + 2], color[2], alpha);
    }
  }
}

async function decodeInputPixels(bytes: Uint8Array, width: number, height: number, maxInputPixels: number): Promise<Buffer> {
  return sharp(bytes, { limitInputPixels: maxInputPixels, failOn: 'error' })
    .rotate()
    .resize(width, height, { fit: 'cover', kernel: 'lanczos3' })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer();
}

/**
 * Renders a PNG of exactly width x height whose bytes depend only on RENDERER_VERSION, the prompt,
 * the input image bytes, the size and the quality. Content is a hash-derived gradient with geometric
 * shapes, a blended copy of the input image when present, and a hazard-stripe band that marks the
 * picture as simulated output. It verifies transport and lifecycle only; it is not AI inference.
 */
export async function renderSimulatedImage(request: RenderRequest): Promise<Buffer> {
  const { prompt, width, height, quality, inputImage, maxInputPixels } = request;
  const digest = createHash('sha256')
    .update(RENDERER_VERSION)
    .update('\0prompt\0')
    .update(sha256Hex(prompt))
    .update('\0input\0')
    .update(inputImage ? sha256Hex(inputImage) : 'none')
    .update(`\0${width}x${height}\0${quality}`)
    .digest();
  const rnd = new HashRandom(digest);

  const c1: [number, number, number] = [rnd.int(20, 235), rnd.int(20, 235), rnd.int(20, 235)];
  const c2: [number, number, number] = [rnd.int(20, 235), rnd.int(20, 235), rnd.int(20, 235)];
  const angle = rnd.next() * Math.PI * 2;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const span = Math.abs(dirX) * width + Math.abs(dirY) * height;

  const px = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = ((x - width / 2) * dirX + (y - height / 2) * dirY) / span + 0.5;
      const i = (y * width + x) * 3;
      px[i] = mix(c1[0], c2[0], t);
      px[i + 1] = mix(c1[1], c2[1], t);
      px[i + 2] = mix(c1[2], c2[2], t);
    }
  }

  if (inputImage) {
    const source = await decodeInputPixels(inputImage, width, height, maxInputPixels);
    for (let i = 0; i < px.length; i++) px[i] = Math.round(px[i] * 0.4 + source[i] * 0.6);
  }

  const shortSide = Math.min(width, height);
  for (let n = 0; n < SHAPES_BY_QUALITY[quality]; n++) {
    const color: [number, number, number] = [rnd.int(0, 255), rnd.int(0, 255), rnd.int(0, 255)];
    const alpha = 0.25 + rnd.next() * 0.4;
    if (rnd.next() < 0.5) {
      fillCircle(px, width, height, rnd.int(0, width), rnd.int(0, height), shortSide * (0.04 + rnd.next() * 0.16), color, alpha);
    } else {
      const rw = Math.round(shortSide * (0.08 + rnd.next() * 0.3));
      const rh = Math.round(shortSide * (0.08 + rnd.next() * 0.3));
      fillRect(px, width, height, rnd.int(0, width - 1), rnd.int(0, height - 1), rw, rh, color, alpha);
    }
  }

  // Hazard stripes along the bottom edge: visibly not a model output.
  const band = Math.max(8, Math.round(height * 0.03));
  const stripe = Math.max(6, Math.round(band * 1.5));
  for (let y = height - band; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dark = Math.floor((x + y) / stripe) % 2 === 0;
      const i = (y * width + x) * 3;
      px[i] = dark ? 24 : 245;
      px[i + 1] = dark ? 24 : 196;
      px[i + 2] = dark ? 24 : 0;
    }
  }

  return sharp(px, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 6, adaptiveFiltering: false })
    .toBuffer();
}
