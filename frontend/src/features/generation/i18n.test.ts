import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/translations/locales/en/studio.json';
import { createTestI18n } from './test/render';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

const available = new Set(flatten(en).map((key) => key.replace(/_(one|other)$/, '')));

describe('studio copy', () => {
  it('every literal translation key used by the feature exists in the English namespace', () => {
    const files = walk(join(__dirname)).filter((path) => /\.tsx?$/.test(path) && !path.includes('.test.') && !path.includes('/test/'));
    const used = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\(\s*(?:[^'"`()]*\?\s*)?'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+|title)'/g)) {
        used.add(match[1]);
      }
      for (const match of source.matchAll(/'((?:versions|result|errors|issues|status|input|settings|reference|realtime)\.[a-z_]+)'/g)) {
        used.add(match[1]);
      }
    }
    const dynamic = [
      ...['prompt_empty', 'prompt_too_long', 'model_missing', 'model_not_entitled', 'size_unsupported', 'quality_unsupported', 'mode_unsupported', 'reference_required', 'reference_uploading', 'reference_failed'].map((key) => `issues.${key}`),
      ...['preview', 'standard'].map((key) => `settings.quality_${key}`),
      ...['type', 'size', 'empty'].map((key) => `reference.issue_${key}`),
      ...['prompt', 'sketch', 'reference'].map((key) => `input.mode_${key}`),
      ...['timber', 'library', 'courtyard'].map((key) => `input.example_${key}`),
    ];
    const missing = [...used, ...dynamic].filter((key) => key !== 'title' && !available.has(key));
    expect(used.size).toBeGreaterThan(60);
    expect(missing).toEqual([]);
    expect(available.has('title')).toBe(true);
  });

  it('falls back to the key text rather than crashing for an unknown key and keeps Bobby Studio branding', () => {
    const i18n = createTestI18n();
    expect(i18n.t('studio:does.not.exist')).toBe('does.not.exist');
    expect(i18n.t('title')).toBe('Bobby Studio');
    expect(i18n.t('errors.rate_limited', { count: 1 })).toContain('1 second.');
    expect(i18n.t('errors.rate_limited', { count: 5 })).toContain('5 seconds.');
  });
});
