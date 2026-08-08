/**
 * Sync status indicators and stale data detection for UI.
 *
 * Provides reactive sync state that tracks whether data is fresh, syncing,
 * stale, or in an error state. Designed for use with Svelte 5 runes or
 * Svelte 4 store protocol.
 */

import type { Unsubscribe } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Possible sync states for a data binding.
 *
 * - `idle`    — No active connection or subscription yet.
 * - `syncing` — Actively receiving or sending data.
 * - `synced`  — Data is fresh and up-to-date.
 * - `stale`   — No update received within the staleness threshold.
 * - `error`   — An error occurred during sync.
 */
export type SyncState = 'idle' | 'syncing' | 'synced' | 'stale' | 'error';

/**
 * Configuration options for sync status tracking.
 */
export interface SyncStatusOptions {
  /**
   * Time in milliseconds after the last update before data is considered stale.
   * @default 30000 (30 seconds)
   */
  staleAfterMs?: number;

  /**
   * Interval in milliseconds for checking staleness.
   * @default 5000 (5 seconds)
   */
  checkIntervalMs?: number;
}

/**
 * Snapshot of the current sync status, exposed reactively.
 */
export interface SyncStatusSnapshot {
  /** Current sync state */
  readonly state: SyncState;
  /** Timestamp of the last successful data update (ms since epoch), or null if never updated */
  readonly lastSyncAt: number | null;
  /** Whether the data is considered stale */
  readonly isStale: boolean;
  /** Whether data is actively syncing */
  readonly isSyncing: boolean;
  /** Last error encountered, or null */
  readonly error: Error | null;
  /** Time in ms since last successful sync, or null if never synced */
  readonly staleDuration: number | null;
}

/**
 * Reactive sync status reference.
 *
 * Implements the Svelte store protocol and exposes getter-based properties
 * for use with Svelte 5 `$derived`.
 */
export interface SyncStatusRef {
  /** Current sync status snapshot */
  readonly current: SyncStatusSnapshot;

  /** Mark the beginning of a sync operation */
  markSyncing(): void;
  /** Mark a successful sync (data received) */
  markSynced(): void;
  /** Mark a sync error */
  markError(error: Error): void;
  /** Reset to idle state */
  reset(): void;

  /** Subscribe to status changes — Svelte store protocol */
  subscribe(cb: (snapshot: SyncStatusSnapshot) => void): Unsubscribe;

  /** Release timers and subscriptions */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const DEFAULT_STALE_AFTER_MS = 30_000;
const DEFAULT_CHECK_INTERVAL_MS = 5_000;

/**
 * Create a reactive sync status tracker.
 *
 * Monitors data freshness using configurable staleness thresholds and exposes
 * the current state reactively for UI consumption.
 *
 * @param options - Configuration for staleness detection.
 * @returns A `SyncStatusRef` with reactive state and control methods.
 *
 * @example
 * ```ts
 * import { createSyncStatus } from '@plures/unum';
 *
 * const status = createSyncStatus({ staleAfterMs: 10_000 });
 *
 * // When data arrives:
 * status.markSynced();
 *
 * // In Svelte 5 template:
 * // $derived(status.current.state) → 'synced' | 'stale' | ...
 *
 * // Cleanup:
 * status.destroy();
 * ```
 */
export function createSyncStatus(options: SyncStatusOptions = {}): SyncStatusRef {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;

  let state: SyncState = 'idle';
  let lastSyncAt: number | null = null;
  let error: Error | null = null;
  let subscribers: Array<(snapshot: SyncStatusSnapshot) => void> = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function buildSnapshot(): SyncStatusSnapshot {
    const now = Date.now();
    const staleDuration = lastSyncAt !== null ? now - lastSyncAt : null;
    return {
      state,
      lastSyncAt,
      isStale: state === 'stale',
      isSyncing: state === 'syncing',
      error,
      staleDuration,
    };
  }

  function notify() {
    const snapshot = buildSnapshot();
    for (const cb of subscribers) {
      try { cb(snapshot); } catch (e) { console.error('[unum/sync-status]', e); }
    }
  }

  function checkStaleness() {
    if (state === 'error' || state === 'idle') return;
    if (lastSyncAt !== null && (Date.now() - lastSyncAt) >= staleAfterMs) {
      if (state !== 'stale') {
        state = 'stale';
        notify();
      }
    }
  }

  function startInterval() {
    if (intervalId !== null) return;
    intervalId = setInterval(checkStaleness, checkIntervalMs);
  }

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  const ref: SyncStatusRef = {
    get current() { return buildSnapshot(); },

    markSyncing() {
      state = 'syncing';
      error = null;
      startInterval();
      notify();
    },

    markSynced() {
      state = 'synced';
      lastSyncAt = Date.now();
      error = null;
      startInterval();
      notify();
    },

markError(err: Error) {
  state = 'error';
  error = err;
  stopInterval();
  notify();
},

    reset() {
      state = 'idle';
      lastSyncAt = null;
      error = null;
      stopInterval();
      notify();
    },

    subscribe(cb: (snapshot: SyncStatusSnapshot) => void): Unsubscribe {
      subscribers.push(cb);
      cb(buildSnapshot());
      return () => { subscribers = subscribers.filter(s => s !== cb); };
    },

    destroy() {
      stopInterval();
      subscribers = [];
    },
  };

  return ref;
}

/**
 * Create a sync status tracker that automatically integrates with a data
 * subscription callback. Wraps a `DataCallback`-style function to
 * automatically mark syncing/synced/error states.
 *
 * @param options - Configuration for staleness detection.
 * @returns An object with the `SyncStatusRef` and a `wrapCallback` helper.
 *
 * @example
 * ```ts
 * import { createTrackedSync } from '@plures/unum';
 *
 * const { status, wrapCallback } = createTrackedSync({ staleAfterMs: 5000 });
 *
 * // Use wrapCallback to automatically track sync state:
 * const wrappedCb = wrapCallback((data, key) => {
 *   // handle data update
 * });
 *
 * // status.current.state will be 'synced' after data arrives
 * ```
 */
export function createTrackedSync(options: SyncStatusOptions = {}): {
  status: SyncStatusRef;
  wrapCallback: <T extends (...args: unknown[]) => void>(cb: T) => T;
} {
  const status = createSyncStatus(options);
  status.markSyncing();

  function wrapCallback<T extends (...args: unknown[]) => void>(cb: T): T {
    return ((...args: unknown[]) => {
      try {
        cb(...args);
        status.markSynced();
      } catch (err) {
        status.markError(err instanceof Error ? err : new Error(String(err)));
      }
    }) as unknown as T;
  }

  return { status, wrapCallback };
}
