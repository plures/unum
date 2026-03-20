/**
 * unum - PluresDB Helper Utilities
 *
 * Typed helper functions for working with DbAdapter data in Svelte.
 *
 * The old `plures-helper.js` relied on `window.GunDB` / `window.Gun` globals
 * loaded from a CDN. This version removes all CDN / window-global
 * dependencies.
 */
import type { DbAdapter, ChainNode } from './types.js';

// ---------------------------------------------------------------------------
// Adapter helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when a DbAdapter has been provided (non-null).
 */
export function isPluresAvailable(adapter: DbAdapter | null | undefined): adapter is DbAdapter {
  return adapter != null;
}

/** @deprecated Use `isPluresAvailable` instead. */
export const isGunAvailable = isPluresAvailable;

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/**
 * Safely reads a deeply nested property from a plain object using a
 * dot-delimited `path` string.
 */
export function safeGet<T = unknown>(
  obj: unknown,
  path: string,
  defaultValue?: T,
): T | undefined {
  if (obj == null) return defaultValue;

  try {
    const parts = path.split('.');
    let result: unknown = obj;

    for (const part of parts) {
      if (result == null) return defaultValue;
      result = (result as Record<string, unknown>)[part];
    }

    return result === undefined ? defaultValue : (result as T);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely transforms a plain object of database records into an array.
 * Skips Gun/PluresDB internal `_` metadata keys.
 */
export function safeMap<T = unknown, R = unknown>(
  dbData: unknown,
  callback: (key: string, value: T) => R,
  filterFn?: (key: string, value: T) => boolean,
): R[] {
  if (!dbData || typeof dbData !== 'object') return [];

  try {
    let entries = Object.entries(dbData as Record<string, T>).filter(
      ([key]) => key !== '_',
    );

    if (typeof filterFn === 'function') {
      entries = entries.filter(([key, value]) => filterFn(key, value));
    }

    return entries
      .map(([key, value]) => {
        try {
          return callback(key, value);
        } catch {
          return null;
        }
      })
      .filter((item): item is R => item !== null);
  } catch {
    return [];
  }
}

/**
 * Builds a chained `ChainNode` reference from a dot-separated `path` string,
 * with support for `#` as a shorthand for `.map()`.
 *
 * @example
 * ```ts
 * const ref = safeChain(adapter, 'todos.#');
 * // equivalent to: adapter.root().get('todos').map()
 * ```
 */
export function safeChain(adapter: DbAdapter | null, path?: string): ChainNode | null {
  if (!adapter) return null;

  try {
    const root = adapter.root();
    if (!path) return root;

    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) return root;

    let chain: ChainNode = root.get(parts[0]);

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part === '#') {
        chain = chain.map();
      } else {
        chain = chain.get(part);
      }
    }

    return chain;
  } catch {
    return null;
  }
}

/**
 * @deprecated
 * The old `getPlures(options)` instantiated a database from `window.GunDB` /
 * `window.Gun`. That CDN-based pattern has been removed. Construct your DB
 * instance directly and wrap it in `createPluresDbAdapter`, then call
 * `initDb()` instead.
 */
export function getPlures(_options?: unknown): null {
  console.warn(
    '[unum] getPlures() is deprecated and no longer creates a database instance. ' +
    'Use createPluresDbAdapter() or createGunAdapter() with initDb() instead.',
  );
  return null;
}

/** @deprecated Use `getPlures` (which is itself deprecated). */
export const getGun = getPlures;
