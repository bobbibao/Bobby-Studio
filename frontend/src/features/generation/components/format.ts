import type { GenerationSize } from '../contracts';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "3:2" for 1536x1024. */
export function aspectLabel(size: GenerationSize): string {
  const divisor = gcd(size.width, size.height) || 1;
  return `${size.width / divisor}:${size.height / divisor}`;
}

export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** File sizes through Intl (for example "2.4 MB"). */
export function formatBytes(bytes: number, locale?: string): string {
  const units: Array<[number, 'byte' | 'kilobyte' | 'megabyte']> = [
    [1024 * 1024, 'megabyte'],
    [1024, 'kilobyte'],
    [1, 'byte'],
  ];
  const [factor, unit] = units.find(([threshold]) => bytes >= threshold) ?? units[2];
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(bytes / factor);
}

export function formatDateTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Lower-case, Unicode-aware filename fragment from a prompt. */
export function slugify(text: string, maxLength = 48): string {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'bobby-studio';
}

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Download filename: prompt slug plus a UTC timestamp, for example `a-modern-house-20261005-142501.png`. */
export function downloadFileName(prompt: string | null, mimeType: string, isoTimestamp: string | null): string {
  const date = isoTimestamp ? new Date(isoTimestamp) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${valid.getUTCFullYear()}${pad(valid.getUTCMonth() + 1)}${pad(valid.getUTCDate())}-${pad(valid.getUTCHours())}${pad(valid.getUTCMinutes())}${pad(valid.getUTCSeconds())}`;
  return `${slugify(prompt ?? '')}-${stamp}.${EXTENSIONS[mimeType] ?? 'png'}`;
}
