/**
 * unum - DbContext
 *
 * Centralized DbAdapter instance management.
 *
 * This module replaces the old `GunContext.js` which dynamically injected a
 * `<script src="https://cdn.jsdelivr.net/npm/gun/gun.js">` tag.  All CDN
 * loading, `window.GunDB`, and `window.Gun` detection have been removed.
 *
 * Consumers are responsible for constructing their own database instance and
 * wrapping it in the appropriate adapter before calling `initializePlures`:
 *
 * ```ts
 * // With PluresDB (recommended):
 * import { PluresDB } from 'pluresdb';
 * import { PluresDbAdapter } from '@plures/unum/adapters/pluresdb';
 * import { initializePlures } from '@plures/unum';
 *
 * initializePlures(new PluresDbAdapter(new PluresDB()));
 *
 * // With Gun.js (backward compatibility):
 * import Gun from 'gun';
 * import { GunAdapter } from '@plures/unum/adapters/gun';
 *
 * initializePlures(new GunAdapter(Gun({ peers: ['http://localhost:8765/gun'] })));
 * ```
 */
import { writable } from 'svelte/store';
import type { DbAdapter } from './types.js';

/**
 * Internal writable store that holds the active `DbAdapter`.
 * `null` means the adapter has not been initialized yet.
 */
const adapterStore = writable<DbAdapter | null>(null);

/**
 * Initialize the global DbAdapter used by `pluresData` and related helpers.
 *
 * @param adapter — Any object implementing the `DbAdapter` interface.
 * @returns A cleanup function that clears the adapter when called.
 */
export function initializePlures(adapter: DbAdapter): () => void {
  adapterStore.set(adapter);
  return () => {
    adapterStore.set(null);
  };
}

/**
 * The active DbAdapter store.
 * Subscribe to this to react to adapter initialization / teardown.
 */
export const db: typeof adapterStore = adapterStore;

/** Alias for `db` — preferred name for the adapter store. */
export const plures: typeof adapterStore = adapterStore;

// ---------------------------------------------------------------------------
// Legacy exports (backward compatibility with GunContext.js consumers)
// ---------------------------------------------------------------------------

/** @deprecated Use `db` or `plures` instead. */
export const gun: typeof adapterStore = adapterStore;

/** @deprecated Use `initializePlures` instead. */
export const initializeGun = initializePlures;
