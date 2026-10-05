/** Active-job polling: 2 s growing to 10 s, plus a little jitter so tabs do not synchronize. */
export const POLL_MIN_MS = 2000;
export const POLL_MAX_MS = 10000;
export const POLL_JITTER_MS = 500;
/** A connected socket that has been silent for this long about a nonterminal job is treated as "unsure". */
export const QUIET_SIGNAL_MS = 15000;

export function pollDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(POLL_MAX_MS, POLL_MIN_MS * Math.pow(1.6, Math.max(0, attempt)));
  return Math.round(Math.min(POLL_MAX_MS, base + random() * POLL_JITTER_MS));
}

/** Delay before replaying a lost POST with the same idempotency key. */
export function replayDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(8000, 1000 * Math.pow(2, Math.max(0, attempt)));
  return Math.round(base + random() * 250);
}
