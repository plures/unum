/**
 * unum - PluresDB Helper Utilities
 *
 * Typed helper functions for working with DbAdapter data in Svelte.
 *
 * The old `plures-helper.js` relied on `window.GunDB` / `window.Gun` globals
 * loaded from a CDN.  This version removes all CDN / window-global
 * dependencies.  Pass your `DbAdapter` instance in directly.
 */
import type { DbAdapter, DbNode } from './types.js';

// ---------------------------------------------------------------------------
// Adapter helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when a DbAdapter has been provided (non-null).
 *
 * @example
 * ```ts
 * if (isPluresAvailable(adapter)) { ... }
 * ```
 */
export function isPluresAvailable(adapter: DbAdapter | null | undefined): adapter is DbAdapter {
  return adapter != null;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/**
 * Safely reads a deeply nested property from a plain object using a
 * dot-delimited `path` string.
 *
 * @param obj          — Source object.
 * @param path         — Dot-separated property path, e.g. `'user.profile.name'`.
 * @param defaultValue — Value to return when the path cannot be resolved.
 *
 * @example
 * ```ts
 * safeGet({ user: { name: 'Alice' } }, 'user.name'); // 'Alice'
 * safeGet({}, 'missing.key', 'default');             // 'default'
 * ```
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
 *
 * Skips Gun/PluresDB internal `_` metadata keys and entries for which
 * the callback throws.  An optional `filterFn` can pre-filter entries
 * before the mapping step.
 *
 * @param dbData   — Raw object returned by a database `once` / `on` callback.
 * @param callback — `(key, value) => mappedItem` transformation function.
 * @param filterFn — Optional `(key, value) => boolean` predicate.
 *
 * @example
 * ```ts
 * const items = safeMap(rawData, (id, item) => ({ id, ...item }));
 * ```
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
 * Builds a chained `DbNode` reference from a dot-separated `path` string,
 * with support for `#` as a shorthand for `.map()`.
 *
 * @param adapter — A `DbAdapter` instance.
 * @param path    — Dot-separated path, optionally containing `#` for map().
 *
 * @example
 * ```ts
 * const ref = safeChain(adapter, 'todos.#');
 * // equivalent to: adapter.get('todos').map()
 * ```
 */
export function safeChain(adapter: DbAdapter | null, path?: string): DbNode | null {
  if (!adapter) return null;

  try {
    if (!path) return adapter.get('');

    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) return adapter.get('');

    let chain: DbNode = adapter.get(parts[0]);

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

// ---------------------------------------------------------------------------
// Legacy exports (backward compatibility with plures-helper.js consumers)
// ---------------------------------------------------------------------------

/** @deprecated Use `isPluresAvailable` instead. */
export const isGunAvailable = isPluresAvailable;

/**
 * @deprecated
 * The old `getPlures(options)` instantiated a database from `window.GunDB` /
 * `window.Gun`.  That CDN-based pattern has been removed.  Construct your DB
 * instance directly and wrap it in `PluresDbAdapter` or `GunAdapter` instead.
 */
export function getPlures(_options?: unknown): null {
  console.warn(
    '[unum] getPlures() is deprecated and no longer creates a database instance. ' +
    'Construct your DB and wrap it in PluresDbAdapter or GunAdapter, then call initializePlures().',
  );
  return null;
}

/** @deprecated Use `getPlures` (which is itself deprecated). */
export const getGun = getPlures;
