/**
 * PluresDB adapter — native adapter using PluresDB's chain API.
 *
 * PluresDB exposes a Gun-compatible API: db.get(), .put(), .on(), .once(), .map()
 * This adapter wraps any PluresDB (or Gun) instance.
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

/**
 * Wrap a PluresDB/Gun instance as a DbAdapter.
 *
 * @param db - A PluresDB or Gun instance (anything with .get/.put/.on/.once/.map)
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
