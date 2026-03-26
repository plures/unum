/**
 * PluresDB adapter — native adapter using PluresDB's chain API.
 *
 * PluresDB exposes a Gun-compatible API: db.get(), .put(), .on(), .once(), .map()
 * This adapter wraps any PluresDB (or Gun) instance.
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

/**
 * Minimal structural interface for PluresDB / Gun chain nodes.
 * Matches the subset of the chain API that unum requires.
 */
export interface PluresDbChainLike {
  get(key: string): PluresDbChainLike;
  put(data: unknown, cb?: DataCallback): unknown;
  set(data: unknown, cb?: DataCallback): unknown;
  on(cb: DataCallback): unknown;
  once(cb: DataCallback): void;
  map(): PluresDbChainLike;
  off(): void;
}

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
export function createPluresDbAdapter(db: PluresDbChainLike): DbAdapter {
  function wrapChain(chain: PluresDbChainLike): ChainNode {
    return {
      get(key: string) {
        return wrapChain(chain.get(key));
      },
      put(data: unknown, cb?: DataCallback) {
        chain.put(data, cb);
        return this;
      },
      set(data: unknown, cb?: DataCallback) {
        chain.set(data, cb);
        return this;
      },
      on(cb: DataCallback): Unsubscribe {
        const ref = chain.on(cb);
        // Gun returns the chain, not an unsub function
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
      return wrapChain(db);
    },
  };
}
