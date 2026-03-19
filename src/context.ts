/**
 * Database context — singleton adapter management.
 * Replaces GunContext.js (no CDN, no global detection).
 */

import { writable, type Readable } from 'svelte/store';
import type { DbAdapter, ChainNode } from './types.js';

let _adapter: DbAdapter | null = null;
const adapterStore = writable<DbAdapter | null>(null);

/**
 * Initialize unum with a database adapter.
 * Call once at app startup.
 *
 * @example
 * ```ts
 * import { initDb, createPluresDbAdapter } from '@plures/unum';
 * import PluresDB from 'pluresdb';
 *
 * const db = new PluresDB({ localStorage: true });
 * initDb(createPluresDbAdapter(db));
 * ```
 */
export function initDb(adapter: DbAdapter): void {
  _adapter = adapter;
  adapterStore.set(adapter);
}

/** Get the current adapter (throws if not initialized) */
export function getAdapter(): DbAdapter {
  if (!_adapter) throw new Error('unum: call initDb() before using data bindings');
  return _adapter;
}

/** Get a root ChainNode from the current adapter */
export function getRoot(): ChainNode {
  return getAdapter().root();
}

/** Svelte store for the adapter — subscribe for lazy init patterns */
export const db: Readable<DbAdapter | null> = adapterStore;

/** Tear down the adapter */
export function destroyDb(): void {
  _adapter?.destroy?.();
  _adapter = null;
  adapterStore.set(null);
}
