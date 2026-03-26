/**
 * PluresDB adapter — native adapter using PluresDB's chain API.
 *
 * PluresDB exposes a Gun-compatible API: db.get(), .put(), .on(), .once(), .map()
 * This adapter wraps any PluresDB (or Gun) instance.
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

/**
 * Wrap a PluresDB or Gun instance as a `DbAdapter`.
 *
 * PluresDB exposes a Gun-compatible chain API (`get`, `put`, `on`, `once`,
 * `map`, `off`).  This adapter normalises that API into the unum `ChainNode`
 * interface so you can pass any PluresDB or Gun instance to `initDb()`.
 *
 * @param db - A PluresDB or Gun instance (anything with `.get`, `.put`, `.on`,
 *             `.once`, `.map`, and `.off` methods).
 * @returns A `DbAdapter` wrapping the given database instance.
 *
 * @example
 * ```ts
 * import PluresDB from 'pluresdb';
 * import { initDb, createPluresDbAdapter } from '@plures/unum';
 *
 * const db = new PluresDB({ localStorage: true });
 * initDb(createPluresDbAdapter(db));
 * ```
 */
export function createPluresDbAdapter(db: any): DbAdapter {
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
        chain.set(data, cb);
        return this;
      },
      on(cb: DataCallback): Unsubscribe {
        const ref = chain.on(cb);
        // Gun returns the chain, not an unsub function
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
      return wrapChain(db);
    },
  };
}
