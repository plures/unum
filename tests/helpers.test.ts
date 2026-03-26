/**
 * Tests for src/plures-helper.ts — isPluresAvailable, safeGet, safeMap, safeChain, getPlures
 * Tests for src/DbContext.ts — backward-compat re-export shim
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPluresAvailable,
  isGunAvailable,
  safeGet,
  safeMap,
  safeChain,
  getPlures,
  getGun,
} from '../src/plures-helper';
import type { DbAdapter } from '../src/types';
import { initDb, destroyDb, getAdapter } from '../src/context';
import {
  initDb as ctxInitDb,
  destroyDb as ctxDestroyDb,
  getAdapter as ctxGetAdapter,
  getRoot as ctxGetRoot,
  db as ctxDb,
} from '../src/DbContext';
import { createMemoryAdapter } from '../src/adapters/memory';

// ---------------------------------------------------------------------------
// isPluresAvailable / isGunAvailable
// ---------------------------------------------------------------------------

describe('isPluresAvailable', () => {
  it('returns true for a valid adapter', () => {
    const mockAdapter = { root: () => ({}) } as unknown as DbAdapter;
    expect(isPluresAvailable(mockAdapter)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPluresAvailable(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPluresAvailable(undefined)).toBe(false);
  });

  it('isGunAvailable is an alias for isPluresAvailable', () => {
    const mockAdapter = { root: () => ({}) } as unknown as DbAdapter;
    expect(isGunAvailable(mockAdapter)).toBe(true);
    expect(isGunAvailable(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// safeGet
// ---------------------------------------------------------------------------

describe('safeGet', () => {
  it('retrieves a top-level property', () => {
    expect(safeGet({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('retrieves a nested property via dot path', () => {
    const obj = { user: { address: { city: 'NYC' } } };
    expect(safeGet(obj, 'user.address.city')).toBe('NYC');
  });

  it('returns defaultValue when path does not exist', () => {
    expect(safeGet({ a: 1 }, 'b.c', 'default')).toBe('default');
  });

  it('returns undefined when no default and path missing', () => {
    expect(safeGet({ a: 1 }, 'x')).toBeUndefined();
  });

  it('returns defaultValue when obj is null', () => {
    expect(safeGet(null, 'any.path', 0)).toBe(0);
  });

  it('returns defaultValue when obj is undefined', () => {
    expect(safeGet(undefined, 'any.path', 'fallback')).toBe('fallback');
  });

  it('returns defaultValue when an intermediate segment is null', () => {
    expect(safeGet({ user: null }, 'user.name', 'n/a')).toBe('n/a');
  });

  it('returns falsy value 0 rather than defaultValue', () => {
    expect(safeGet({ count: 0 }, 'count', 99)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// safeMap
// ---------------------------------------------------------------------------

describe('safeMap', () => {
  it('maps entries of a plain object, skipping _ keys', () => {
    const raw = {
      abc: { text: 'Buy milk', done: false },
      _: { '#': 'meta' },
    };
    const result = safeMap<{ text: string; done: boolean }, string>(
      raw,
      (_id, v) => v.text,
    );
    expect(result).toEqual(['Buy milk']);
  });

  it('returns an empty array for null input', () => {
    expect(safeMap(null, () => 'x')).toEqual([]);
  });

  it('returns an empty array for non-object input', () => {
    expect(safeMap('string', () => 'x')).toEqual([]);
    expect(safeMap(42, () => 'x')).toEqual([]);
  });

  it('applies the optional filterFn', () => {
    const raw = { a: { done: true }, b: { done: false }, c: { done: true } };
    const result = safeMap<{ done: boolean }, string>(
      raw,
      (id) => id,
      (_key, v) => v.done,
    );
    expect(result.sort()).toEqual(['a', 'c']);
  });

  it('skips entries where callback throws', () => {
    const raw = { a: 1, b: 2 };
    const result = safeMap<number, number>(raw, (_k, v) => {
      if (v === 1) throw new Error('oops');
      return v * 10;
    });
    expect(result).toEqual([20]);
  });
});

// ---------------------------------------------------------------------------
// safeChain
// ---------------------------------------------------------------------------

describe('safeChain', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('returns null when adapter is null', () => {
    expect(safeChain(null, 'todos')).toBeNull();
  });

  it('returns the root ChainNode when no path is given', () => {
    const result = safeChain(getAdapter());
    expect(result).not.toBeNull();
  });

  it('returns the root when path is empty string', () => {
    const result = safeChain(getAdapter(), '');
    expect(result).not.toBeNull();
  });

  it('traverses a dot-separated path', () => {
    const result = safeChain(getAdapter(), 'todos.item1');
    expect(result).not.toBeNull();
    expect(typeof result!.put).toBe('function');
  });

  it('supports # as shorthand for .map()', () => {
    const result = safeChain(getAdapter(), 'todos.#');
    expect(result).not.toBeNull();
  });

  it('returns null when an error occurs during traversal', () => {
    const brokenAdapter = {
      root: () => {
        throw new Error('broken');
      },
    } as unknown as DbAdapter;
    expect(safeChain(brokenAdapter, 'path')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPlures / getGun (deprecated)
// ---------------------------------------------------------------------------

describe('getPlures (deprecated)', () => {
  it('returns null and logs a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getPlures()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[unum] getPlures() is deprecated'),
    );
    warnSpy.mockRestore();
  });

  it('accepts options argument without error', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => getPlures({ peers: [] })).not.toThrow();
    warnSpy.mockRestore();
  });

  it('getGun is an alias for getPlures', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getGun()).toBeNull();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// DbContext.ts — backward-compat re-export shim
// ---------------------------------------------------------------------------

describe('DbContext re-exports', () => {
  beforeEach(() => {
    ctxInitDb(createMemoryAdapter());
  });
  afterEach(() => ctxDestroyDb());

  it('initDb (via initializePlures alias) initialises the DB', () => {
    expect(ctxGetAdapter()).not.toBeNull();
  });

  it('getRoot returns a working chain node', () => {
    const root = ctxGetRoot();
    expect(typeof root.get).toBe('function');
  });

  it('db is a Svelte-readable store (has subscribe)', () => {
    expect(typeof ctxDb.subscribe).toBe('function');
  });

  it('destroyDb clears the adapter (getAdapter throws after destroy)', () => {
    ctxDestroyDb();
    expect(() => ctxGetAdapter()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Adapter chain methods — once(), map(), off(), set()
// ---------------------------------------------------------------------------

import { createPluresDbAdapter } from '../src/adapters/pluresdb';
import { createGunAdapter } from '../src/adapters/gun';

describe('createPluresDbAdapter — chain methods', () => {
  function makeMock(onReturn?: unknown) {
    const mock = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(onReturn ?? (() => {})),
      once: vi.fn(),
      off: vi.fn(),
      map: vi.fn().mockReturnThis(),
    };
    return mock;
  }

  it('once() calls the underlying chain.once()', () => {
    const mock = makeMock();
    const adapter = createPluresDbAdapter(mock);
    const cb = vi.fn();
    adapter.root().once(cb);
    expect(mock.once).toHaveBeenCalledWith(cb);
  });

  it('map() delegates to chain.map() and returns a chain', () => {
    const mock = makeMock();
    const adapter = createPluresDbAdapter(mock);
    const result = adapter.root().map();
    expect(mock.map).toHaveBeenCalled();
    expect(typeof result.get).toBe('function');
  });

  it('off() delegates to chain.off()', () => {
    const mock = makeMock();
    const adapter = createPluresDbAdapter(mock);
    adapter.root().off();
    expect(mock.off).toHaveBeenCalled();
  });

  it('set() delegates to chain.set()', () => {
    const mock = makeMock();
    const adapter = createPluresDbAdapter(mock);
    const cb = vi.fn();
    adapter.root().set({ x: 1 }, cb);
    expect(mock.set).toHaveBeenCalledWith({ x: 1 }, cb);
  });

  it('on() returns the unsub function when chain.on returns a function', () => {
    const unsub = vi.fn();
    const mock = makeMock(unsub);
    const adapter = createPluresDbAdapter(mock);
    const result = adapter.root().on(vi.fn());
    expect(typeof result).toBe('function');
    result(); // call the unsub
    expect(unsub).toHaveBeenCalled();
  });

  it('on() returns a fallback off() when chain.on returns non-function', () => {
    const mock = makeMock('not-a-function');
    const adapter = createPluresDbAdapter(mock);
    const result = adapter.root().on(vi.fn());
    expect(typeof result).toBe('function');
    result(); // should call chain.off()
    expect(mock.off).toHaveBeenCalled();
  });

  it('get() chains multiple levels', () => {
    const mock = makeMock();
    const adapter = createPluresDbAdapter(mock);
    adapter.root().get('a').get('b').get('c');
    expect(mock.get).toHaveBeenCalledWith('a');
    expect(mock.get).toHaveBeenCalledWith('b');
    expect(mock.get).toHaveBeenCalledWith('c');
  });
});

describe('createGunAdapter — chain methods', () => {
  interface MockChain {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    map: ReturnType<typeof vi.fn>;
    set?: ReturnType<typeof vi.fn>;
  }
  function makeMock(onReturn?: unknown, hasSet = true): MockChain {
    const mock: MockChain = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(onReturn ?? (() => {})),
      once: vi.fn(),
      off: vi.fn(),
      map: vi.fn().mockReturnThis(),
    };
    if (hasSet) mock.set = vi.fn().mockReturnThis();
    return mock;
  }

  it('once() calls the underlying chain.once()', () => {
    const mock = makeMock();
    const adapter = createGunAdapter(mock);
    const cb = vi.fn();
    adapter.root().once(cb);
    expect(mock.once).toHaveBeenCalledWith(cb);
  });

  it('map() delegates to chain.map() and returns a chain', () => {
    const mock = makeMock();
    const adapter = createGunAdapter(mock);
    const result = adapter.root().map();
    expect(mock.map).toHaveBeenCalled();
    expect(typeof result.get).toBe('function');
  });

  it('off() delegates to chain.off()', () => {
    const mock = makeMock();
    const adapter = createGunAdapter(mock);
    adapter.root().off();
    expect(mock.off).toHaveBeenCalled();
  });

  it('set() uses chain.set() when available', () => {
    const mock = makeMock();
    const adapter = createGunAdapter(mock);
    const cb = vi.fn();
    adapter.root().set({ y: 2 }, cb);
    expect(mock.set).toHaveBeenCalledWith({ y: 2 }, cb);
  });

  it('set() falls back to get(timestamp).put() when chain.set is absent', () => {
    const mock = makeMock(undefined, false); // no .set
    const adapter = createGunAdapter(mock);
    adapter.root().set({ y: 2 });
    // Should call chain.get with a timestamp string, then .put
    expect(mock.get).toHaveBeenCalled();
    expect(mock.put).toHaveBeenCalledWith({ y: 2 }, undefined);
  });

  it('on() returns the unsub function when chain.on returns a function', () => {
    const unsub = vi.fn();
    const mock = makeMock(unsub);
    const adapter = createGunAdapter(mock);
    const result = adapter.root().on(vi.fn());
    result();
    expect(unsub).toHaveBeenCalled();
  });

  it('on() returns a fallback off() when chain.on returns non-function', () => {
    const mock = makeMock('not-a-function');
    const adapter = createGunAdapter(mock);
    const result = adapter.root().on(vi.fn());
    result();
    expect(mock.off).toHaveBeenCalled();
  });
});
