import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSyncStatus, createTrackedSync } from '../src/sync-status';

describe('createSyncStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const status = createSyncStatus();
    expect(status.current.state).toBe('idle');
    expect(status.current.lastSyncAt).toBeNull();
    expect(status.current.isStale).toBe(false);
    expect(status.current.isSyncing).toBe(false);
    expect(status.current.error).toBeNull();
    expect(status.current.staleDuration).toBeNull();
    status.destroy();
  });

  it('transitions to syncing state', () => {
    const status = createSyncStatus();
    status.markSyncing();
    expect(status.current.state).toBe('syncing');
    expect(status.current.isSyncing).toBe(true);
    status.destroy();
  });

  it('transitions to synced state', () => {
    const status = createSyncStatus();
    status.markSyncing();
    status.markSynced();
    expect(status.current.state).toBe('synced');
    expect(status.current.lastSyncAt).not.toBeNull();
    expect(status.current.isSyncing).toBe(false);
    expect(status.current.isStale).toBe(false);
    status.destroy();
  });

  it('transitions to error state', () => {
    const status = createSyncStatus();
    const err = new Error('Network failure');
    status.markError(err);
    expect(status.current.state).toBe('error');
    expect(status.current.error).toBe(err);
    status.destroy();
  });

  it('resets to idle', () => {
    const status = createSyncStatus();
    status.markSynced();
    status.reset();
    expect(status.current.state).toBe('idle');
    expect(status.current.lastSyncAt).toBeNull();
    status.destroy();
  });

  it('detects stale data after threshold', () => {
    vi.useFakeTimers();
    const status = createSyncStatus({ staleAfterMs: 100, checkIntervalMs: 50 });
    status.markSynced();
    expect(status.current.state).toBe('synced');

    vi.advanceTimersByTime(150);
    expect(status.current.state).toBe('stale');
    expect(status.current.isStale).toBe(true);
    status.destroy();
  });

  it('does not mark stale while syncing', () => {
    vi.useFakeTimers();
    const status = createSyncStatus({ staleAfterMs: 100, checkIntervalMs: 50 });
    status.markSynced();
    status.markSyncing();

    vi.advanceTimersByTime(150);
    expect(status.current.state).toBe('syncing');
    status.destroy();
  });
  it('recovers from stale when new data arrives', () => {
    vi.useFakeTimers();
    const status = createSyncStatus({ staleAfterMs: 100, checkIntervalMs: 50 });
    status.markSynced();

    vi.advanceTimersByTime(150);
    expect(status.current.state).toBe('stale');

    status.markSynced();
    expect(status.current.state).toBe('synced');
    expect(status.current.isStale).toBe(false);
    status.destroy();
  });

  it('subscribe fires immediately with current snapshot', () => {
    const status = createSyncStatus();
    const snapshots: string[] = [];
    const unsub = status.subscribe((s) => { snapshots.push(s.state); });
    expect(snapshots).toEqual(['idle']);
    unsub();
    status.destroy();
  });

  it('subscribe fires on state changes', () => {
    const status = createSyncStatus();
    const states: string[] = [];
    const unsub = status.subscribe((s) => { states.push(s.state); });

    status.markSyncing();
    status.markSynced();

    expect(states).toEqual(['idle', 'syncing', 'synced']);
    unsub();
    status.destroy();
  });

  it('unsubscribe stops notifications', () => {
    const status = createSyncStatus();
    const states: string[] = [];
    const unsub = status.subscribe((s) => { states.push(s.state); });
    unsub();

    status.markSyncing();
    expect(states).toEqual(['idle']);
    status.destroy();
  });

  it('staleDuration reports time since last sync', () => {
    vi.useFakeTimers();
    const status = createSyncStatus({ staleAfterMs: 1000, checkIntervalMs: 500 });
    status.markSynced();

    vi.advanceTimersByTime(200);
    const snapshot = status.current;
    expect(snapshot.staleDuration).toBeGreaterThanOrEqual(200);
    status.destroy();
  });
});

describe('createTrackedSync', () => {
  it('auto-marks synced when callback succeeds', () => {
    const { status, wrapCallback } = createTrackedSync();
    expect(status.current.state).toBe('syncing');

    const cb = wrapCallback((_data: unknown) => { /* handle data */ });
    cb({ value: 42 });

    expect(status.current.state).toBe('synced');
    status.destroy();
  });

  it('auto-marks error when callback throws', () => {
    const { status, wrapCallback } = createTrackedSync();

    const cb = wrapCallback(() => { throw new Error('parse failed'); });
    cb();

    expect(status.current.state).toBe('error');
    expect(status.current.error?.message).toBe('parse failed');
    status.destroy();
  });
});
