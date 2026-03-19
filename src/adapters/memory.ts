/**
 * In-memory adapter — useful for testing and SSR.
 * No external dependencies.
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

interface MemNode {
  data: any;
  children: Map<string, MemNode>;
  listeners: Set<DataCallback>;
  mapListeners: Set<DataCallback>;
}

function createMemNode(): MemNode {
  return { data: undefined, children: new Map(), listeners: new Set(), mapListeners: new Set() };
}

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

      put(data: any, cb?: DataCallback) {
        const node = resolve(root, path);
        node.data = data;
        const key = path[path.length - 1];
        notify(node, key);
        // notify parent map listeners
        if (path.length > 0) {
          const parent = resolve(root, path.slice(0, -1));
          for (const mcb of parent.mapListeners) {
            try { mcb(data, key); } catch (e) { console.error('[unum/memory]', e); }
          }
        }
        cb?.(data, key);
        return this;
      },

      set(data: any, cb?: DataCallback) {
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
