/**
 * pluresData() — reactive data bindings for Svelte.
 *
 * Works with Svelte 4 (stores) and Svelte 5 (subscribe protocol).
 * No polling. Pure subscription-based reactivity.
 */

import { getRoot } from './context.js';
import type { DataRef, DataCallback, Unsubscribe } from './types.js';

/**
 * Create a reactive binding to a PluresDB path.
 *
 * @param path - Collection/document path (e.g. 'todos', 'users/profile')
 * @param id   - Optional item ID for single-document binding
 *
 * @example
 * ```svelte
 * <script>
 *   import { pluresData } from '@plures/unum';
 *   const todos = pluresData('todos');
 * </script>
 *
 * {#each todos.list() as todo}
 *   <p>{todo.text}</p>
 * {/each}
 * ```
 */
export function pluresData<T extends Record<string, any> = Record<string, any>>(
  path: string,
  id?: string | null,
): DataRef<T> {
  let state: Record<string, any> = {};
  let subs: Array<(s: any) => void> = [];
  const unsubs: Unsubscribe[] = [];

  const root = getRoot();
  const ref = root.get(path);

  function notify() {
    for (const cb of subs) {
      try { cb(state); } catch (e) { console.error('[pluresData]', e); }
    }
  }

  if (id) {
    // Single item binding
    const u = ref.get(id).on((data: any) => {
      if (data) {
        state = { ...data };
        notify();
      }
    });
    unsubs.push(u);
  } else {
    // Collection binding
    const u = ref.map().on((data: any, key?: string) => {
      if (!key || key === '_') return;
      if (data === null || data === undefined) {
        const next = { ...state };
        delete next[key];
        state = next;
      } else {
        state = { ...state, [key]: { ...data, id: key } };
      }
      notify();
    });
    unsubs.push(u);
  }

  const dataRef: DataRef<T> = {
    get state() { return state as T; },
    get value() { return id ? state : this.list(); },

    list() {
      return Object.values(state).filter(
        (v): v is T & { id: string } => v != null && typeof v === 'object',
      );
    },

    add(data: any) {
      if (id) return;
      const itemId = data.id ?? crypto.randomUUID().slice(0, 8);
      const { id: _strip, ...rest } = data;
      ref.get(itemId).put(rest);
      state = { ...state, [itemId]: { ...rest, id: itemId } };
      notify();
    },

    update(idOrUpdater: any, updater?: any) {
      if (id) {
        const updated = typeof idOrUpdater === 'function' ? idOrUpdater(state) : idOrUpdater;
        ref.get(id).put(updated);
        state = { ...state, ...updated };
        notify();
      } else if (typeof idOrUpdater === 'string' && updater != null) {
        const item = state[idOrUpdater];
        if (!item) return;
        const updated = typeof updater === 'function' ? updater(item) : updater;
        ref.get(idOrUpdater).put(updated);
        state = { ...state, [idOrUpdater]: { ...item, ...updated } };
        notify();
      }
    },

    remove(itemId?: string) {
      if (id) {
        ref.get(id).put(null);
        state = {};
      } else if (itemId) {
        ref.get(itemId).put(null);
        const next = { ...state };
        delete next[itemId];
        state = next;
      }
      notify();
    },

    subscribe(cb: (s: any) => void): Unsubscribe {
      subs.push(cb);
      cb(state);
      return () => { subs = subs.filter(s => s !== cb); };
    },

    destroy() {
      for (const u of unsubs) u();
      unsubs.length = 0;
      subs = [];
    },
  };

  return dataRef;
}

/**
 * Create a derived view from an existing `DataRef`.
 *
 * Re-evaluates `transform` each time the source changes.  The result is
 * exposed as a plain `.value` getter — no polling, no extra subscriptions.
 *
 * @param source    - A `DataRef` returned by `pluresData()`.
 * @param transform - Pure function that maps the source item list to a new array.
 *
 * @example
 * ```ts
 * const todos = pluresData('todos');
 * const pending = pluresDerived(todos, items => items.filter(i => !i.done));
 * console.log(pending.value);
 * pending.destroy();
 * ```
 */
export function pluresDerived<T = any>(
  source: DataRef,
  transform: (items: any[]) => T[],
): { readonly value: T[]; destroy(): void } {
  let derived: T[] = [];
  const unsub = source.subscribe(() => {
    derived = transform(source.list());
  });
  return {
    get value() { return derived; },
    destroy() { unsub(); },
  };
}

/**
 * Create a two-way binding helper for a single field in a `DataRef`.
 *
 * The returned object exposes a `value` getter/setter that reads from and
 * writes to the underlying `DataRef`.  Designed for use with Svelte 5's
 * `bind:value` on native inputs.
 *
 * @param source - A `DataRef` returned by `pluresData()`.
 * @param field  - The key on the data object to bind (e.g. `'name'`).
 *
 * @example
 * ```svelte
 * <script>
 *   import { pluresData, pluresBind } from '@plures/unum';
 *   const profile = pluresData('profile', 'me');
 *   const name = pluresBind(profile, 'name');
 * </script>
 * <input bind:value={name.value} />
 * ```
 */
export function pluresBind(source: DataRef, field: string) {
  let _value = source.state?.[field] ?? '';
  const unsub = source.subscribe((state) => {
    _value = state?.[field] ?? '';
  });
  return {
    get value() { return _value; },
    set value(v: any) {
      _value = v;
      source.update({ [field]: v });
    },
    destroy() { unsub(); },
  };
}
