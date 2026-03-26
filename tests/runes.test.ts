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
