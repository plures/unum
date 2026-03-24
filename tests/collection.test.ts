/**
 * Tests for createCollection() — Svelte 5 runes-compatible reactive typed collection bindings.
 *
 * Coverage:
 *  - CRUD operations (add, update, remove, get)
 *  - add() honours a provided id
 *  - update() on unknown id is a no-op
 *  - size getter
 *  - Svelte store protocol (subscribe / unsubscribe)
 *  - collection.query() — derived reactive queries with store protocol
 *  - destroy() tears down all subscriptions
 *  - TypeScript generics compile without errors (smoke test)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { createCollection } from '../src/collection';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function setup() {
  initDb(createMemoryAdapter());
}
function teardown() {
  destroyDb();
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

describe('createCollection — CRUD', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('starts with an empty collection', () => {
    const col = createCollection('items');
    expect(col.items).toEqual([]);
    expect(col.size).toBe(0);
    col.destroy();
  });

  it('add() inserts an item and returns its id', () => {
    const col = createCollection<{ label: string }>('items');
    const id = col.add({ label: 'A' });
    expect(typeof id).toBe('string');
    expect(col.items).toHaveLength(1);
    expect(col.items[0].id).toBe(id);
    expect(col.items[0].data.label).toBe('A');
    col.destroy();
  });

  it('add() honours a provided id', () => {
    const col = createCollection<{ label: string }>('items');
    const id = col.add({ id: 'item-1', label: 'First' });
    expect(id).toBe('item-1');
    expect(col.items[0].id).toBe('item-1');
    col.destroy();
  });

  it('size getter reflects current count', () => {
    const col = createCollection<{ v: number }>('items');
    expect(col.size).toBe(0);
    col.add({ v: 1 });
    expect(col.size).toBe(1);
    col.add({ v: 2 });
    expect(col.size).toBe(2);
    col.destroy();
  });

  it('update() merges data into an existing item', () => {
    const col = createCollection<{ label: string; active?: boolean }>('items');
    col.add({ id: 'i1', label: 'A' });
    col.update('i1', { active: true });
    const item = col.get('i1')!;
    expect(item.data.label).toBe('A');
    expect(item.data.active).toBe(true);
    col.destroy();
  });

  it('update() on unknown id is a no-op', () => {
    const col = createCollection('items');
    expect(() => col.update('nope', { x: 1 })).not.toThrow();
    col.destroy();
  });

  it('remove() deletes the item', () => {
    const col = createCollection('items');
    col.add({ id: 'i1' });
    expect(col.size).toBe(1);
    col.remove('i1');
    expect(col.items).toHaveLength(0);
    col.destroy();
  });

  it('get() retrieves an item by id', () => {
    const col = createCollection<{ label: string }>('items');
    col.add({ id: 'i1', label: 'Hello' });
    const item = col.get('i1');
    expect(item).toBeDefined();
    expect(item!.data.label).toBe('Hello');
    col.destroy();
  });

  it('get() returns undefined for unknown id', () => {
    const col = createCollection('items');
    expect(col.get('missing')).toBeUndefined();
    col.destroy();
  });
});

// ---------------------------------------------------------------------------
// Svelte store protocol
// ---------------------------------------------------------------------------

describe('createCollection — subscribe (Svelte store protocol)', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('subscribe() fires immediately with current items', () => {
    const col = createCollection('items');
    let received: any = null;
    const unsub = col.subscribe(items => { received = items; });
    expect(received).toBeDefined();
    expect(Array.isArray(received)).toBe(true);
    unsub();
    col.destroy();
  });

  it('subscribe() fires on item addition', () => {
    const col = createCollection('items');
    const snapshots: any[][] = [];
    const unsub = col.subscribe(items => snapshots.push(items));
    col.add({ id: 'i1', label: 'X' });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    const last = snapshots[snapshots.length - 1];
    expect(last.some((i: any) => i.id === 'i1')).toBe(true);
    unsub();
    col.destroy();
  });

  it('subscribe() fires on item update', () => {
    const col = createCollection<{ v: number }>('items');
    col.add({ id: 'i1', v: 1 });
    const snapshots: any[][] = [];
    const unsub = col.subscribe(items => snapshots.push(items));
    col.update('i1', { v: 99 });
    const last = snapshots[snapshots.length - 1];
    expect(last.find((i: any) => i.id === 'i1').data.v).toBe(99);
    unsub();
    col.destroy();
  });

  it('subscribe() fires on item removal', () => {
    const col = createCollection('items');
    col.add({ id: 'i1' });
    const snapshots: any[][] = [];
    const unsub = col.subscribe(items => snapshots.push(items));
    col.remove('i1');
    const last = snapshots[snapshots.length - 1];
    expect(last.some((i: any) => i.id === 'i1')).toBe(false);
    unsub();
    col.destroy();
  });

  it('subscribe() does NOT fire after unsubscribe', () => {
    const col = createCollection('items');
    let count = 0;
    const unsub = col.subscribe(() => count++);
    expect(count).toBe(1); // immediate call
    unsub();
    col.add({ id: 'i1' });
    expect(count).toBe(1); // no additional calls
    col.destroy();
  });
});

// ---------------------------------------------------------------------------
// query() — $derived reactive queries
// ---------------------------------------------------------------------------

describe('createCollection — query() ($derived reactive queries)', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('query returns initial derived value', () => {
    const col = createCollection<{ active: boolean }>('items');
    col.add({ id: 'a', active: true });
    col.add({ id: 'b', active: false });
    const active = col.query(items => items.filter(i => i.data.active));
    expect(active.value).toHaveLength(1);
    expect(active.value[0].id).toBe('a');
    active.destroy();
    col.destroy();
  });

  it('query.value updates when collection changes', () => {
    const col = createCollection<{ done: boolean }>('items');
    const done = col.query(items => items.filter(i => i.data.done));
    expect(done.value).toHaveLength(0);
    col.add({ id: 'i1', done: true });
    expect(done.value).toHaveLength(1);
    done.destroy();
    col.destroy();
  });

  it('query.value updates when item is removed', () => {
    const col = createCollection<{ done: boolean }>('items');
    col.add({ id: 'i1', done: true });
    const done = col.query(items => items.filter(i => i.data.done));
    expect(done.value).toHaveLength(1);
    col.remove('i1');
    expect(done.value).toHaveLength(0);
    done.destroy();
    col.destroy();
  });

  it('query.subscribe() fires immediately and on changes', () => {
    const col = createCollection<{ active: boolean }>('items');
    const q = col.query(items => items.filter(i => i.data.active));
    const snapshots: any[][] = [];
    const unsub = q.subscribe(v => snapshots.push(v));
    expect(snapshots).toHaveLength(1); // immediate call
    col.add({ id: 'i1', active: true });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    unsub();
    q.destroy();
    col.destroy();
  });

  it('query.subscribe() stops firing after query.destroy()', () => {
    const col = createCollection('items');
    const q = col.query(items => items);
    let count = 0;
    const unsub = q.subscribe(() => count++);
    expect(count).toBe(1);
    q.destroy();
    col.add({ id: 'i1' });
    expect(count).toBe(1); // no more calls
    unsub();
    col.destroy();
  });

  it('query can transform items to a computed value', () => {
    const col = createCollection<{ score: number }>('items');
    col.add({ id: 'a', score: 10 });
    col.add({ id: 'b', score: 20 });
    const total = col.query(items => items.reduce((sum, i) => sum + i.data.score, 0));
    expect(total.value).toBe(30);
    col.add({ id: 'c', score: 5 });
    expect(total.value).toBe(35);
    total.destroy();
    col.destroy();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('createCollection — destroy()', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('destroy() prevents future subscriber notifications', () => {
    const col = createCollection('items');
    let count = 0;
    col.subscribe(() => count++);
    expect(count).toBe(1);
    col.destroy();
    col.add({ id: 'i1' });
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TypeScript generics — compile-time smoke test
// ---------------------------------------------------------------------------

describe('createCollection — TypeScript generics', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('accepts typed generics and enforces shapes', () => {
    interface Task { title: string; done: boolean }

    const col = createCollection<Task>('tasks');
    const id1 = col.add({ title: 'Buy milk', done: false });
    const id2 = col.add({ title: 'Read book', done: true });

    expect(col.items[0].data.title).toBeDefined();
    expect(col.size).toBe(2);

    col.update(id1, { done: true });
    expect(col.get(id1)!.data.done).toBe(true);

    const q = col.query(items => items.filter(i => i.data.done));
    expect(q.value).toHaveLength(2);

    col.remove(id2);
    expect(col.size).toBe(1);

    q.destroy();
    col.destroy();
  });
});
