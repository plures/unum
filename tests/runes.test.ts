import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb, getRoot } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { pluresData, pluresDerived } from '../src/runes';

describe('memory adapter', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('put and get via once', () => {
    const root = getRoot();
    root.get('test').put({ name: 'hello' });
    let result: unknown;
    root.get('test').once((data) => { result = data; });
    expect(result).toEqual({ name: 'hello' });
  });

  it('on fires for existing data', () => {
    const root = getRoot();
    root.get('x').put({ v: 1 });
    let fired: unknown;
    root.get('x').on((data) => { fired = data; });
    expect(fired).toEqual({ v: 1 });
  });

  it('on fires for new data', () => {
    const root = getRoot();
    const values: unknown[] = [];
    root.get('y').on((data) => { values.push(data); });
    root.get('y').put({ v: 2 });
    expect(values).toEqual([{ v: 2 }]);
  });

  it('map iterates children', () => {
    const root = getRoot();
    root.get('items').get('a').put({ text: 'A' });
    root.get('items').get('b').put({ text: 'B' });
    const entries: [string, unknown][] = [];
    root.get('items').map().on((data, key) => {
      entries.push([key!, data]);
    });
    expect(entries).toHaveLength(2);
    expect(entries.map(([k]) => k).sort()).toEqual(['a', 'b']);
  });

  it('map fires on new children', () => {
    const root = getRoot();
    const entries: string[] = [];
    root.get('col').map().on((_data, key) => { entries.push(key!); });
    root.get('col').get('c1').put({ x: 1 });
    root.get('col').get('c2').put({ x: 2 });
    expect(entries).toEqual(['c1', 'c2']);
  });

  it('off clears listeners', () => {
    const root = getRoot();
    let count = 0;
    root.get('z').put({ a: 0 }); // seed data first
    root.get('z').on(() => { count++; }); // fires with existing data = 1
    root.get('z').put({ a: 1 }); // fires = 2
    root.get('z').off();
    root.get('z').put({ a: 2 }); // should NOT fire
    expect(count).toBe(2);
  });
});

describe('pluresData', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('collection: add and list', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'Buy milk' });
    todos.add({ text: 'Walk dog' });
    const list = todos.list();
    expect(list).toHaveLength(2);
    expect(list.map((t) => (t as { text: string }).text).sort()).toEqual(['Buy milk', 'Walk dog']);
    todos.destroy();
  });

  it('collection: update item', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'Test', id: 'abc' });
    todos.update('abc', { text: 'Updated' });
    const item = todos.state['abc'] as { text: string };
    expect(item.text).toBe('Updated');
    todos.destroy();
  });

  it('collection: remove item', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'Temp', id: 'rm1' });
    expect(todos.list()).toHaveLength(1);
    todos.remove('rm1');
    expect(todos.list()).toHaveLength(0);
    todos.destroy();
  });

  it('subscribe fires with current state', () => {
    const todos = pluresData('todos');
    todos.add({ text: 'X', id: 'x1' });
    let received: unknown;
    const unsub = todos.subscribe((s) => { received = s; });
    expect(received).toBeDefined();
    expect((received as Record<string, unknown>)['x1']).toBeDefined();
    unsub();
    todos.destroy();
  });

  it('single item binding', () => {
    const root = getRoot();
    root.get('profiles').get('me').put({ name: 'Test' });
    const profile = pluresData('profiles', 'me');
    expect(profile.state.name).toBe('Test');
    profile.destroy();
  });
});

describe('subscription cleanup — rapid mount/unmount', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('destroy prevents further notifications', () => {
    const todos = pluresData('cleanup1');
    let callCount = 0;
    todos.subscribe(() => { callCount++; });
    // subscribe fires immediately with current state
    expect(callCount).toBe(1);
    todos.destroy();
    // Writing after destroy should not trigger subscribers
    const root = getRoot();
    root.get('cleanup1').get('late').put({ text: 'Late' });
    expect(callCount).toBe(1);
  });

  it('destroy is idempotent (safe to call multiple times)', () => {
    const todos = pluresData('cleanup2');
    todos.add({ text: 'X', id: 'x1' });
    todos.destroy();
    // Second call should not throw
    expect(() => todos.destroy()).not.toThrow();
  });

  it('destroy during notify stops subsequent subscribers', () => {
    const todos = pluresData('cleanup3');
    let first = true;
    todos.subscribe(() => {
      if (first) { first = false; return; }
      todos.destroy();
    });
    let secondCalled = 0;
    todos.subscribe(() => { secondCalled++; });
    secondCalled = 0; // ignore initial subscribe call

    todos.add({ text: 'Y', id: 'y1' });
    expect(secondCalled).toBe(0);
  });

  it('rapid create/destroy cycle does not leak', () => {
    const root = getRoot();
    const refs: ReturnType<typeof pluresData>[] = [];
    // Simulate rapid mount/unmount (e.g. router transitions)
    for (let i = 0; i < 50; i++) {
      const ref = pluresData('rapid');
      refs.push(ref);
      ref.destroy();
    }
    // After all destroyed, writes should not trigger any callbacks
    let notified = false;
    // Create a fresh reference to listen
    const fresh = pluresData('rapid');
    fresh.subscribe(() => { notified = true; });
    notified = false; // reset after initial subscribe call
    root.get('rapid').get('new').put({ v: 1 });
    // Only the fresh (non-destroyed) ref should receive
    expect(notified).toBe(true);
    fresh.destroy();
  });

  it('no notifications after destroy for single item binding', () => {
    const root = getRoot();
    root.get('profiles').get('p1').put({ name: 'A' });
    const profile = pluresData('profiles', 'p1');
    let callCount = 0;
    profile.subscribe(() => { callCount++; });
    expect(callCount).toBe(1);
    profile.destroy();
    root.get('profiles').get('p1').put({ name: 'B' });
    expect(callCount).toBe(1);
  });
});

describe('pluresDerived', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('transforms source data', () => {
    const todos = pluresData('dtodos');
    todos.add({ text: 'A', done: true, id: 'd1' });
    todos.add({ text: 'B', done: false, id: 'd2' });
    const done = pluresDerived(todos, (items) => items.filter((i) => (i as { done?: boolean }).done));
    expect(done.value).toHaveLength(1);
    expect((done.value[0] as { text: string }).text).toBe('A');
    done.destroy();
    todos.destroy();
  });

  it('updates when source changes', () => {
    const todos = pluresData('dtodos2');
    const done = pluresDerived(todos, (items) => items.filter((i) => (i as { done?: boolean }).done));
    expect(done.value).toHaveLength(0);
    todos.add({ text: 'C', done: true, id: 'e1' });
    expect(done.value).toHaveLength(1);
    done.destroy();
    todos.destroy();
  });
});
