/**
 * Gun.js adapter — wraps an existing Gun.js instance as a DbAdapter.
 *
 * Use this when migrating a Gun.js codebase to unum's adapter pattern
 * without switching databases.  Install Gun yourself (`npm install gun`)
 * and pass the instance here — no CDN loading.
 *
 * @example
 * ```ts
 * import Gun from 'gun';
 * import { initDb } from '@plures/unum';
 * import { createGunAdapter } from '@plures/unum/adapters/gun';
 *
 * const gun = Gun({ peers: ['http://localhost:8765/gun'] });
 * initDb(createGunAdapter(gun));
 * ```
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

/**
 * Minimal structural interface for Gun.js chain nodes.
 * Matches the subset of the Gun API that unum requires.
 */
export interface GunChainLike {
  get(key: string): GunChainLike;
  put(data: unknown, cb?: DataCallback): unknown;
  set?: (data: unknown, cb?: DataCallback) => unknown;
  on(cb: DataCallback): unknown;
  once(cb: DataCallback): void;
  map(): GunChainLike;
  off(): void;
}

/**
 * Wrap a Gun.js instance as a `DbAdapter`.
 *
 * Gun already exposes `get`, `put`, `on`, `once`, `off`, and `map` — the
 * same chain API modelled by `ChainNode` — so this is a lightweight typed
 * façade with no runtime overhead.
 *
 * @param gun - A Gun.js instance (from the `gun` npm package).
 * @returns A `DbAdapter` wrapping the given Gun instance.
 *
 * @example
 * ```ts
 * import Gun from 'gun';
 * import { initDb } from '@plures/unum';
 * import { createGunAdapter } from '@plures/unum/adapters';
 *
 * const gun = Gun({ peers: ['http://localhost:8765/gun'] });
 * initDb(createGunAdapter(gun));
 * ```
 */
export function createGunAdapter(gun: GunChainLike): DbAdapter {
  function wrapChain(chain: GunChainLike): ChainNode {
    return {
      get(key: string) {
        return wrapChain(chain.get(key));
      },
      put(data: unknown, cb?: DataCallback) {
        chain.put(data, cb);
        return this;
      },
      set(data: unknown, cb?: DataCallback) {
        chain.set ? chain.set(data, cb) : chain.get(Date.now().toString()).put(data, cb);
        return this;
      },
      on(cb: DataCallback): Unsubscribe {
        const ref = chain.on(cb);
        // Gun returns the chain node, not an unsubscribe function
        return typeof ref === 'function' ? (ref as Unsubscribe) : () => chain.off();
      },
      once(cb: DataCallback) {
        chain.once(cb);
      },
      map() {
        return wrapChain(chain.map());
      },
      off() {
        chain.off();
      },
    };
  }

  return {
    root() {
      return wrapChain(gun);
    },
  };
}
