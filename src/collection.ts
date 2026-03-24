/**
 * createCollection() — Svelte 5 runes-compatible reactive typed collection bindings.
 *
 * Works with Svelte 4 (store protocol) and Svelte 5 ($derived / $effect).
 * No polling — pure subscription-based reactivity.
 *
 * Storage layout inside PluresDB:
 *   {path}/{itemId}  = { ...itemData }
 *
 * @example
 * ```svelte
 * <script>
 *   import { createCollection } from '@plures/unum';
 *
 *   interface Task { title: string; done: boolean }
 *   const tasks = createCollection<Task>('tasks');
 *
 *   // Reactive derived query
 *   const pending = tasks.query(items => items.filter(i => !i.data.done));
 *
 *   // Side-effect subscription managed by $effect
 *   $effect(() => tasks.subscribe(items => console.log('tasks changed', items)));
 * </script>
 *
 * {#each tasks.items as task}
 *   <p>{task.data.title}</p>
 * {/each}
 * ```
 */

import { getRoot } from './context.js';
import type {
  CollectionItem,
  CollectionQuery,
  CollectionRef,
  Unsubscribe,
} from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a reactive typed collection binding backed by PluresDB.
 *
 * @param path - Base path in the DB (e.g. `'tasks'`).
 *
 * ## Svelte 5 runes usage
 * ```svelte
 * <script>
 *   import { createCollection } from '@plures/unum';
 *   interface Task { title: string; done: boolean }
 *
 *   const tasks = createCollection<Task>('tasks');
 *
 *   const pending = tasks.query(items => items.filter(i => !i.data.done));
 * </script>
 *
 * {#each tasks.items as task}
 *   <p>{task.data.title}</p>
 * {/each}
 * ```
 *
 * ## Svelte 4 store usage
 * ```svelte
 * <script>
 *   import { createCollection } from '@plures/unum';
 *   const tasks = createCollection('tasks');
 *   const pending = tasks.query(items => items.filter(i => !i.data.done));
 * </script>
 * {#each $tasks as task}…{/each}
 * ```
 */
export function createCollection<
  T extends Record<string, any> = Record<string, any>,
>(path: string): CollectionRef<T> {
  let itemsMap: Record<string, CollectionItem<T>> = {};
  let collectionSubscribers: Array<(items: Array<CollectionItem<T>>) => void> = [];
  const dbUnsubs: Unsubscribe[] = [];

  const root = getRoot();
  const ref = root.get(path);

  // ---- internal helpers ---------------------------------------------------

  function snapshot(): Array<CollectionItem<T>> {
    return Object.values(itemsMap);
  }

  function notify(): void {
    const items = snapshot();
    for (const cb of collectionSubscribers) {
      try { cb(items); } catch (e) { console.error('[createCollection]', e); }
    }
  }

  // ---- DB subscription ----------------------------------------------------

  dbUnsubs.push(
    ref.map().on((raw: any, key?: string) => {
      if (!key || key === '_') return;
      if (raw === null || raw === undefined) {
        const next = { ...itemsMap };
        delete next[key];
        itemsMap = next;
      } else {
        itemsMap = { ...itemsMap, [key]: { id: key, data: raw as T } };
      }
      notify();
    }),
  );

  // ---- Collection ref object ----------------------------------------------

  const collectionRef: CollectionRef<T> = {
    // ---- reactive accessors -----------------------------------------------

    get items(): Array<CollectionItem<T>> {
      return Object.values(itemsMap);
    },

    get size(): number {
      return Object.keys(itemsMap).length;
    },

    // ---- CRUD mutations ---------------------------------------------------

    add(itemData): string {
      const anyData = itemData as any;
      const id: string = anyData.id ?? crypto.randomUUID().slice(0, 12);
      const { id: _stripped, ...rest } = anyData;
      ref.get(id).put(rest);
      itemsMap = { ...itemsMap, [id]: { id, data: rest as T } };
      notify();
      return id;
    },

    update(id, data): void {
      const item = itemsMap[id];
      if (!item) return;
      const merged = { ...item.data, ...data } as T;
      ref.get(id).put(merged);
      itemsMap = { ...itemsMap, [id]: { id, data: merged } };
      notify();
    },

    remove(id): void {
      ref.get(id).put(null);
      const next = { ...itemsMap };
      delete next[id];
      itemsMap = next;
      notify();
    },

    get(id): CollectionItem<T> | undefined {
      return itemsMap[id];
    },

    // ---- reactive queries -------------------------------------------------

    query<R>(selector: (items: Array<CollectionItem<T>>) => R): CollectionQuery<R> {
      let current: R = selector(Object.values(itemsMap));
      let querySubscribers: Array<(v: R) => void> = [];

      const innerUnsub = collectionRef.subscribe(() => {
        current = selector(Object.values(itemsMap));
        for (const cb of querySubscribers) {
          try { cb(current); } catch (e) { console.error('[createCollection.query]', e); }
        }
      });

      const queryRef: CollectionQuery<R> = {
        get value(): R {
          return current;
        },

        subscribe(cb): Unsubscribe {
          querySubscribers.push(cb);
          cb(current);
          return () => {
            querySubscribers = querySubscribers.filter(s => s !== cb);
          };
        },

        destroy(): void {
          innerUnsub();
          querySubscribers = [];
        },
      };

      return queryRef;
    },

    // ---- Svelte store protocol (Svelte 4 compat) --------------------------

    subscribe(cb): Unsubscribe {
      collectionSubscribers.push(cb);
      cb(snapshot());
      return () => {
        collectionSubscribers = collectionSubscribers.filter(s => s !== cb);
      };
    },

    // ---- cleanup ----------------------------------------------------------

    destroy(): void {
      for (const u of dbUnsubs) u();
      dbUnsubs.length = 0;
      collectionSubscribers = [];
    },
  };

  return collectionRef;
}
