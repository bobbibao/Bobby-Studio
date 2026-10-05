import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SimulatorConfig } from './config';
import type { HttpReply } from './http-utils';
import { sleep } from './http-utils';
import type { Scenario, ScenarioController } from './scenarios';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  config: SimulatorConfig;
  controller: ScenarioController;
  requestId: string;
  /** Aborts when the client connection closes before the response is complete. */
  signal: AbortSignal;
  /** Set once the scenario for this request is known; recorded in the request log. */
  setScenario(scenario: Scenario): void;
}

export type ErrorKind = 'auth' | 'permission' | 'validation' | 'rate_limit' | 'quota' | 'unavailable' | 'safety' | 'internal';

export interface ImagePayload {
  /** Base64 text exactly as it goes on the wire (deliberately invalid for the malformed scenarios). */
  dataB64: string;
  mimeType: string;
  width: number;
  height: number;
}

/** Protocol-specific serializers; the scenario logic around them is shared. */
export interface Responders {
  error(kind: ErrorKind): HttpReply;
  /** A 200 that carries no image (empty data / text-only candidate). */
  noImage(): HttpReply;
  image(payload: ImagePayload): HttpReply;
}

export interface RenderedImage {
  png: Buffer;
  width: number;
  height: number;
}

const ERROR_SCENARIOS: Partial<Record<Scenario, ErrorKind>> = {
  auth: 'auth',
  permission: 'permission',
  validation: 'validation',
  rate_limit: 'rate_limit',
  quota: 'quota',
  unavailable: 'unavailable',
  safety: 'safety',
};

export type HeaderValue = string | undefined;

export function headerValue(req: IncomingMessage, name: string): HeaderValue {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Applies the selected scenario: waits for the configured latency (cancelled with the client), then
 * answers with the scenario's behavior. Rendering only happens for scenarios that return pixels.
 */
export async function respondForScenario(
  ctx: RequestContext,
  scenario: Scenario,
  latencyMs: number,
  responders: Responders,
  render: () => Promise<RenderedImage>,
): Promise<HttpReply | 'destroyed'> {
  try {
    if (latencyMs > 0) await sleep(latencyMs, ctx.signal);

    if (scenario === 'reset') {
      ctx.res.destroy();
      return 'destroyed';
    }
    if (scenario === 'timeout') {
      // Hold the connection until the client gives up; the cap only bounds leaked sockets.
      await sleep(ctx.config.timeoutHoldMs, ctx.signal);
      ctx.res.destroy();
      return 'destroyed';
    }
    const errorKind = ERROR_SCENARIOS[scenario];
    if (errorKind) return responders.error(errorKind);
    if (scenario === 'no_image') return responders.noImage();

    if (scenario === 'malformed') {
      return responders.image({ dataB64: Buffer.from('this is not an image (simulated malformed output)').toString('base64'), mimeType: 'image/png', width: 0, height: 0 });
    }
    if (scenario === 'malformed_base64') {
      return responders.image({ dataB64: '%%%not-valid-base64%%%', mimeType: 'image/png', width: 0, height: 0 });
    }

    const rendered = await render();
    const png = scenario === 'truncated_image' ? rendered.png.subarray(0, Math.floor(rendered.png.length / 2)) : rendered.png;
    return responders.image({ dataB64: png.toString('base64'), mimeType: 'image/png', width: rendered.width, height: rendered.height });
  } catch {
    if (ctx.signal.aborted) return 'destroyed';
    return responders.error('internal');
  }
}
