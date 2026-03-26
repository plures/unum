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
 * Call once at app startup before using any data bindings.
 *
 * @param adapter - The `DbAdapter` implementation to use (e.g. `createMemoryAdapter()`,
 *                  `createPluresDbAdapter(db)`, or `createHyperswarmAdapter(swarm, inner)`).
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

/**
 * Return the current `DbAdapter`.
 *
 * Throws an `Error` if `initDb()` has not been called yet.
 *
 * @returns The active `DbAdapter` instance.
 *
 * @example
 * ```ts
 * import { getAdapter } from '@plures/unum';
 *
 * const adapter = getAdapter();
 * const root = adapter.root();
 * ```
 */
export function getAdapter(): DbAdapter {
  if (!_adapter) throw new Error('unum: call initDb() before using data bindings');
  return _adapter;
}

/**
 * Return a root `ChainNode` from the current adapter.
 *
 * Shorthand for `getAdapter().root()`.  Throws if `initDb()` has not been called.
 *
 * @returns A `ChainNode` at the root of the database tree.
 *
 * @example
 * ```ts
 * import { getRoot } from '@plures/unum';
 *
 * const ref = getRoot().get('settings').get('theme');
 * ref.on((value) => console.log('theme changed', value));
 * ```
 */
export function getRoot(): ChainNode {
  return getAdapter().root();
}

/**
 * Svelte-compatible readable store containing the current `DbAdapter | null`.
 *
 * Useful for lazy-init patterns where you want to react to the adapter
 * becoming available rather than requiring it to be set up synchronously.
 *
 * @example
 * ```svelte
 * <script>
 *   import { db, initDb, createMemoryAdapter } from '@plures/unum';
 *
 *   // Ensure the adapter is initialized before subscribing
 *   initDb(createMemoryAdapter());
 * </script>
 *
 * {#if $db}
 *   <p>Database ready</p>
 * {/if}
 * ```
 */
export const db: Readable<DbAdapter | null> = adapterStore;

/**
 * Tear down the current adapter and reset the context.
 *
 * Calls the adapter's optional `destroy()` method, then sets the active
 * adapter to `null`.  Any subsequent calls to `getAdapter()` or `getRoot()`
 * will throw until `initDb()` is called again.
 *
 * @example
 * ```ts
 * import { initDb, destroyDb, createMemoryAdapter } from '@plures/unum';
 *
 * initDb(createMemoryAdapter());
 * // ... use the database ...
 * destroyDb(); // release all resources
 * ```
 */
export function destroyDb(): void {
  _adapter?.destroy?.();
  _adapter = null;
  adapterStore.set(null);
}
