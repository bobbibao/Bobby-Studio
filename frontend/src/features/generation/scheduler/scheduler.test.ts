import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHistory, commitStroke, createHistory, toSnapshot } from '../canvas/strokes';
import { pollDelayMs } from './backoff';
import { selectDisplayed, selectVersions } from './selectors';
import {
  baseInput,
  completedSnapshot,
  createHarness,
  deferred,
  hintFor,
  makeSnapshot,
  sketchWithInk,
  TestApiError,
} from './testing';
import type { GenerationAccepted } from '../contracts';

const flush = () => vi.advanceTimersByTimeAsync(0);
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('revision identity and debounce', () => {
  it('bumps the revision immediately on every committed change and ignores unchanged values', () => {
    const h = createHarness();
    expect(h.scheduler.getState().revision).toBe(0);
    h.scheduler.updateInput({ prompt: 'a' });
    expect(h.scheduler.getState().revision).toBe(1);
    h.scheduler.updateInput({ prompt: 'a' });
    expect(h.scheduler.getState().revision).toBe(1);
    h.scheduler.updateInput({ quality: 'standard' });
    h.scheduler.updateInput({ size: { width: 1536, height: 1024 } });
    h.scheduler.updateInput({ mode: 'sketch' });
    expect(h.scheduler.getState().revision).toBe(4);
    h.scheduler.updateInput({ size: { width: 1536, height: 1024 } });
    expect(h.scheduler.getState().revision).toBe(4);
    h.scheduler.dispose();
  });

  it('coalesces a burst into one request carrying the latest revision, after the 700 ms debounce', async () => {
    const h = createHarness({ initialAuto: true });
    for (const prompt of ['a', 'ab', 'abc', 'abcd']) {
      h.scheduler.updateInput({ prompt });
      await advance(300);
    }
    expect(h.api.createGeneration).not.toHaveBeenCalled();
    await advance(700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    const body = h.server.created[0].body;
    expect(body.prompt).toBe('abcd');
    expect(body.clientRevision).toBe(4);
    expect(body.intent).toBe('preview');
    h.scheduler.dispose();
  });

  it('drops a late sketch upload that completes after the sketch changed, and never submits it', async () => {
    const h = createHarness({ initialAuto: true }, baseInput({ mode: 'sketch', sketch: sketchWithInk() }));
    const upload = deferred<{ inputAssetId: string }>();
    h.prepareSketch.mockImplementationOnce(() => upload.promise);
    h.scheduler.updateInput({ prompt: 'a modern house' });
    await advance(700);
    expect(h.prepareSketch).toHaveBeenCalledTimes(1);

    // The user clears the canvas while the old upload is still running.
    h.scheduler.updateInput({ sketch: toSnapshot(clearHistory(createHistory(sketchWithInk().strokes, 1))) });
    upload.resolve({ inputAssetId: 'asset-old' });
    await flush();
    expect(h.api.createGeneration).not.toHaveBeenCalled();

    await advance(700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    const body = h.server.created[0].body;
    expect(body.inputAssetId).toBeUndefined();
    expect(body.mode).toBe('text_to_image'); // blank sketch is prompt-only, never an uploaded blank canvas
    h.scheduler.dispose();
  });

  it('shows only results whose revision is still the desired one and keeps the last good image', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'one' });
    await advance(700);
    const first = h.server.complete('job-1');
    h.scheduler.handleHint(hintFor(first));
    await flush();
    expect(selectDisplayed(h.scheduler.getState())?.jobId).toBe('job-1');

    h.scheduler.updateInput({ prompt: 'two' });
    await advance(700); // submits revision 2
    h.scheduler.updateInput({ prompt: 'three' }); // revision 3 is desired before revision 2 completes
    const second = h.server.complete('job-2');
    h.scheduler.handleHint(hintFor(second));
    await flush();

    const state = h.scheduler.getState();
    expect(state.jobs.find((job) => job.jobId === 'job-2')?.status).toBe('COMPLETED');
    expect(selectVersions(state).map((job) => job.jobId)).toEqual(['job-1']);
    expect(selectDisplayed(state)?.jobId).toBe('job-1');
    h.scheduler.dispose();
  });
});

describe('IME composition and drawing gates', () => {
  it('does not commit a prompt during composition and commits the final text on compositionend', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.compositionStart();
    h.scheduler.updateInput({ prompt: 'に' });
    h.scheduler.updateInput({ prompt: 'にほ' });
    expect(h.scheduler.getState().revision).toBe(0);
    await advance(3000);
    expect(h.api.createGeneration).not.toHaveBeenCalled();
    h.scheduler.compositionEnd('日本');
    expect(h.scheduler.getState().revision).toBe(1);
    await advance(700);
    expect(h.server.created[0].body.prompt).toBe('日本');
    h.scheduler.dispose();
  });

  it('waits for the stroke commit when drawing is active at timer expiry', async () => {
    const h = createHarness({ initialAuto: true }, baseInput({ mode: 'sketch' }));
    h.scheduler.updateInput({ prompt: 'a pavilion' });
    h.scheduler.setDrawing(true);
    await advance(2000);
    expect(h.api.createGeneration).not.toHaveBeenCalled();
    expect(h.prepareSketch).not.toHaveBeenCalled();

    const history = commitStroke(createHistory(), { tool: 'brush', size: 8, points: [0.1, 0.1, 0.4, 0.4] });
    h.scheduler.updateInput({ sketch: toSnapshot(history) });
    h.scheduler.setDrawing(false);
    await advance(700);
    expect(h.prepareSketch).toHaveBeenCalledTimes(1);
    expect(h.server.created).toHaveLength(1);
    expect(h.server.created[0].body.mode).toBe('sketch_to_image');
    expect(h.server.created[0].body.inputAssetId).toBe('asset-sketch');
    h.scheduler.dispose();
  });
});

describe('one in flight plus the latest unsent snapshot', () => {
  it('keeps a single POST in flight and submits only the latest pending revision after the acknowledgement', async () => {
    const h = createHarness({ initialAuto: true });
    const first = deferred<GenerationAccepted>();
    h.api.createGeneration.mockImplementationOnce((body, key) => {
      h.server.created.push({ body, key });
      return first.promise;
    });
    h.scheduler.updateInput({ prompt: 'v1' });
    await advance(700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);

    h.scheduler.updateInput({ prompt: 'v2' });
    await advance(700);
    h.scheduler.updateInput({ prompt: 'v3' });
    await advance(700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    expect(h.scheduler.getState().waiting).toBe(true);

    first.resolve({
      id: 'job-x',
      requestId: 'r',
      studioSessionId: 'session-1',
      clientRevision: 1,
      intent: 'preview',
      status: 'PENDING',
      stateVersion: 1,
      isSimulated: true,
      pollAfterMs: 2000,
    });
    await flush();
    expect(h.api.createGeneration).toHaveBeenCalledTimes(2);
    expect(h.server.created[1].body.prompt).toBe('v3');
    expect(h.server.created[1].body.clientRevision).toBe(3);
    h.scheduler.dispose();
  });
});

describe('auto off / on and manual Generate', () => {
  it('makes no request while auto is off; manual Generate submits the current input as a final', async () => {
    const h = createHarness();
    h.scheduler.updateInput({ prompt: 'manual only' });
    await advance(5000);
    expect(h.api.createGeneration).not.toHaveBeenCalled();
    h.scheduler.generate();
    await flush();
    expect(h.server.created).toHaveLength(1);
    expect(h.server.created[0].body.intent).toBe('final');
    expect(h.server.created[0].body.prompt).toBe('manual only');
    h.scheduler.dispose();
  });

  it('turning auto off clears pending work and cancels submitted previews but never a final', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'preview me' });
    await advance(700);
    expect(h.server.created).toHaveLength(1); // job-1 preview, nonterminal
    h.scheduler.updateInput({ prompt: 'preview me again' }); // timer armed
    h.scheduler.setAuto(false);
    await flush();
    expect(h.api.cancelGeneration).toHaveBeenCalledWith('job-1');
    await advance(5000);
    expect(h.server.created).toHaveLength(1); // the armed timer was cleared

    h.scheduler.generate(); // explicit final
    await flush();
    const finalId = h.server.created[1] ? 'job-2' : '';
    expect(finalId).toBe('job-2');
    h.api.cancelGeneration.mockClear();
    h.scheduler.setAuto(true);
    h.scheduler.setAuto(false);
    await flush();
    expect(h.api.cancelGeneration).not.toHaveBeenCalledWith('job-2');
    h.scheduler.dispose();
  });

  it('turning auto on schedules at most one valid snapshot and avoids a duplicate for a current one', async () => {
    const h = createHarness({}, baseInput({ prompt: 'ready to go' }));
    h.scheduler.setAuto(true);
    h.scheduler.setAuto(true);
    await advance(700);
    expect(h.server.created).toHaveLength(1);
    // The snapshot is now current/in flight: toggling auto does not submit it again.
    h.scheduler.setAuto(false);
    await flush();
    h.api.createGeneration.mockClear();
    h.scheduler.setAuto(true);
    await advance(2000);
    // The preview was cancelled by turning auto off, so exactly one fresh valid snapshot is scheduled.
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    h.scheduler.setAuto(true);
    await advance(2000);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    h.scheduler.dispose();
  });

  it('manual Generate during auto supersedes the pending timer, pauses previews while the final runs and resumes only for changed input', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'design one' });
    h.scheduler.generate();
    await flush();
    expect(h.server.created.map((entry) => entry.body.intent)).toEqual(['final']);
    await advance(2000);
    expect(h.server.created).toHaveLength(1); // the debounce timer was superseded

    h.scheduler.updateInput({ prompt: 'design two' });
    await advance(2000);
    expect(h.server.created).toHaveLength(1); // auto is paused while the final runs

    const done = h.server.complete('job-1');
    h.scheduler.handleHint(hintFor(done));
    await flush();
    await advance(700);
    expect(h.server.created.map((entry) => entry.body.intent)).toEqual(['final', 'preview']);
    expect(h.server.created[1].body.prompt).toBe('design two');

    // A final that completes with unchanged input does not trigger another preview.
    const h2 = createHarness({ initialAuto: true });
    h2.scheduler.updateInput({ prompt: 'same' });
    h2.scheduler.generate();
    await flush();
    h2.scheduler.handleHint(hintFor(h2.server.complete('job-1')));
    await advance(3000);
    expect(h2.server.created).toHaveLength(1);
    h.scheduler.dispose();
    h2.scheduler.dispose();
  });
});

describe('Stop and cancellation', () => {
  it('Stop calls the cancel API for running jobs and keeps the last successful image', async () => {
    const h = createHarness();
    h.scheduler.updateInput({ prompt: 'first' });
    h.scheduler.generate();
    await flush();
    h.scheduler.handleHint(hintFor(h.server.complete('job-1')));
    await flush();
    h.scheduler.updateInput({ prompt: 'second' });
    h.scheduler.generate();
    await flush();
    expect(h.server.created).toHaveLength(2);

    h.scheduler.stop();
    await flush();
    expect(h.api.cancelGeneration).toHaveBeenCalledWith('job-2');
    const state = h.scheduler.getState();
    expect(state.jobs.find((job) => job.jobId === 'job-2')?.status).toBe('CANCELLED');
    expect(selectDisplayed(state)?.jobId).toBe('job-1');
    h.scheduler.dispose();
  });

  it('Stop during a POST does not abort it; the accepted job is cancelled through the API', async () => {
    const h = createHarness();
    const pending = deferred<GenerationAccepted>();
    h.api.createGeneration.mockImplementationOnce((body, key) => {
      h.server.created.push({ body, key });
      return pending.promise;
    });
    h.scheduler.generate();
    await flush();
    h.scheduler.stop();
    await flush();
    expect(h.api.cancelGeneration).not.toHaveBeenCalled();
    const accepted = h.server.accept(h.server.created[0].body, 'key-1');
    pending.resolve(accepted);
    await flush();
    expect(h.api.cancelGeneration).toHaveBeenCalledWith(accepted.id);
    h.scheduler.dispose();
  });
});

describe('idempotency', () => {
  it('replays a lost POST with the same key and uses a new key for a new intent', async () => {
    const h = createHarness();
    h.api.createGeneration
      .mockImplementationOnce(async () => {
        throw new TestApiError({ kind: 'network' });
      })
      .mockImplementationOnce(async () => {
        throw new TestApiError({ kind: 'network' });
      });
    h.scheduler.updateInput({ prompt: 'recover me' });
    h.scheduler.generate();
    await flush();
    await advance(1000);
    await advance(2000);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(3);
    const keys = h.api.createGeneration.mock.calls.map((call) => call[1]);
    expect(new Set(keys).size).toBe(1);
    expect(h.server.created).toHaveLength(1);

    h.scheduler.handleHint(hintFor(h.server.complete('job-1')));
    await flush();
    h.scheduler.updateInput({ prompt: 'a different intent' });
    h.scheduler.generate();
    await flush();
    const lastKey = h.api.createGeneration.mock.calls[3][1];
    expect(lastKey).not.toBe(keys[0]);
    h.scheduler.dispose();
  });

  it('reuses the key of an unresolved POST for the identical request and recovers it on return', async () => {
    const h = createHarness({ maxReplays: 0 });
    h.api.createGeneration.mockImplementationOnce(async () => {
      throw new TestApiError({ kind: 'network' });
    });
    h.scheduler.generate();
    await flush();
    expect(h.scheduler.getState().problem?.kind).toBe('network');
    h.scheduler.setOnline(false);
    h.scheduler.setOnline(true);
    await flush();
    const keys = h.api.createGeneration.mock.calls.map((call) => call[1]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(h.scheduler.getState().problem).toBeNull();
    expect(h.scheduler.getState().jobs).toHaveLength(1);
    h.scheduler.dispose();
  });
});

describe('visibility, offline and unmount', () => {
  it('hidden tabs make no automatic submission, keep the draft, and reconcile before scheduling on return', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'running' });
    await advance(700);
    expect(h.server.created).toHaveLength(1);

    h.scheduler.setVisible(false);
    h.scheduler.updateInput({ prompt: 'edited while hidden' });
    await advance(5000);
    expect(h.server.created).toHaveLength(1);
    expect(h.scheduler.getState().revision).toBe(2);

    h.api.getGeneration.mockClear();
    h.scheduler.setVisible(true);
    await flush();
    expect(h.api.getGeneration).toHaveBeenCalledWith('job-1'); // reconciled first
    expect(h.server.created).toHaveLength(1);
    await advance(700);
    expect(h.server.created).toHaveLength(2);
    expect(h.server.created[1].body.prompt).toBe('edited while hidden');
    h.scheduler.dispose();
  });

  it('offline stops new automatic submissions and polling', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'x' });
    await advance(700);
    h.scheduler.setConnection('offline');
    h.scheduler.setOnline(false);
    h.api.getGeneration.mockClear();
    h.scheduler.updateInput({ prompt: 'y' });
    await advance(30000);
    expect(h.server.created).toHaveLength(1);
    expect(h.api.getGeneration).not.toHaveBeenCalled();
    h.scheduler.dispose();
  });

  it('dispose clears every timer and ignores late completions', async () => {
    const h = createHarness({ initialAuto: true });
    const upload = deferred<{ inputAssetId: string }>();
    h.prepareSketch.mockImplementationOnce(() => upload.promise);
    h.scheduler.updateInput({ mode: 'sketch', sketch: sketchWithInk(), prompt: 'tower' });
    await advance(700);
    h.scheduler.updateInput({ prompt: 'tower 2' }); // re-arms a debounce timer
    h.scheduler.dispose();
    expect(vi.getTimerCount()).toBe(0);
    upload.resolve({ inputAssetId: 'asset' });
    await advance(5000);
    expect(h.api.createGeneration).not.toHaveBeenCalled();
  });
});

describe('stateVersion gating, hints and reconcile', () => {
  it('drops hints that are not newer than the held stateVersion and coalesces fetches', async () => {
    const h = createHarness();
    h.scheduler.generate();
    await flush();
    const entryVersion = h.scheduler.getState().jobs[0].stateVersion;
    h.api.getGeneration.mockClear();

    h.scheduler.handleHint({ ...hintFor(makeSnapshot({ id: 'job-1' })), stateVersion: entryVersion });
    h.scheduler.handleHint({ ...hintFor(makeSnapshot({ id: 'job-1' })), stateVersion: entryVersion - 1 });
    await flush();
    expect(h.api.getGeneration).not.toHaveBeenCalled();

    const next = h.server.advance('job-1', { status: 'PROCESSING', stage: 'provider' });
    h.scheduler.handleHint(hintFor(next));
    await flush();
    expect(h.api.getGeneration).toHaveBeenCalledTimes(1);
    expect(h.scheduler.getState().jobs[0].status).toBe('PROCESSING');
    h.scheduler.dispose();
  });

  it('never applies a stale snapshot over a newer one and never regresses a terminal state', async () => {
    const h = createHarness();
    h.scheduler.generate();
    await flush();
    const done = h.server.complete('job-1');
    h.scheduler.handleHint(hintFor(done));
    await flush();
    expect(h.scheduler.getState().jobs[0].status).toBe('COMPLETED');

    h.api.getGeneration.mockResolvedValueOnce(makeSnapshot({ id: 'job-1', status: 'PROCESSING', stateVersion: 2 }));
    await h.scheduler.refreshJob('job-1');
    expect(h.scheduler.getState().jobs[0].status).toBe('COMPLETED');
    h.api.getGeneration.mockResolvedValueOnce(completedSnapshot('job-1', { status: 'FAILED', stateVersion: 9, result: null }));
    await h.scheduler.refreshJob('job-1');
    expect(h.scheduler.getState().jobs[0].status).toBe('COMPLETED');
    h.scheduler.dispose();
  });

  it('adopts an event that overtakes the 202 response, then reads the snapshot over REST', async () => {
    const h = createHarness();
    const release = deferred<void>();
    h.api.createGeneration.mockImplementationOnce(async (body, key) => {
      const accepted = h.server.accept(body, key);
      await release.promise; // the 202 is delayed on the wire
      return accepted;
    });
    h.scheduler.generate();
    await flush();
    const done = h.server.complete('job-1');
    h.scheduler.handleHint(hintFor(done));
    await flush();
    expect(h.scheduler.getState().jobs[0]?.status).toBe('COMPLETED');
    release.resolve();
    await flush();
    expect(h.scheduler.getState().jobs).toHaveLength(1);
    expect(h.scheduler.getState().jobs[0].status).toBe('COMPLETED');
    h.scheduler.dispose();
  });

  it('ignores hints for other sessions and reconciles active jobs on reconnect', async () => {
    const h = createHarness();
    h.scheduler.handleHint({ ...hintFor(makeSnapshot({ id: 'other', studioSessionId: 'other-session' })), stateVersion: 3 });
    await flush();
    expect(h.api.getGeneration).not.toHaveBeenCalled();

    h.scheduler.generate();
    await flush();
    h.scheduler.setConnection('reconnecting');
    h.server.advance('job-1', { status: 'PROCESSING', stage: 'provider' });
    h.api.getGeneration.mockClear();
    h.scheduler.setConnection('connected');
    await flush();
    expect(h.api.getGeneration).toHaveBeenCalledWith('job-1');
    expect(h.scheduler.getState().jobs[0].status).toBe('PROCESSING');
    h.scheduler.dispose();
  });
});

describe('connection loss is not a failed job', () => {
  it('keeps the job running, polls with backoff while the socket is down, and stops at terminal', async () => {
    const h = createHarness();
    h.scheduler.generate();
    await flush();
    h.scheduler.setConnection('reconnecting');
    h.api.getGeneration.mockClear();

    await advance(2000);
    expect(h.api.getGeneration).toHaveBeenCalledTimes(1);
    await advance(3200);
    expect(h.api.getGeneration).toHaveBeenCalledTimes(2);
    expect(h.scheduler.getState().jobs[0].status).toBe('PENDING');
    expect(h.scheduler.getState().problem).toBeNull();

    h.server.complete('job-1');
    await advance(5200);
    expect(h.scheduler.getState().jobs[0].status).toBe('COMPLETED');
    const calls = h.api.getGeneration.mock.calls.length;
    await advance(60000);
    expect(h.api.getGeneration.mock.calls.length).toBe(calls);
    expect(vi.getTimerCount()).toBe(0);
    h.scheduler.dispose();
  });

  it('uses a 2 s to 10 s backoff with jitter', () => {
    expect([0, 1, 2, 3, 4, 8].map((attempt) => pollDelayMs(attempt, () => 0))).toEqual([2000, 3200, 5120, 8192, 10000, 10000]);
    expect(pollDelayMs(0, () => 0.99)).toBeGreaterThan(2000);
    expect(pollDelayMs(9, () => 0.99)).toBeLessThanOrEqual(10000);
  });
});

describe('bounded tracking', () => {
  it('drops the oldest finished jobs beyond the cap', async () => {
    const h = createHarness();
    for (let i = 0; i < 90; i += 1) {
      h.scheduler.updateInput({ prompt: `prompt ${i}` });
      h.scheduler.generate();
      await flush();
      h.scheduler.handleHint(hintFor(h.server.complete(`job-${i + 1}`)));
      await flush();
    }
    const state = h.scheduler.getState();
    expect(state.jobs.length).toBeLessThanOrEqual(80);
    expect(state.jobs.some((job) => job.jobId === 'job-90')).toBe(true);
    expect(state.jobs.some((job) => job.jobId === 'job-1')).toBe(false);
    h.scheduler.dispose();
  });
});

describe('error policy', () => {
  it('shows rate limiting once, coalesces, and resubmits the latest input after Retry-After', async () => {
    const h = createHarness({ initialAuto: true });
    h.api.createGeneration.mockImplementationOnce(async () => {
      throw new TestApiError({ kind: 'rate_limited', retryAfterMs: 3000 });
    });
    h.scheduler.updateInput({ prompt: 'burst 1' });
    await advance(700);
    expect(h.scheduler.getState().problem?.kind).toBe('rate_limited');
    h.scheduler.updateInput({ prompt: 'burst 2' });
    await advance(700);
    h.scheduler.updateInput({ prompt: 'burst 3' });
    await advance(700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(1);
    await advance(1700);
    expect(h.api.createGeneration).toHaveBeenCalledTimes(2);
    expect(h.server.created[0].body.prompt).toBe('burst 3');
    expect(h.scheduler.getState().problem).toBeNull();
    h.scheduler.dispose();
  });

  it('pauses auto on provider auth failure and resumes when the user turns auto back on', async () => {
    const h = createHarness({ initialAuto: true });
    h.scheduler.updateInput({ prompt: 'x' });
    await advance(700);
    const failed = h.server.advance('job-1', { status: 'FAILED', error: { code: 'PROVIDER_AUTH', message: 'internal detail' } });
    h.scheduler.handleHint(hintFor(failed));
    await flush();
    expect(h.scheduler.getState().autoPause).toBe('provider_auth');
    h.scheduler.updateInput({ prompt: 'y' });
    await advance(3000);
    expect(h.server.created).toHaveLength(1);
    h.scheduler.setAuto(true);
    await advance(700);
    expect(h.server.created).toHaveLength(2);
    h.scheduler.dispose();
  });

  it('pauses auto and reports credits on INSUFFICIENT_CREDITS', async () => {
    const h = createHarness({ initialAuto: true });
    h.api.createGeneration.mockImplementationOnce(async () => {
      throw new TestApiError({ kind: 'insufficient_credits' });
    });
    h.scheduler.updateInput({ prompt: 'x' });
    await advance(700);
    const state = h.scheduler.getState();
    expect(state.problem?.kind).toBe('credits');
    expect(state.autoPause).toBe('credits');
    h.scheduler.dispose();
  });

  it('treats an older STALE_REVISION as housekeeping, not an error', async () => {
    const h = createHarness({ initialAuto: true });
    const first = deferred<GenerationAccepted>();
    h.api.createGeneration.mockImplementationOnce(() => first.promise);
    h.scheduler.updateInput({ prompt: 'a' });
    await advance(700);
    h.scheduler.updateInput({ prompt: 'b' });
    first.reject(new TestApiError({ kind: 'stale_revision' }));
    await flush();
    expect(h.scheduler.getState().problem).toBeNull();
    await advance(700);
    expect(h.server.created[0].body.prompt).toBe('b');
    h.scheduler.dispose();
  });

  it('renews the studio session once when the current revision is rejected as stale', async () => {
    const h = createHarness();
    h.api.createGeneration.mockImplementationOnce(async () => {
      throw new TestApiError({ kind: 'stale_revision' });
    });
    h.scheduler.updateInput({ prompt: 'duplicate tab' });
    h.scheduler.generate();
    await flush();
    await flush();
    expect(h.api.createStudioSession).toHaveBeenCalledTimes(1);
    expect(h.scheduler.getState().sessionId).toBe('session-2');
    expect(h.server.created[0].body.studioSessionId).toBe('session-2');
    expect(h.server.created[0].body.clientRevision).toBeGreaterThan(40);
    h.scheduler.dispose();
  });

  it('retries a failed job with a new key and treats the retry as an explicit run', async () => {
    const h = createHarness();
    h.scheduler.generate();
    await flush();
    h.scheduler.handleHint(hintFor(h.server.advance('job-1', { status: 'FAILED', error: { code: 'PROVIDER_UNAVAILABLE', message: 'x' } })));
    await flush();
    h.scheduler.retry('job-1');
    await flush();
    expect(h.api.retryGeneration).toHaveBeenCalledTimes(1);
    expect(h.api.retryGeneration.mock.calls[0][1]).not.toBe(h.api.createGeneration.mock.calls[0][1]);
    expect(h.scheduler.getState().jobs).toHaveLength(2);
    h.scheduler.dispose();
  });

  it('saves a completed version once and reflects the saved state', async () => {
    const h = createHarness();
    h.scheduler.generate();
    await flush();
    h.scheduler.handleHint(hintFor(h.server.complete('job-1')));
    await flush();
    expect(h.scheduler.getState().jobs[0].saved).toBe(false);
    await expect(h.scheduler.save('job-1')).resolves.toBe(true);
    expect(h.scheduler.getState().jobs[0].saved).toBe(true);
    expect(h.scheduler.getState().saving).toBeNull();
    h.scheduler.dispose();
  });
});
