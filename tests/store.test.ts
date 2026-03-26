/**
 * Tests for src/store.ts — PluresStore and createPluresStore
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb, getRoot } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { PluresStore, createPluresStore } from '../src/store';

describe('PluresStore', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('initialises with the given initial value', () => {
    const store = new PluresStore<number>('counter', 0);
    const values: number[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    expect(values).toEqual([0]);
    unsub();
    store.destroy();
  });

  it('set() updates the store value', () => {
    const store = new PluresStore<number>('counter', 0);
    const values: number[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    store.set(42);
    expect(values).toContain(42);
    unsub();
    store.destroy();
  });

  it('update() applies the updater function', () => {
    const store = new PluresStore<number>('counter', 10);
    const values: number[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    store.update((n) => n + 5);
    expect(values).toContain(15);
    unsub();
    store.destroy();
  });

  it('reflects DB writes reactively via on() callback', () => {
    const store = new PluresStore<{ name: string }>('profile');
    const values: unknown[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    getRoot().get('profile').put({ name: 'Alice' });
    expect(values.some((v: any) => v?.name === 'Alice')).toBe(true);
    unsub();
    store.destroy();
  });

  it('destroy() can be called twice without throwing', () => {
    const store = new PluresStore<number>('counter2', 0);
    store.destroy();
    expect(() => store.destroy()).not.toThrow();
  });

  it('works without an initial value', () => {
    const store = new PluresStore<string>('nodefault');
    const values: unknown[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    store.set('hello');
    expect(values).toContain('hello');
    unsub();
    store.destroy();
  });
});

describe('createPluresStore', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => destroyDb());

  it('returns a PluresStore instance', () => {
    const store = createPluresStore<string>('theme', 'light');
    expect(store).toBeInstanceOf(PluresStore);
    store.destroy();
  });

  it('set and update work via factory helper', () => {
    const store = createPluresStore<'light' | 'dark'>('theme2', 'light');
    const values: string[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    store.set('dark');
    store.update((t) => (t === 'dark' ? 'light' : 'dark'));
    expect(values).toEqual(['light', 'dark', 'light']);
    unsub();
    store.destroy();
  });

  it('factory works without initial value', () => {
    const store = createPluresStore<number>('count');
    store.set(7);
    const values: number[] = [];
    const unsub = store.subscribe((v) => values.push(v));
    expect(values).toContain(7);
    unsub();
    store.destroy();
  });
});
