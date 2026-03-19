/**
 * PluresStore — Svelte-compatible writable store backed by PluresDB.
 */

import { writable, type Writable } from 'svelte/store';
import { getRoot } from './context.js';
import type { Unsubscribe } from './types.js';

export class PluresStore<T = any> {
  private store: Writable<T>;
  private unsub: Unsubscribe | null = null;
  private isUpdatingFromDb = false;

  constructor(path: string, initialValue?: T) {
    this.store = writable<T>(initialValue as T);
    const ref = getRoot().get(path);

    // Subscribe to DB updates
    this.unsub = ref.on((data: any) => {
      if (data == null) return;
      this.isUpdatingFromDb = true;
      this.store.set(data as T);
      this.isUpdatingFromDb = false;
    });

    // Expose put for writes
    (this as any)._ref = ref;
  }

  subscribe(run: (value: T) => void) {
    return this.store.subscribe(run);
  }

  set(value: T) {
    this.store.set(value);
    if (!this.isUpdatingFromDb) {
      (this as any)._ref.put(value);
    }
  }

  update(updater: (current: T) => T) {
    this.store.update((cur) => {
      const next = updater(cur);
      if (!this.isUpdatingFromDb) {
        (this as any)._ref.put(next);
      }
      return next;
    });
  }

  destroy() {
    this.unsub?.();
    this.unsub = null;
  }
}

export function createPluresStore<T = any>(path: string, initialValue?: T): PluresStore<T> {
  return new PluresStore(path, initialValue);
}
