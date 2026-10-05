#!/usr/bin/env node
// One inference through the worker's real provider adapter using the configured profile.
//
//   node scripts/provider-smoke.mjs                  simulated profiles only
//   node scripts/provider-smoke.mjs --confirm-spend  required for a live profile: performs ONE paid request
//
// Prints a sanitized outcome (status, dimensions, duration). Never prints the key, prompt or image data.
import { createRequire } from 'node:module';
import path from 'node:path';
import { appDir, log, readEnvFile } from './lib/common.mjs';

const workerEnv = Object.fromEntries(readEnvFile(path.join(appDir('worker'), '.env')));
const require = createRequire(import.meta.url);
const { loadWorkerConfig } = require(path.join(appDir('worker'), 'dist/config/worker-config.js'));
const { createImageProvider } = require(path.join(appDir('worker'), 'dist/providers/provider.registry.js'));

const config = loadWorkerConfig(workerEnv);
const live = config.imageProvider.mode === 'live';
if (live && !process.argv.includes('--confirm-spend')) {
  log(`Profile ${config.imageProvider.id}/live would make a real, billable request to ${new URL(config.imageProvider.baseUrl).host}.`);
  log('Re-run with --confirm-spend to perform exactly one request.');
  process.exit(2);
}

const provider = createImageProvider(config.imageProvider);
const size = provider.capabilities.sizes[0];
const started = Date.now();
try {
  const output = await provider.generate(
    { modelId: config.imageProvider.model, mode: 'text_to_image', prompt: 'A simple geometric house outline', width: size.width, height: size.height, quality: 'preview' },
    { signal: new AbortController().signal, correlationId: 'provider-smoke', deadlineAt: new Date(Date.now() + 120_000).toISOString() },
  );
  const [image] = output.images;
  log(`ok: ${config.imageProvider.id}/${config.imageProvider.mode} returned ${image.mimeType} ${image.width ?? '?'}x${image.height ?? '?'} (${image.bytes.length} bytes) in ${Date.now() - started} ms; simulated=${output.usage?.simulated ?? 'unknown'}`);
} catch (error) {
  log(`failed: code=${error.code ?? 'UNKNOWN'} outcomeUnknown=${error.outcomeUnknown ?? 'n/a'} status=${error.httpStatus ?? '-'} after ${Date.now() - started} ms`);
  process.exit(1);
}
