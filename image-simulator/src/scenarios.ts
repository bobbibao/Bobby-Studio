export const SCENARIOS = [
  'success',
  'auth',
  'permission',
  'validation',
  'rate_limit',
  'quota',
  'unavailable',
  'timeout',
  'malformed',
  'malformed_base64',
  'truncated_image',
  'reset',
  'no_image',
  'safety',
] as const;
export type Scenario = (typeof SCENARIOS)[number];

export function isScenario(value: unknown): value is Scenario {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value);
}

/** Validates `x-bobby-simulator-scenario: <name>[:<n>]` and returns the scenario name, or null when malformed. */
export function parseScenarioHeader(raw: string): Scenario | null {
  const [name, count, ...rest] = raw.trim().split(':');
  if (rest.length > 0 || !isScenario(name)) return null;
  if (count !== undefined && !/^[1-9]\d{0,5}$/.test(count)) return null;
  return name;
}

interface ActiveScenario {
  scenario: Scenario;
  /** Remaining faulted requests; null means until reset. */
  remaining: number | null;
  then: Scenario;
}

export interface ScenarioStatus {
  scenario: Scenario;
  remaining: number | null;
  then: Scenario;
}

/**
 * In-memory, deterministic scenario control. A global scenario applies to every request that does not
 * carry a per-request override header. A header of the form `name:n` faults the first n requests that
 * carry the same header value (counted per header value) and answers `success` afterwards.
 */
export class ScenarioController {
  private active: ActiveScenario = { scenario: 'success', remaining: null, then: 'success' };
  private readonly headerCounters = new Map<string, number>();

  set(scenario: Scenario, times: number | null, then: Scenario): void {
    this.active = { scenario, remaining: times, then };
  }

  reset(): void {
    this.active = { scenario: 'success', remaining: null, then: 'success' };
    this.headerCounters.clear();
  }

  status(): ScenarioStatus {
    return { ...this.active };
  }

  /** Resolves the scenario for one request and consumes counters. */
  next(headerValue: string | undefined): Scenario {
    if (headerValue !== undefined) {
      const name = parseScenarioHeader(headerValue);
      if (!name) return 'success';
      const limit = headerValue.includes(':') ? Number(headerValue.split(':')[1]) : null;
      if (limit === null) return name;
      const seen = this.headerCounters.get(headerValue) ?? 0;
      this.headerCounters.set(headerValue, seen + 1);
      return seen < limit ? name : 'success';
    }
    const { scenario, remaining, then } = this.active;
    if (remaining === null) return scenario;
    if (remaining <= 0) return then;
    this.active = { scenario, remaining: remaining - 1, then };
    return scenario;
  }
}
