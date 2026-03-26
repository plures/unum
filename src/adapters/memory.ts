/**
 * In-memory adapter — useful for testing and SSR.
 * No external dependencies.
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

interface MemNode {
  data: unknown;
  children: Map<string, MemNode>;
  listeners: Set<DataCallback>;
  mapListeners: Set<DataCallback>;
}

function createMemNode(): MemNode {
  return { data: undefined, children: new Map(), listeners: new Set(), mapListeners: new Set() };
}

/**
 * Create a fully in-memory `DbAdapter`.
 *
 * The in-memory adapter stores all data in plain JavaScript `Map`s and
 * `Set`s.  It supports the full `ChainNode` API (`get`, `put`, `set`, `on`,
 * `once`, `map`, `off`) and fires listeners synchronously on every write.
 *
 * **Use cases**
 * - Unit tests — no real database needed.
 * - Server-side rendering — safe to use in Node.js / Deno without persistence.
 * - The `inner` adapter for `createHyperswarmAdapter()`.
 *
 * @returns A new `DbAdapter` backed entirely by in-memory data structures.
 *
 * @example
 * ```ts
 * import { initDb, createMemoryAdapter } from '@plures/unum';
 *
 * initDb(createMemoryAdapter());
 * ```
 */
export function createMemoryAdapter(): DbAdapter {
  const root = createMemNode();

  function resolve(node: MemNode, path: string[]): MemNode {
    let cur = node;
    for (const key of path) {
      if (!cur.children.has(key)) cur.children.set(key, createMemNode());
      cur = cur.children.get(key)!;
    }
    return cur;
  }

  function notify(node: MemNode, key?: string) {
    for (const cb of node.listeners) {
      try { cb(node.data, key); } catch (e) { console.error('[unum/memory]', e); }
    }
  }

  function notifyMap(parent: MemNode) {
    for (const [key, child] of parent.children) {
      for (const cb of parent.mapListeners) {
        try { cb(child.data, key); } catch (e) { console.error('[unum/memory]', e); }
      }
    }
  }

  function makeChain(path: string[], isMap = false): ChainNode {
    return {
      get(key: string) { return makeChain([...path, key]); },

      put(data: unknown, cb?: DataCallback) {
        const node = resolve(root, path);
        node.data = data;
        const key = path[path.length - 1];
        notify(node, key);
        // Bubble up: notify map listeners and listeners on all ancestors.
        // This ensures root.on() sees every write, no matter how deep.
        for (let i = path.length - 1; i >= 0; i--) {
          const ancestorPath = path.slice(0, i);
          const ancestor = resolve(root, ancestorPath);
          const childKey = path[i];
          for (const mcb of ancestor.mapListeners) {
            try { mcb(data, childKey); } catch (e) { console.error('[unum/memory]', e); }
          }
          // Also notify direct listeners on ancestors with the full path as key
          // so root.on() receives (data, 'sprint/current') for deep writes.
          if (ancestor !== node) {
            const fullKey = path.join('/');
            for (const lcb of ancestor.listeners) {
              try { lcb(data, fullKey); } catch (e) { console.error('[unum/memory]', e); }
            }
          }
        }
        cb?.(data, key);
        return this;
      },

      set(data: unknown, cb?: DataCallback) {
        const id = Math.random().toString(36).slice(2, 10);
        makeChain([...path, id]).put(data, cb);
        return makeChain([...path, id]);
      },

      on(cb: DataCallback): Unsubscribe {
        const node = resolve(root, path);
        if (isMap) {
          node.mapListeners.add(cb);
          // Fire for existing children
          for (const [key, child] of node.children) {
            try { cb(child.data, key); } catch (e) { console.error('[unum/memory]', e); }
          }
          return () => { node.mapListeners.delete(cb); };
        }
        node.listeners.add(cb);
        if (node.data !== undefined) {
          try { cb(node.data, path[path.length - 1]); } catch (e) { console.error('[unum/memory]', e); }
        }
        return () => { node.listeners.delete(cb); };
      },

      once(cb: DataCallback) {
        const node = resolve(root, path);
        cb(node.data, path[path.length - 1]);
      },

      map() { return makeChain(path, true); },

      off() {
        const node = resolve(root, path);
        node.listeners.clear();
        node.mapListeners.clear();
      },
    };
  }

  return {
    root() { return makeChain([]); },
    destroy() {
      root.children.clear();
      root.listeners.clear();
      root.mapListeners.clear();
    },
  };
}
