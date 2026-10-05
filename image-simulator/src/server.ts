import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { keysMatch } from './auth';
import type { SimulatorConfig } from './config';
import { headerValue, respondForScenario, type RequestContext, type Responders } from './facade';
import {
  authenticateGemini,
  GEMINI_MODEL,
  GEMINI_PATH,
  geminiBadScenarioHeader,
  geminiNotFound,
  geminiResponders,
  geminiTooLarge,
  parseGenerateContentRequest,
  renderGemini,
} from './gemini';
import { readBody, sendReply, type HttpReply } from './http-utils';
import {
  authenticateOpenAi,
  newRequestId,
  openAiResponders,
  openAiTooLarge,
  parseEditRequest,
  parseGenerationRequest,
  renderOpenAi,
} from './openai';
import { isScenario, parseScenarioHeader, ScenarioController, SCENARIOS, type Scenario } from './scenarios';

export const SCENARIO_HEADER = 'x-bobby-simulator-scenario';
export const LATENCY_HEADER = 'x-bobby-simulator-latency-ms';
const CONTROL_BODY_LIMIT = 64 * 1024;
const LOG_LIMIT = 100;

interface LogEntry {
  route: string;
  scenario: Scenario | null;
  status: number | null;
}

/** Counters and a bounded log of facade requests. Never records prompts, keys or image data. */
class RequestLog {
  received = 0;
  readonly byRoute: Record<string, number> = {};
  readonly entries: LogEntry[] = [];

  arrive(route: string): void {
    this.received += 1;
    this.byRoute[route] = (this.byRoute[route] ?? 0) + 1;
  }

  finish(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > LOG_LIMIT) this.entries.shift();
  }

  clear(): void {
    this.received = 0;
    for (const key of Object.keys(this.byRoute)) delete this.byRoute[key];
    this.entries.length = 0;
  }
}

export interface SimulatorHandle {
  server: Server;
  controller: ScenarioController;
}

interface FacadeBinding {
  route: string;
  authenticate(ctx: RequestContext): HttpReply | null;
  tooLarge(): HttpReply;
  badControlHeader(message: string): HttpReply;
  /** Parses and validates the body; on success provides the responders and the renderer. */
  prepare(ctx: RequestContext, body: Buffer): Promise<HttpReply | { responders: Responders; render: () => ReturnType<ReturnType<typeof renderOpenAi>> }>;
}

const plain = (status: number, message: string): HttpReply => ({ status, body: { error: { message } } });

function openAiBinding(route: 'generations' | 'edits'): FacadeBinding {
  return {
    route: `openai.${route}`,
    authenticate: authenticateOpenAi,
    tooLarge: openAiTooLarge,
    badControlHeader: (message) => ({ status: 400, body: { error: { message, type: 'invalid_request_error', param: null, code: 'invalid_simulator_header' } } }),
    async prepare(ctx, body) {
      const contentType = headerValue(ctx.req, 'content-type');
      const limits = { maxInputImageBytes: ctx.config.maxInputImageBytes, maxInputPixels: ctx.config.maxInputPixels };
      const parsed = route === 'generations' ? await parseGenerationRequest(contentType, body) : await parseEditRequest(contentType, body, limits);
      if ('status' in parsed) return parsed;
      return { responders: openAiResponders(parsed), render: renderOpenAi(parsed, ctx.config.maxInputPixels) };
    },
  };
}

function geminiBinding(model: string): FacadeBinding {
  return {
    route: 'gemini.generateContent',
    authenticate: authenticateGemini,
    tooLarge: geminiTooLarge,
    badControlHeader: geminiBadScenarioHeader,
    async prepare(ctx, body) {
      if (model !== GEMINI_MODEL) return geminiNotFound(model);
      const parsed = await parseGenerateContentRequest(body, { maxInputImageBytes: ctx.config.maxInputImageBytes, maxInputPixels: ctx.config.maxInputPixels });
      if ('status' in parsed) return parsed;
      return { responders: geminiResponders(parsed), render: renderGemini(parsed, ctx.config.maxInputPixels) };
    },
  };
}

function resolveBinding(method: string, pathname: string): FacadeBinding | 'method' | null {
  const geminiMatch = GEMINI_PATH.exec(pathname);
  const binding = pathname === '/v1/images/generations' ? openAiBinding('generations')
    : pathname === '/v1/images/edits' ? openAiBinding('edits')
    : geminiMatch ? geminiBinding(decodeURIComponent(geminiMatch[1]))
    : null;
  if (!binding) return null;
  return method === 'POST' ? binding : 'method';
}

export function createSimulatorServer(config: SimulatorConfig): SimulatorHandle {
  const controller = new ScenarioController();
  const log = new RequestLog();

  async function handleControl(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
    const provided = /^Bearer\s+(\S+)$/i.exec(headerValue(req, 'authorization') ?? '')?.[1] ?? headerValue(req, 'x-goog-api-key');
    if (!keysMatch(provided, config.apiKey)) {
      req.resume();
      sendReply(res, plain(401, 'A valid simulator API key is required for control endpoints.'));
      return;
    }
    if (pathname === '/__sim/requests' && req.method === 'GET') {
      sendReply(res, { status: 200, body: { received: log.received, byRoute: log.byRoute, recent: log.entries, scenario: controller.status() } });
      return;
    }
    if (req.method !== 'POST' || (pathname !== '/__sim/scenario' && pathname !== '/__sim/reset')) {
      req.resume();
      const known = ['/__sim/scenario', '/__sim/reset', '/__sim/requests'].includes(pathname);
      sendReply(res, plain(known ? 405 : 404, 'Unsupported control request.'));
      return;
    }
    const body = await readBody(req, CONTROL_BODY_LIMIT);
    if (body.kind === 'too_large') {
      sendReply(res, plain(413, 'Control body too large.'));
      return;
    }
    if (pathname === '/__sim/reset') {
      controller.reset();
      log.clear();
      sendReply(res, { status: 200, body: { status: 'ok', scenario: controller.status() } });
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(body.data.toString('utf8'));
    } catch {
      sendReply(res, plain(400, 'Control body must be JSON.'));
      return;
    }
    const input = (typeof json === 'object' && json !== null && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
    const unknownKeys = Object.keys(input).filter((key) => !['scenario', 'times', 'then'].includes(key));
    const { scenario, times, then } = input;
    const timesOk = times === undefined || (typeof times === 'number' && Number.isInteger(times) && times >= 1 && times <= 1_000_000);
    if (unknownKeys.length > 0 || !isScenario(scenario) || !timesOk || (then !== undefined && !isScenario(then))) {
      sendReply(res, plain(400, `Body must be {scenario: ${SCENARIOS.join('|')}, times?: 1..1000000, then?: scenario}.`));
      return;
    }
    controller.set(scenario, times === undefined ? null : (times as number), then === undefined ? 'success' : (then as Scenario));
    sendReply(res, { status: 200, body: { status: 'ok', scenario: controller.status() } });
  }

  async function handleFacade(req: IncomingMessage, res: ServerResponse, url: URL, binding: FacadeBinding): Promise<void> {
    log.arrive(binding.route);
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) abort.abort();
    });
    let scenarioUsed: Scenario | null = null;
    res.on('close', () => log.finish({ route: binding.route, scenario: scenarioUsed, status: res.headersSent ? res.statusCode : null }));

    const requestId = newRequestId();
    const ctx: RequestContext = {
      req,
      res,
      url,
      config,
      controller,
      requestId,
      signal: abort.signal,
      setScenario: (scenario) => {
        scenarioUsed = scenario;
      },
    };
    const reply = (value: HttpReply) => sendReply(res, value, { 'x-request-id': requestId });

    const authFailure = binding.authenticate(ctx);
    if (authFailure) {
      req.resume();
      reply(authFailure);
      return;
    }

    const scenarioHeader = headerValue(req, SCENARIO_HEADER);
    if (scenarioHeader !== undefined && !parseScenarioHeader(scenarioHeader)) {
      req.resume();
      reply(binding.badControlHeader(`${SCENARIO_HEADER} must be <name>[:<n>] with name one of ${SCENARIOS.join(', ')}.`));
      return;
    }
    const latencyHeader = headerValue(req, LATENCY_HEADER);
    let latencyMs = config.defaultLatencyMs;
    if (latencyHeader !== undefined) {
      const parsed = Number(latencyHeader);
      if (!/^\d{1,6}$/.test(latencyHeader.trim()) || parsed > config.maxLatencyMs) {
        req.resume();
        reply(binding.badControlHeader(`${LATENCY_HEADER} must be an integer between 0 and ${config.maxLatencyMs}.`));
        return;
      }
      latencyMs = parsed;
    }

    let body;
    try {
      body = await readBody(req, config.maxBodyBytes);
    } catch {
      return; // The client went away mid-upload; nothing to answer.
    }
    if (body.kind === 'too_large') {
      reply(binding.tooLarge());
      return;
    }

    const prepared = await binding.prepare(ctx, body.data);
    if ('status' in prepared) {
      reply(prepared);
      return;
    }
    const scenario = controller.next(scenarioHeader);
    ctx.setScenario(scenario);
    const outcome = await respondForScenario(ctx, scenario, latencyMs, prepared.responders, prepared.render);
    if (outcome !== 'destroyed') reply(outcome);
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://simulator.local');
    const done = () => {
      if (res.headersSent || res.destroyed) {
        res.destroy();
        return;
      }
      sendReply(res, plain(500, 'Simulator internal error.'));
    };

    if (url.pathname === '/health' && req.method === 'GET') {
      sendReply(res, { status: 200, body: { status: 'ok', simulated: true } });
      return;
    }
    if (url.pathname.startsWith('/__sim/')) {
      handleControl(req, res, url.pathname).catch(done);
      return;
    }
    const binding = resolveBinding(req.method ?? 'GET', url.pathname);
    if (binding === 'method') {
      req.resume();
      sendReply(res, plain(405, 'Method not allowed.'), { allow: 'POST' });
      return;
    }
    if (!binding) {
      req.resume();
      sendReply(res, plain(404, 'Unknown route.'));
      return;
    }
    handleFacade(req, res, url, binding).catch(done);
  });
  return { server, controller };
}
