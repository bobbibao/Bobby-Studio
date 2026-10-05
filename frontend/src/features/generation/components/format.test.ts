import { describe, expect, it } from 'vitest';
import { aspectLabel, downloadFileName, formatBytes, slugify } from './format';

describe('formatting helpers', () => {
  it('names downloads from the prompt slug and a UTC timestamp, keeping Unicode letters', () => {
    expect(downloadFileName('A modern timber & glass home!', 'image/png', '2026-10-05T14:25:01.000Z')).toBe('a-modern-timber-glass-home-20261005-142501.png');
    expect(downloadFileName('日本の家', 'image/webp', '2026-01-02T03:04:05Z')).toBe('日本の家-20260102-030405.webp');
    expect(downloadFileName(null, 'image/jpeg', '2026-01-02T03:04:05Z')).toBe('bobby-studio-20260102-030405.jpg');
  });

  it('limits slugs and never returns an empty name', () => {
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(48);
    expect(slugify('!!!')).toBe('bobby-studio');
  });

  it('labels aspect ratios and file sizes with Intl', () => {
    expect(aspectLabel({ width: 1536, height: 1024 })).toBe('3:2');
    expect(aspectLabel({ width: 1024, height: 1024 })).toBe('1:1');
    expect(formatBytes(10 * 1024 * 1024, 'en')).toMatch(/10\s?MB/);
    expect(formatBytes(2048, 'en')).toMatch(/2\s?kB|2\s?KB/i);
  });
});
