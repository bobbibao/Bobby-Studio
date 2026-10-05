import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VersionView } from '../hooks/useRealtimeGeneration';
import type { JobEntry } from '../scheduler/types';
import { completedSnapshot } from '../scheduler/testing';
import { installDomStubs } from '../test/dom';
import { renderStudio } from '../test/render';
import { ResultPanel, type ResultPanelProps } from './ResultPanel';
import { VersionStrip } from './VersionStrip';

function entry(overrides: Partial<JobEntry> = {}): JobEntry {
  return {
    jobId: 'job-1',
    revision: 1,
    intent: 'preview',
    status: 'COMPLETED',
    stage: null,
    stateVersion: 5,
    cancellationRequested: false,
    error: null,
    isSimulated: true,
    hasResult: true,
    saved: false,
    listed: true,
    listEvaluated: true,
    listedSeq: 1,
    forceListed: false,
    retryOfJobId: null,
    prompt: 'A timber house',
    inputPreviewUrl: null,
    order: 1,
    lastSignalAt: 0,
    ...overrides,
  };
}

function version(overrides: Partial<JobEntry> = {}, snapshotPatch: Parameters<typeof completedSnapshot>[1] = {}): VersionView {
  const job = entry(overrides);
  const snapshot = completedSnapshot(job.jobId, snapshotPatch);
  return { job, snapshot, asset: snapshot.result?.assets[0] ?? null };
}

function setup(overrides: Partial<ResultPanelProps> = {}) {
  const props: ResultPanelProps = {
    displayed: version(),
    activeJob: null,
    latestFailure: null,
    freshness: 'current',
    updating: false,
    saving: null,
    onSave: vi.fn(),
    onRetry: vi.fn(),
    onRegenerate: vi.fn(),
    onRefresh: vi.fn(),
    onDownload: vi.fn(async () => undefined),
    ...overrides,
  };
  renderStudio(<ResultPanel {...props} />);
  return props;
}

beforeEach(() => installDomStubs());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResultPanel states', () => {
  it('keeps the last successful image visible and marks it as updating', () => {
    setup({ updating: true, freshness: 'stale' });
    const image = screen.getByRole('img', { name: /Generated image for: A timber house/ });
    expect(image.getAttribute('src')).toBe('https://assets.test/job-1.png');
    expect(screen.getByText('Updating…')).toBeTruthy();
    expect(screen.queryByText('Input changed since this version')).toBeNull();
  });

  it('shows an explicit expiry with a regenerate action instead of a broken image', () => {
    const props = setup({ displayed: version({}, { expiresAt: '2020-01-01T00:00:00.000Z' }) });
    expect(screen.getByText('Expired — regenerate')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Generated image/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(props.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('does not treat a saved asset as expired', () => {
    const saved = version({ saved: true }, { expiresAt: '2020-01-01T00:00:00.000Z' });
    if (saved.asset) {
      saved.asset.saved = true;
    }
    setup({ displayed: saved });
    expect(screen.queryByText('Expired — regenerate')).toBeNull();
    const button = screen.getByRole('button', { name: 'Saved' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('refreshes the signed URL after the first image error and reports expiry after the second', () => {
    const props = setup();
    const image = screen.getByRole('img', { name: /Generated image/ });
    fireEvent.error(image);
    expect(props.onRefresh).toHaveBeenCalledWith('job-1');
    fireEvent.error(screen.getByRole('img', { name: /Generated image/ }));
    expect(screen.getByText('Expired — regenerate')).toBeTruthy();
  });

  it('distinguishes a cancelled generation from a failed one, both with text and an action', () => {
    const cancelled = entry({ jobId: 'job-2', status: 'CANCELLED', hasResult: false, error: { code: 'CANCELLED', message: 'x' }, order: 2 });
    const props = setup({ latestFailure: cancelled });
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.getByText(/previous result is still shown/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledWith('job-2');
    cleanup();

    const failed = entry({ jobId: 'job-3', status: 'FAILED', hasResult: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'upstream 503 at 10.0.0.4' }, order: 3 });
    setup({ latestFailure: failed });
    expect(screen.getByText('Generation failed')).toBeTruthy();
    expect(screen.queryByText(/10\.0\.0\.4/)).toBeNull(); // raw provider detail is never shown
    expect(screen.queryByText('Cancelled')).toBeNull();
  });

  it('separates an unsaved preview from a saved library asset and saves once', () => {
    const props = setup();
    expect(screen.getByText('Not saved')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save version' }));
    expect(props.onSave).toHaveBeenCalledWith('job-1');
  });

  it('downloads the selected version through the provided fetcher', async () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await vi.waitFor(() => expect(props.onDownload).toHaveBeenCalledTimes(1));
    expect(vi.mocked(props.onDownload).mock.calls[0][0].job.jobId).toBe('job-1');
  });

  it('shows the stage text, not a percentage, while a job runs without a previous image', () => {
    setup({ displayed: null, activeJob: entry({ status: 'PROCESSING', stage: 'provider', hasResult: false, listed: false }) });
    expect(screen.getByText('Generating the image…')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);
  });
});

describe('VersionStrip', () => {
  it('lists previews and finals separately and selects a version', () => {
    const onSelect = vi.fn();
    const versions = [
      version({ jobId: 'p1', order: 1, intent: 'preview' }),
      version({ jobId: 'f1', order: 2, intent: 'final' }),
      version({ jobId: 'p2', order: 3, intent: 'preview' }),
    ];
    renderStudio(<VersionStrip versions={versions} selectedJobId="f1" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Preview 1, Not saved',
      'Final 1, Not saved',
      'Preview 2, Not saved',
    ]);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith('p1');
  });
});
