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
 * Wrap a Gun.js instance as a DbAdapter.
 *
 * Gun already exposes `get`, `put`, `on`, `once`, `off`, and `map` — the
 * same chain API modelled by `ChainNode` — so this is a lightweight typed
 * façade with no runtime overhead.
 *
 * @param gun - A Gun.js instance (from the `gun` npm package).
 */
export function createGunAdapter(gun: any): DbAdapter {
  function wrapChain(chain: any): ChainNode {
    return {
      get(key: string) {
        return wrapChain(chain.get(key));
      },
      put(data: any, cb?: DataCallback) {
        chain.put(data, cb);
        return this;
      },
      set(data: any, cb?: DataCallback) {
        chain.set ? chain.set(data, cb) : chain.get(Date.now().toString()).put(data, cb);
        return this;
      },
      on(cb: DataCallback): Unsubscribe {
        const ref = chain.on(cb);
        // Gun returns the chain node, not an unsubscribe function
        return typeof ref === 'function' ? ref : () => chain.off();
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
