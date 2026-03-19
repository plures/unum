/**
 * Tests for the DbAdapter abstraction layer:
 *   - src/types.ts
 *   - src/adapters/pluresdb.ts
 *   - src/adapters/gun.ts
 *   - src/DbContext.ts
 *   - src/runes.ts  (subscription-based derived / bind)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DbAdapter, DbNode, DbUnsubscribe } from '../src/types.js';
import { PluresDbAdapter } from '../src/adapters/pluresdb.js';
import { GunAdapter } from '../src/adapters/gun.js';
import { initializePlures, db, gun, plures } from '../src/DbContext.js';
import { pluresData, pluresDerived, pluresBind, gunData, gunDerived, gunBind } from '../src/runes.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal in-memory DbNode/DbAdapter mock. */
function makeInMemoryAdapter(): {
  adapter: DbAdapter;
  store: Record<string, Record<string, unknown>>;
  emit: (path: string, key: string, data: unknown) => void;
} {
  const store: Record<string, Record<string, unknown>> = {};
  const listeners: Record<string, Array<(data: unknown, key?: string) => void>> = {};
  const collectionListeners: Record<string, Array<(data: unknown, key: string) => void>> = {};

  function makeNode(path: string): DbNode {
    return {
      get(subPath: string): DbNode {
        return makeNode(`${path}/${subPath}`);
      },
      put(data: unknown): DbNode {
        if (!store[path]) store[path] = {};
        Object.assign(store[path], data as Record<string, unknown>);
        for (const cb of listeners[path] ?? []) cb(store[path]);
        return makeNode(path);
      },
      on(callback: (data: unknown, key?: string) => void): DbUnsubscribe {
        if (!listeners[path]) listeners[path] = [];
        listeners[path].push(callback);
        // Emit current value immediately if available.
        if (store[path]) callback(store[path]);
        return () => {
          listeners[path] = (listeners[path] ?? []).filter((l) => l !== callback);
        };
      },
      once(callback: (data: unknown, key?: string) => void): void {
        callback(store[path] ?? null);
      },
      off(): DbNode {
        delete listeners[path];
        return makeNode(path);
      },
      map(): DbNode {
        return {
          ...makeNode(path),
          on(callback: (data: unknown, key: string) => void): DbUnsubscribe {
            if (!collectionListeners[path]) collectionListeners[path] = [];
            collectionListeners[path].push(callback);
            // Emit existing items immediately.
            for (const [k, v] of Object.entries(store[path] ?? {})) {
              if (k !== '_') callback(v, k);
            }
            return () => {
              collectionListeners[path] = (collectionListeners[path] ?? []).filter(
                (l) => l !== callback,
              );
            };
          },
        } as DbNode;
      },
    };
  }

  const rootNode: DbNode = {
    get: (path: string) => makeNode(path),
    put: vi.fn() as unknown as DbNode['put'],
    on: vi.fn() as unknown as DbNode['on'],
    once: vi.fn() as unknown as DbNode['once'],
    off: vi.fn() as unknown as DbNode['off'],
    map: vi.fn() as unknown as DbNode['map'],
  };

  const adapter: DbAdapter = { get: (path: string) => makeNode(path) };

  function emit(path: string, key: string, data: unknown) {
    if (!store[path]) store[path] = {};
    (store[path] as Record<string, unknown>)[key] = data;
    for (const cb of collectionListeners[path] ?? []) cb(data, key);
  }

  return { adapter, store, emit };
}

// ---------------------------------------------------------------------------
// DbAdapter type tests
// ---------------------------------------------------------------------------

describe('DbAdapter interface', () => {
  it('PluresDbAdapter satisfies DbAdapter', () => {
    const mockDb: DbNode = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      off: vi.fn().mockReturnThis(),
      map: vi.fn().mockReturnThis(),
    };
    const adapter = new PluresDbAdapter(mockDb);
    expect(adapter).toBeDefined();
    expect(typeof adapter.get).toBe('function');
    const node = adapter.get('todos');
    expect(mockDb.get).toHaveBeenCalledWith('todos');
    expect(node).toBeDefined();
  });

  it('GunAdapter satisfies DbAdapter', () => {
    const mockGun: DbNode = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      off: vi.fn().mockReturnThis(),
      map: vi.fn().mockReturnThis(),
    };
    const adapter = new GunAdapter(mockGun);
    expect(adapter).toBeDefined();
    expect(typeof adapter.get).toBe('function');
    adapter.get('messages');
    expect(mockGun.get).toHaveBeenCalledWith('messages');
  });
});

// ---------------------------------------------------------------------------
// DbContext tests
// ---------------------------------------------------------------------------

describe('DbContext', () => {
  afterEach(() => {
    // Reset adapter store between tests.
    initializePlures(null as unknown as DbAdapter);
  });

  it('exports initializePlures as a function', () => {
    expect(typeof initializePlures).toBe('function');
  });

  it('exports db, gun, and plures as the same store reference', () => {
    expect(db).toBe(gun);
    expect(db).toBe(plures);
  });

  it('initializePlures sets the adapter in the store', () => {
    const { adapter } = makeInMemoryAdapter();
    let current: DbAdapter | null = null;
    const unsub = db.subscribe((v) => { current = v; });
    initializePlures(adapter);
    expect(current).toBe(adapter);
    unsub();
  });

  it('the cleanup function returned by initializePlures resets the store', () => {
    const { adapter } = makeInMemoryAdapter();
    const cleanup = initializePlures(adapter);
    let current: DbAdapter | null = null;
    const unsub = db.subscribe((v) => { current = v; });
    cleanup();
    expect(current).toBeNull();
    unsub();
  });
});

// ---------------------------------------------------------------------------
// pluresData tests
// ---------------------------------------------------------------------------

describe('pluresData (injected adapter)', () => {
  it('list() returns an empty array initially', () => {
    const { adapter } = makeInMemoryAdapter();
    const data = pluresData('todos', null, adapter);
    expect(data.list()).toEqual([]);
    data.destroy();
  });

  it('add() inserts an item that appears in list()', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData('todos', null, adapter);
    todos.add({ text: 'Buy milk', completed: false });
    const items = todos.list();
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('Buy milk');
    todos.destroy();
  });

  it('remove() deletes an item from the collection', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData('todos', null, adapter);
    todos.add({ id: 'abc', text: 'Delete me' });
    expect(todos.list()).toHaveLength(1);
    todos.remove('abc');
    expect(todos.list()).toHaveLength(0);
    todos.destroy();
  });

  it('subscribe() fires immediately and on subsequent changes', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData('todos', null, adapter);
    const calls: unknown[] = [];
    const unsub = todos.subscribe((s) => calls.push(s));
    expect(calls).toHaveLength(1); // immediate
    todos.add({ text: 'New item' });
    expect(calls).toHaveLength(2); // after add
    unsub();
    todos.destroy();
  });

  it('destroy() stops further notifications', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData('todos', null, adapter);
    const calls: unknown[] = [];
    todos.subscribe((s) => calls.push(s));
    todos.destroy();
    // After destroy, further add should not call listeners.
    const prev = calls.length;
    todos.add({ text: 'Ghost item' });
    expect(calls.length).toBe(prev);
  });
});

// ---------------------------------------------------------------------------
// pluresDerived tests — subscription-based (no setInterval)
// ---------------------------------------------------------------------------

describe('pluresDerived (subscription-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an initial derived value', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData<{ text: string; completed: boolean }>('todos', null, adapter);
    todos.add({ text: 'A', completed: false });
    const incomplete = pluresDerived(todos, (items) => items.filter((i) => !i.completed));
    expect(incomplete.value).toHaveLength(1);
    incomplete.destroy();
    todos.destroy();
  });

  it('updates when source data changes WITHOUT needing setInterval', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData<{ text: string; completed: boolean }>('todos', null, adapter);
    const done = pluresDerived(todos, (items) => items.filter((i) => i.completed));

    // Initially empty.
    expect(done.value).toHaveLength(0);

    // Add a completed item — should update synchronously via subscription.
    todos.add({ text: 'Done', completed: true });

    // Advance fake timers to verify NO setInterval is driving the update.
    vi.advanceTimersByTime(0);
    expect(done.value).toHaveLength(1);

    done.destroy();
    todos.destroy();
  });

  it('subscribe() notifies when derived value changes', () => {
    const { adapter } = makeInMemoryAdapter();
    const todos = pluresData<{ text: string; completed: boolean }>('todos', null, adapter);
    const done = pluresDerived(todos, (items) => items.filter((i) => i.completed));

    const cb = vi.fn();
    const unsub = done.subscribe(cb);
    cb.mockClear();

    todos.add({ text: 'Completed', completed: true });
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toHaveLength(1);

    unsub();
    done.destroy();
    todos.destroy();
  });
});

// ---------------------------------------------------------------------------
// pluresBind tests — subscription-based (no setInterval)
// ---------------------------------------------------------------------------

describe('pluresBind (subscription-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the current field value from a single-item reference', () => {
    const { adapter, store } = makeInMemoryAdapter();
    // Pre-seed data at 'profile/me' to simulate an existing record.
    store['profile/me'] = { name: 'Alice' };

    const profile = pluresData<{ name: string }>('profile', 'me', adapter);
    const nameBinding = pluresBind(profile, 'name');

    // The in-memory adapter emits the stored value synchronously on subscribe.
    expect(nameBinding.value).toBe('Alice');

    // Setting a new value should update both the binding and the source.
    nameBinding.value = 'Bob';
    expect(nameBinding.value).toBe('Bob');
    expect((profile.state as { name: string }).name).toBe('Bob');

    nameBinding.destroy();
    profile.destroy();
  });

  it('updates WITHOUT needing setInterval', () => {
    const { adapter } = makeInMemoryAdapter();
    const profile = pluresData<{ username: string }>('profile', null, adapter);

    const binding = pluresBind(profile, 'username');
    vi.advanceTimersByTime(500); // No setInterval should be running.

    binding.destroy();
    profile.destroy();
  });
});

// ---------------------------------------------------------------------------
// Legacy alias tests
// ---------------------------------------------------------------------------

describe('legacy aliases', () => {
  it('gunData is an alias for pluresData', () => {
    expect(gunData).toBe(pluresData);
  });

  it('gunDerived is an alias for pluresDerived', () => {
    expect(gunDerived).toBe(pluresDerived);
  });

  it('gunBind is an alias for pluresBind', () => {
    expect(gunBind).toBe(pluresBind);
  });
});
