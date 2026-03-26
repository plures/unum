/**
 * Hyperswarm peer-sync adapter — real-time graph replication via Hyperswarm.
 *
 * This adapter wraps any existing `DbAdapter` and adds P2P synchronisation
 * on top using Hyperswarm connections.  Every `put` is broadcast to all
 * connected peers; incoming peer messages are applied to the local store.
 *
 * Hyperswarm is NOT bundled — install it yourself:
 *   npm install hyperswarm
 *
 * @example
 * ```ts
 * import Hyperswarm from 'hyperswarm';
 * import { createHash } from 'node:crypto';
 * import { initDb } from '@plures/unum';
 * import { createHyperswarmAdapter, createMemoryAdapter } from '@plures/unum/adapters';
 *
 * const swarm = new Hyperswarm();
 * const topic = createHash('sha256').update('my-graph-topic').digest();
 * swarm.join(topic);
 *
 * const inner = createMemoryAdapter();
 * initDb(createHyperswarmAdapter(swarm, inner));
 * ```
 */

import type { ChainNode, DataCallback, DbAdapter, Unsubscribe } from '../types.js';

// ---------------------------------------------------------------------------
// Internal wire-protocol types
// ---------------------------------------------------------------------------

/** Message sent between peers over a Hyperswarm connection. */
interface SyncMessage {
  type: 'put';
  /** Key segments representing the path in the tree (e.g. ['graph','nodes','n1']) */
  path: string[];
  /** The value written at that path — may be `null` for deletions */
  data: unknown;
}

/**
 * Minimal structural interface for a single Hyperswarm peer connection.
 */
export interface SwarmConnection {
  on(event: 'data', handler: (buf: unknown) => void): void;
  on(event: 'error', handler: () => void): void;
  on(event: 'close', handler: () => void): void;
  write(data: Uint8Array): void;
}

/**
 * Minimal structural interface for a Hyperswarm instance.
 * Matches the subset of the Hyperswarm API that unum requires.
 */
export interface HyperswarmLike {
  on(event: 'connection', handler: (conn: SwarmConnection) => void): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Hyperswarm-backed peer-sync adapter.
 *
 * The returned adapter delegates all reads/writes to `inner` and additionally:
 *   - broadcasts every `put` to all currently connected Hyperswarm peers, and
 *   - applies incoming peer messages to `inner` without re-broadcasting them.
 *
 * @param swarm - A Hyperswarm instance that has already joined a topic.
 * @param inner - The underlying `DbAdapter` used for local storage.
 *               Typically `createMemoryAdapter()` for in-process graphs or
 *               `createPluresDbAdapter(db)` when persisting locally.
 * @returns A `DbAdapter` that transparently syncs all writes to connected peers.
 */
export function createHyperswarmAdapter(swarm: HyperswarmLike, inner: DbAdapter): DbAdapter {
  /** Currently open peer connections. */
  const connections = new Set<SwarmConnection>();

  // ---- Peer connection handling -------------------------------------------

  swarm.on('connection', (conn: SwarmConnection) => {
    connections.add(conn);

    conn.on('data', (buf: unknown) => {
      let msg: SyncMessage;
      try {
        let text: string;
        if (typeof buf === 'string') {
          text = buf;
        } else {
          // Handles Uint8Array, Node.js Buffer (extends Uint8Array), and ArrayBuffer.
          // TextDecoder accepts any ArrayBufferView / ArrayBuffer, so this works
          // across Node.js, Deno, and browser environments without requiring
          // a Buffer.isBuffer() check or unreliable instanceof guards.
          text = new TextDecoder().decode(buf as ArrayBufferView);
        }
        msg = JSON.parse(text) as SyncMessage;
      } catch {
        return; // malformed message — ignore
      }

      if (msg.type !== 'put' || !Array.isArray(msg.path)) return;

      // Apply the remote write directly to the inner adapter.
      // Because we bypass wrapChain.put(), the broadcast interceptor is never
      // triggered, so there is no echo back to peers.
      let node = inner.root();
      for (const key of msg.path) {
        node = node.get(key);
      }
      node.put(msg.data);
    });

    conn.on('error', () => { /* swallow connection errors */ });
    conn.on('close', () => connections.delete(conn));
  });

  // ---- Internal helpers ---------------------------------------------------

  function broadcast(path: string[], data: unknown): void {
    if (connections.size === 0) return;
    const msg: SyncMessage = { type: 'put', path, data };
    let encoded: Uint8Array;
    try {
      encoded = new TextEncoder().encode(JSON.stringify(msg));
    } catch {
      return; // non-serialisable value — skip broadcast
    }
    for (const conn of connections) {
      try { conn.write(encoded); } catch { /* swallow */ }
    }
  }

  function wrapChain(path: string[], chainNode: ChainNode): ChainNode {
    return {
      get(key: string): ChainNode {
        return wrapChain([...path, key], chainNode.get(key));
      },

      put(data: unknown, cb?: DataCallback): ChainNode {
        broadcast(path, data);
        chainNode.put(data, cb);
        return this;
      },

      set(data: unknown, cb?: DataCallback): ChainNode {
        // Generate a cryptographically unique ID so the full broadcast path
        // is known before the inner adapter generates its own key.
        const id = crypto.randomUUID().slice(0, 12);
        const child = wrapChain([...path, id], chainNode.get(id));
        child.put(data, cb);
        return child;
      },

      on(cb: DataCallback): Unsubscribe {
        return chainNode.on(cb);
      },

      once(cb: DataCallback): void {
        chainNode.once(cb);
      },

      map(): ChainNode {
        // map() returns an iteration chain — wrap at the same level so any
        // put() calls it produces are still intercepted.
        return wrapChain(path, chainNode.map());
      },

      off(): void {
        chainNode.off();
      },
    };
  }

  // ---- DbAdapter implementation ------------------------------------------

  return {
    root(): ChainNode {
      return wrapChain([], inner.root());
    },

    destroy(): void {
      try { swarm.destroy(); } catch { /* swallow */ }
      inner.destroy?.();
      connections.clear();
    },
  };
}
