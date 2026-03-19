/**
 * unum - Svelte 5 Runes API for PluresDB / DbAdapter
 *
 * This module provides a seamless binding between a `DbAdapter`-backed
 * database and Svelte 5 components using the Runes reactivity system.
 *
 * Key changes from the old `runes.js`:
 * - Uses the `DbAdapter` interface instead of a Gun.js instance directly.
 * - `pluresDerived` replaces the 100 ms `setInterval` poll with real
 *   subscription-based reactivity via the source's `subscribe` method.
 * - `pluresBind` likewise uses subscriptions, not polling.
 * - Accepts an optional `adapter` argument so callers can inject a custom
 *   backend without relying on the global context store.
 * - Fully typed with TypeScript.
 */
import { db as globalAdapterStore } from './DbContext.js';
import type {
  DbAdapter,
  DbNode,
  DbUnsubscribe,
  PluresDataResult,
  PluresDerivedResult,
  PluresBindResult,
} from './types.js';

// ---------------------------------------------------------------------------
// pluresData
// ---------------------------------------------------------------------------

/**
 * Creates a reactive connection to a database path via the active DbAdapter.
 *
 * @param path     — Top-level path in the database (e.g. `'todos'`).
 * @param id       — Optional item ID to narrow to a single record.
 * @param adapter  — Optional adapter override; falls back to the global one
 *                   set via `initializePlures()`.
 *
 * @example
 * ```svelte
 * <script>
 *   import { pluresData } from '@plures/unum';
 *   const todos = pluresData('todos');
 * </script>
 * {#each todos.list() as item}
 *   <li>{item.text}</li>
 * {/each}
 * ```
 */
export function pluresData<T extends Record<string, unknown> = Record<string, unknown>>(
  path: string,
  id: string | null = null,
  adapter?: DbAdapter,
): PluresDataResult<T> {
  let state: Record<string, unknown> = {};
  let listeners: Array<(state: Record<string, unknown>) => void> = [];
  let dbAdapter: DbAdapter | null = adapter ?? null;
  let dbUnsubscribe: DbUnsubscribe | null = null;

  // Notify all listeners when state changes.
  function notifyListeners(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  // Set up subscriptions against the current adapter.
  function setupSubscription(currentAdapter: DbAdapter): void {
    // Tear down any previous subscription first.
    if (dbUnsubscribe) {
      dbUnsubscribe();
      dbUnsubscribe = null;
    }

    dbAdapter = currentAdapter;

    let ref: DbNode = currentAdapter.get(path);

    if (id) {
      // Single-item reference.
      ref = ref.get(id);
      const result = ref.on((data) => {
        if (data) {
          state = { ...(data as Record<string, unknown>) };
          notifyListeners();
        }
      });
      dbUnsubscribe = () => {
        ref.off();
        if (typeof result === 'function') result();
      };
    } else {
      // Collection reference — subscribe to every child node.
      const mapRef = ref.map();
      const result = mapRef.on((data, key) => {
        if (key === '_') return; // skip internal metadata

        if (data === null) {
          const next = { ...state };
          delete next[key as string];
          state = next;
          notifyListeners();
        } else {
          state = {
            ...state,
            [key as string]: {
              ...(data as Record<string, unknown>),
              id: key,
            },
          };
          notifyListeners();
        }
      });
      dbUnsubscribe = () => {
        mapRef.off();
        if (typeof result === 'function') result();
      };
    }
  }

  // Either use the injected adapter immediately, or subscribe to the global
  // adapter store so we react when the user later calls initializePlures().
  let storeUnsubscribe: DbUnsubscribe | null = null;

  if (adapter) {
    setupSubscription(adapter);
  } else {
    storeUnsubscribe = globalAdapterStore.subscribe((currentAdapter) => {
      if (!currentAdapter) return;
      setupSubscription(currentAdapter);
    });
  }

  // -------------------------------------------------------------------------
  // Collection helpers
  // -------------------------------------------------------------------------

  function list(): Array<T & { id: string }> {
    if (id) return [];
    return Object.values(state)
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => ({ ...(item as T), id: (item.id as string) ?? '' }));
  }

  function add(data: Partial<T> & { id?: string }): void {
    if (!dbAdapter || id) return;
    const itemId = data.id ?? Date.now().toString();
    const newItem = { ...data };
    delete (newItem as { id?: string }).id;
    dbAdapter.get(path).get(itemId).put(newItem);
    state = { ...state, [itemId]: { ...newItem, id: itemId } };
    notifyListeners();
  }

  function update(
    itemIdOrUpdater: string | Partial<T> | ((current: T) => Partial<T>),
    updater?: Partial<T> | ((current: T) => Partial<T>),
  ): void {
    if (!dbAdapter) return;

    if (id) {
      // Single-item reference: first arg is the updater.
      const fn = itemIdOrUpdater as Partial<T> | ((current: T) => Partial<T>);
      const updated = typeof fn === 'function' ? fn(state as T) : fn;
      dbAdapter.get(path).get(id).put(updated);
      state = { ...state, ...updated };
      notifyListeners();
    } else {
      // Collection: first arg is the item ID.
      const itemId = itemIdOrUpdater as string;
      const item = state[itemId];
      if (!item || !updater) return;
      const updated = typeof updater === 'function' ? updater(item as T) : updater;
      dbAdapter.get(path).get(itemId).put(updated);
      state = { ...state, [itemId]: { ...(item as Record<string, unknown>), ...updated } };
      notifyListeners();
    }
  }

  function remove(itemId: string | null = null): void {
    if (!dbAdapter) return;

    if (id) {
      dbAdapter.get(path).get(id).put(null);
      state = {};
      notifyListeners();
    } else if (itemId) {
      dbAdapter.get(path).get(itemId).put(null);
      const next = { ...state };
      delete next[itemId];
      state = next;
      notifyListeners();
    }
  }

  function subscribe(callback: (state: T) => void): DbUnsubscribe {
    listeners.push(callback as (state: Record<string, unknown>) => void);
    callback(state as T);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  function destroy(): void {
    if (dbUnsubscribe) {
      dbUnsubscribe();
      dbUnsubscribe = null;
    }
    if (storeUnsubscribe) {
      storeUnsubscribe();
      storeUnsubscribe = null;
    }
    listeners = [];
  }

  return {
    get state() { return state as T; },
    get value() { return (id ? state : list()) as PluresDataResult<T>['value']; },
    list,
    add,
    update,
    remove,
    subscribe,
    destroy,
  };
}

// ---------------------------------------------------------------------------
// pluresDerived
// ---------------------------------------------------------------------------

/**
 * Creates a derived value from a `pluresData` source.
 *
 * Unlike the old implementation, this uses the source's `subscribe` method
 * for real reactivity — no `setInterval` polling.
 *
 * @example
 * ```svelte
 * <script>
 *   import { pluresData, pluresDerived } from '@plures/unum';
 *   const todos = pluresData('todos');
 *   const done  = pluresDerived(todos, items => items.filter(i => i.completed));
 * </script>
 * {#each done.value as item}{item.text}{/each}
 * ```
 */
export function pluresDerived<T, R>(
  source: PluresDataResult<T>,
  transformer: (items: Array<T & { id: string }>) => R,
): PluresDerivedResult<R> {
  let derived: R = transformer(source.list());
  let listeners: Array<(value: R) => void> = [];

  // Subscribe to source changes — updates derived value reactively.
  const unsubSource = source.subscribe(() => {
    derived = transformer(source.list());
    for (const l of listeners) l(derived);
  });

  function subscribe(callback: (value: R) => void): DbUnsubscribe {
    listeners.push(callback);
    callback(derived);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  function destroy(): void {
    unsubSource();
    listeners = [];
  }

  return {
    get value() { return derived; },
    subscribe,
    destroy,
  };
}

// ---------------------------------------------------------------------------
// pluresBind
// ---------------------------------------------------------------------------

/**
 * Creates a two-way binding between a form input and a single field of a
 * `pluresData` result.
 *
 * Unlike the old implementation, this uses the source's `subscribe` method
 * instead of `setInterval` polling.
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
export function pluresBind<T extends Record<string, unknown> = Record<string, unknown>>(
  source: PluresDataResult<T>,
  field: string,
): PluresBindResult {
  let fieldValue: unknown = (source.state as Record<string, unknown>)[field] ?? '';

  const unsubSource = source.subscribe((currentState) => {
    fieldValue = (currentState as Record<string, unknown>)[field] ?? '';
  });

  return {
    get value() { return fieldValue; },
    set value(newValue: unknown) {
      fieldValue = newValue;
      source.update({ [field]: newValue } as Partial<T>);
    },
    destroy() {
      unsubSource();
    },
  };
}

// ---------------------------------------------------------------------------
// Legacy exports (backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use `pluresData` instead. */
export const gunData = pluresData;
/** @deprecated Use `pluresDerived` instead. */
export const gunDerived = pluresDerived;
/** @deprecated Use `pluresBind` instead. */
export const gunBind = pluresBind;
