/**
 * PluresStore — Svelte-compatible writable store backed by PluresDB.
 */

import { writable, type Writable } from 'svelte/store';
import { getRoot } from './context.js';
import type { ChainNode, Unsubscribe } from './types.js';

/**
 * A Svelte-compatible writable store that syncs a single value with PluresDB.
 *
 * Implements the Svelte store contract (`subscribe` / `set` / `update`) so it
 * can be used with the `$store` auto-subscription syntax in Svelte 4, or
 * manually subscribed to in Svelte 5.  All writes are persisted to PluresDB;
 * all incoming DB updates are reflected reactively.
 *
 * @typeParam T - Shape of the value stored at `path`.
 *
 * @example
 * ```ts
 * import { initDb, createMemoryAdapter, PluresStore } from '@plures/unum';
 *
 * initDb(createMemoryAdapter());
 *
 * const counter = new PluresStore<number>('counter', 0);
 *
 * // Svelte 4: use $counter in templates
 * // Svelte 5: subscribe manually or use createPluresStore()
 * counter.set(42);
 * counter.update(n => n + 1);
 * counter.destroy();
 * ```
 */
export class PluresStore<T = unknown> {
  private store: Writable<T>;
  private unsub: Unsubscribe | null = null;
  private isUpdatingFromDb = false;
  private readonly _ref: ChainNode;

  /**
   * @param path         - Path in PluresDB to bind to (e.g. `'settings/theme'`).
   * @param initialValue - Optional initial value used before the first DB read.
   */
  constructor(path: string, initialValue?: T) {
    this.store = writable<T>(initialValue as T);
    this._ref = getRoot().get(path);

    // Subscribe to DB updates
    this.unsub = this._ref.on((data: unknown) => {
      if (data == null) return;
      this.isUpdatingFromDb = true;
      this.store.set(data as T);
      this.isUpdatingFromDb = false;
    });
  }

  /** Subscribe to value changes — Svelte store protocol. */
  subscribe(run: (value: T) => void) {
    return this.store.subscribe(run);
  }

  /** Write a new value and persist it to PluresDB. */
  set(value: T) {
    this.store.set(value);
    if (!this.isUpdatingFromDb) {
      this._ref.put(value);
    }
  }

  /** Apply a pure function to the current value and persist the result. */
  update(updater: (current: T) => T) {
    this.store.update((cur) => {
      const next = updater(cur);
      if (!this.isUpdatingFromDb) {
        this._ref.put(next);
      }
      return next;
    });
  }

  /** Unsubscribe from PluresDB and release all resources. */
  destroy() {
    this.unsub?.();
    this.unsub = null;
  }
}

/**
 * Factory helper — creates a {@link PluresStore} for a given `path`.
 *
 * Prefer this over the constructor when you want to infer types without
 * explicitly calling `new`:
 *
 * ```ts
 * const theme = createPluresStore<'light' | 'dark'>('settings/theme', 'light');
 * ```
 *
 * @param path         - Path in PluresDB to bind to.
 * @param initialValue - Optional initial value used before the first DB read.
 */
export function createPluresStore<T = unknown>(path: string, initialValue?: T): PluresStore<T> {
  return new PluresStore(path, initialValue);
}
