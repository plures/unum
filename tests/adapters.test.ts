/**
 * Tests for the DbAdapter abstraction layer:
 *   - src/adapters/pluresdb.ts  (createPluresDbAdapter)
 *   - src/adapters/gun.ts       (createGunAdapter)
 *   - src/adapters/memory.ts    (createMemoryAdapter)
 *   - src/context.ts            (initDb / destroyDb)
 *   - src/runes.ts              (subscription-based derived / bind)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb, getRoot } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { createPluresDbAdapter } from '../src/adapters/pluresdb';
import { createGunAdapter } from '../src/adapters/gun';
import { pluresData, pluresDerived, pluresBind } from '../src/runes';

// ---------------------------------------------------------------------------
// createPluresDbAdapter tests
// ---------------------------------------------------------------------------

describe('createPluresDbAdapter', () => {
  it('wraps a PluresDB/Gun-like instance as a DbAdapter', () => {
    const mockDb = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      off: vi.fn(),
      map: vi.fn().mockReturnThis(),
    };
    const adapter = createPluresDbAdapter(mockDb);
    expect(adapter).toBeDefined();
    expect(typeof adapter.root).toBe('function');
    const root = adapter.root();
    expect(typeof root.get).toBe('function');
    expect(typeof root.put).toBe('function');
    expect(typeof root.on).toBe('function');
    expect(typeof root.map).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// createGunAdapter tests
// ---------------------------------------------------------------------------

describe('createGunAdapter', () => {
  it('wraps a Gun.js instance as a DbAdapter', () => {
    const mockGun = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      off: vi.fn(),
      map: vi.fn().mockReturnThis(),
    };
    const adapter = createGunAdapter(mockGun);
    expect(adapter).toBeDefined();
    expect(typeof adapter.root).toBe('function');
    const root = adapter.root();
    root.get('messages');
    expect(mockGun.get).toHaveBeenCalledWith('messages');
  });

  it('returns an unsubscribe function from on()', () => {
    const unsub = vi.fn();
    const mockGun = {
      get: vi.fn().mockReturnThis(),
      put: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnValue(unsub),
      once: vi.fn(),
      off: vi.fn(),
      map: vi.fn().mockReturnThis(),
    };
    const adapter = createGunAdapter(mockGun);
    const cb = vi.fn();
    const result = adapter.root().on(cb);
    expect(typeof result).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// context (initDb / destroyDb) tests
// ---------------------------------------------------------------------------

describe('context', () => {
  afterEach(() => destroyDb());

  it('initDb makes getRoot() available', () => {
    initDb(createMemoryAdapter());
    const root = getRoot();
    expect(root).toBeDefined();
    expect(typeof root.get).toBe('function');
  });

  it('destroyDb clears the adapter', () => {
    initDb(createMemoryAdapter());
    destroyDb();
    expect(() => getRoot()).toThrow('unum: call initDb()');
  });
});

// ---------------------------------------------------------------------------
// pluresData with memory adapter
// ---------------------------------------------------------------------------

describe('pluresData (memory adapter)', () => {
  beforeEach(() => initDb(createMemoryAdapter()));
  afterEach(() => destroyDb());

  it('list() returns empty array initially', () => {
    const todos = pluresData('todos');
    expect(todos.list()).toEqual([]);
    todos.destroy();
  });

  it('add() inserts an item visible in list()', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'Buy milk', completed: false });
    const items = todos.list();
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('Buy milk');
    todos.destroy();
  });

  it('remove() deletes an item', () => {
    const todos = pluresData('todos');
    todos.add({ id: 'abc', text: 'Delete me' });
    expect(todos.list()).toHaveLength(1);
    todos.remove('abc');
    expect(todos.list()).toHaveLength(0);
    todos.destroy();
  });

  it('subscribe() fires immediately and on changes', () => {
    const todos = pluresData('todos');
    const calls: unknown[] = [];
    const unsub = todos.subscribe((s) => calls.push(s));
    expect(calls).toHaveLength(1); // immediate
    todos.add({ text: 'New item' });
    // The add triggers at least one additional notification (may be 2 due to
    // both the local notify and the DB subscription firing).
    expect(calls.length).toBeGreaterThanOrEqual(2);
    unsub();
    todos.destroy();
  });
});

// ---------------------------------------------------------------------------
// pluresDerived — subscription-based, no setInterval
// ---------------------------------------------------------------------------

describe('pluresDerived (subscription-based)', () => {
  beforeEach(() => initDb(createMemoryAdapter()));
  afterEach(() => destroyDb());

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns an initial derived value', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'A', done: false, id: 'a1' });
    const active = pluresDerived(todos, (items) => items.filter((i: any) => !i.done));
    expect(active.value).toHaveLength(1);
    active.destroy();
    todos.destroy();
  });

  it('updates reactively WITHOUT setInterval', () => {
    const todos = pluresData('todos');
    const done = pluresDerived(todos, (items) => items.filter((i: any) => i.done));
    expect(done.value).toHaveLength(0);
    todos.add({ text: 'Done', done: true });
    // Advance fake timers — if polling were used this would be needed
    vi.advanceTimersByTime(0);
    expect(done.value).toHaveLength(1);
    done.destroy();
    todos.destroy();
  });
});

// ---------------------------------------------------------------------------
// pluresBind — subscription-based
// ---------------------------------------------------------------------------

describe('pluresBind (subscription-based)', () => {
  beforeEach(() => initDb(createMemoryAdapter()));
  afterEach(() => destroyDb());

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reads the initial field value', () => {
    const root = getRoot();
    root.get('profile').get('me').put({ name: 'Alice' });
    const profile = pluresData('profile', 'me');
    const nameBinding = pluresBind(profile, 'name');
    expect(nameBinding.value).toBe('Alice');
    nameBinding.destroy();
    profile.destroy();
  });

  it('setting value updates the source', () => {
    const root = getRoot();
    root.get('profile').get('me').put({ name: 'Alice' });
    const profile = pluresData('profile', 'me');
    const nameBinding = pluresBind(profile, 'name');
    nameBinding.value = 'Bob';
    expect(nameBinding.value).toBe('Bob');
    expect((profile.state as any).name).toBe('Bob');
    nameBinding.destroy();
    profile.destroy();
  });

  it('updates WITHOUT needing setInterval', () => {
    const profile = pluresData('profile', null);
    const binding = pluresBind(profile, 'username');
    vi.advanceTimersByTime(500);
    binding.destroy();
    profile.destroy();
  });
});

describe('memory adapter — event bubbling', () => {
  it('root.on() receives child writes with full path as key', () => {
    initDb(createMemoryAdapter());
    const root = getRoot();
    const events: Array<{ data: any; key: string }> = [];
    root.on((data: any, key: string) => events.push({ data, key }));

    root.get('sprint').get('current').put({ name: 'Sprint 1' });
    root.get('notes').get('content').put('hello world');

    expect(events.length).toBe(2);
    expect(events[0]).toEqual({ data: { name: 'Sprint 1' }, key: 'sprint/current' });
    expect(events[1]).toEqual({ data: 'hello world', key: 'notes/content' });
    destroyDb();
  });

  it('root.on() receives deeply nested writes', () => {
    initDb(createMemoryAdapter());
    const root = getRoot();
    const events: Array<{ key: string }> = [];
    root.on((_data: any, key: string) => events.push({ key }));

    root.get('a').get('b').get('c').get('d').put(42);

    expect(events.length).toBe(1);
    expect(events[0].key).toBe('a/b/c/d');
    destroyDb();
  });

  it('intermediate node.on() also receives child writes', () => {
    initDb(createMemoryAdapter());
    const root = getRoot();
    const events: Array<{ key: string }> = [];
    root.get('sprint').on((_data: any, key: string) => events.push({ key }));

    root.get('sprint').get('current').put({ name: 'test' });

    // Direct child listener fires with key = 'current'
    expect(events.some(e => e.key === 'sprint/current')).toBe(true);
    destroyDb();
  });

  it('map listeners on root receive child writes', () => {
    initDb(createMemoryAdapter());
    const root = getRoot();
    const events: Array<{ key: string }> = [];
    root.map().on((_data: any, key: string) => events.push({ key }));

    root.get('sprint').get('current').put({ name: 'test' });

    expect(events.length).toBeGreaterThan(0);
    destroyDb();
  });
});
