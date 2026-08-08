/**
 * pluresData() — reactive data bindings for Svelte.
 *
 * Works with Svelte 4 (stores) and Svelte 5 (subscribe protocol).
 * No polling. Pure subscription-based reactivity.
 */

import { getRoot } from './context.js';
import type { DataRef, Unsubscribe } from './types.js';

/**
 * Create a reactive binding to a PluresDB path.
 *
 * @param path - Collection/document path (e.g. 'todos', 'users/profile')
 * @param id   - Optional item ID for single-document binding
 * @returns A `DataRef<T>` with reactive `state`, `value`, `list()`, CRUD methods, `subscribe()`, and `destroy()`.
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
export function pluresData<T extends Record<string, unknown> = Record<string, unknown>>(
  path: string,
  id?: string | null,
): DataRef<T> {
  let state: Record<string, unknown> = {};
  let subs: Array<(s: T) => void> = [];
  const unsubs: Unsubscribe[] = [];
  let destroyed = false;

  const root = getRoot();
  const ref = root.get(path);

  function notify() {
    if (destroyed) return;
    const snapshot = state as unknown as T;
    for (const cb of subs) {
      if (destroyed) return;
      try { cb(snapshot); } catch (e) { console.error('[pluresData]', e); }
    }
  }

  if (id) {
    // Single item binding
    const u = ref.get(id).on((data: unknown) => {
      if (destroyed) return;
      if (data) {
        state = { ...(data as Record<string, unknown>) };
        notify();
      }
    });
    unsubs.push(u);
  } else {
    // Collection binding
    const u = ref.map().on((data: unknown, key?: string) => {
      if (destroyed) return;
      if (!key || key === '_') return;
      if (data === null || data === undefined) {
        const next = { ...state };
        delete next[key];
        state = next;
      } else {
        state = { ...state, [key]: { ...(data as Record<string, unknown>), id: key } };
      }
      notify();
    });
    unsubs.push(u);
  }

  const dataRef: DataRef<T> = {
    get state() { return state as unknown as T; },
    get value() { return id ? state as unknown as T : this.list(); },

    list() {
      return Object.values(state).filter(
        (v): v is T & { id: string } => v != null && typeof v === 'object',
      );
    },

    add(data: Omit<T, 'id'> & { id?: string }) {
      if (id) return;
      const itemData = data as Record<string, unknown>;
      const itemId = (itemData.id as string | undefined) ?? crypto.randomUUID().slice(0, 8);
      const { id: _strip, ...rest } = itemData;
      ref.get(itemId).put(rest);
      state = { ...state, [itemId]: { ...rest, id: itemId } };
      notify();
    },

    update(
      idOrUpdater: string | Partial<T> | ((item: T) => Partial<T>),
      updater?: Partial<T> | ((item: T) => Partial<T>),
    ) {
      if (id) {
        const updated = typeof idOrUpdater === 'function'
          ? idOrUpdater(state as unknown as T)
          : idOrUpdater as Partial<T>;
        ref.get(id).put(updated);
        state = { ...state, ...(updated as Record<string, unknown>) };
        notify();
      } else if (typeof idOrUpdater === 'string' && updater != null) {
        const item = state[idOrUpdater];
        if (!item) return;
        const updated = typeof updater === 'function'
          ? updater(item as unknown as T)
          : updater;
        ref.get(idOrUpdater).put(updated);
        state = { ...state, [idOrUpdater]: { ...(item as Record<string, unknown>), ...(updated as Record<string, unknown>) } };
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

    subscribe(cb: (s: T) => void): Unsubscribe {
      subs.push(cb);
      cb(state as unknown as T);
      return () => { subs = subs.filter(s => s !== cb); };
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
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
 * @returns An object with a `.value` getter and a `destroy()` cleanup method.
 *
 * @example
 * ```ts
 * const todos = pluresData('todos');
 * const pending = pluresDerived(todos, items => items.filter(i => !i.done));
 * console.log(pending.value);
 * pending.destroy();
 * ```
 */
export function pluresDerived<T>(
  source: DataRef,
  transform: (items: Array<Record<string, unknown> & { id: string }>) => T[],
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
 * @returns An object with a reactive `value` getter/setter and a `destroy()` cleanup method.
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
  let _value: unknown = (source.state as Record<string, unknown>)[field] ?? '';
  const unsub = source.subscribe((state) => {
    _value = (state as Record<string, unknown>)[field] ?? '';
  });
  return {
    get value() { return _value; },
    set value(v: unknown) {
      _value = v;
      source.update({ [field]: v } as Parameters<typeof source.update>[0]);
    },
    destroy() { unsub(); },
  };
}
