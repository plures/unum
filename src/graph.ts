/**
 * useGraph() — Svelte 5 runes-compatible reactive graph bindings for PluresDB.
 *
 * Works with Svelte 4 (store protocol) and Svelte 5 ($derived / $effect).
 * No polling — pure subscription-based reactivity.
 *
 * Storage layout inside PluresDB:
 *   {path}/nodes/{nodeId}  = { ...nodeData }
 *   {path}/edges/{edgeId}  = { source, target, ...edgeData }
 */

import { getRoot } from './context.js';
import type {
  GraphEdge,
  GraphNode,
  GraphQuery,
  GraphRef,
  GraphState,
  Unsubscribe,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse raw DB data into a GraphNode */
function toNode<N>(id: string, raw: unknown): GraphNode<N> {
  return { id, data: raw as N };
}

/**
 * Parse raw DB data into a GraphEdge.
 * `source` and `target` are reserved top-level fields; everything else
 * is treated as edge application data.
 */
function toEdge<E>(id: string, raw: unknown): GraphEdge<E> {
  const { source, target, ...rest } = raw as Record<string, unknown>;
  return { id, source: source as string, target: target as string, data: rest as E };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a reactive graph binding backed by PluresDB.
 *
 * @param path - Base path in the DB (e.g. `'my-graph'`).
 *
 * ## Svelte 5 runes usage
 * ```svelte
 * <script>
 *   import { useGraph } from '@plures/unum';
 *
 *   const graph = useGraph<{ label: string }, { weight: number }>('my-graph');
 *
 *   // Reactive derived query
 *   const heavy = graph.query((nodes, edges) =>
 *     edges.filter(e => e.data.weight > 10)
 *   );
 *
 *   // Side-effect subscription managed by $effect
 *   $effect(() => {
 *     return graph.subscribe(state => {
 *       console.log('nodes changed', state.nodes);
 *     });
 *   });
 * </script>
 *
 * {#each graph.nodes as node}
 *   <p>{node.data.label}</p>
 * {/each}
 * ```
 *
 * ## Svelte 4 store usage
 * ```svelte
 * <script>
 *   import { useGraph } from '@plures/unum';
 *   const graph = useGraph('my-graph');
 *   const nodes = graph.query(nodes => nodes);
 * </script>
 * {#each $nodes.value as node}…{/each}
 * ```
 */
export function useGraph<
  N extends Record<string, any> = Record<string, unknown>,
  E extends Record<string, any> = Record<string, unknown>,
>(path: string): GraphRef<N, E> {
  let nodesMap: Record<string, GraphNode<N>> = {};
  let edgesMap: Record<string, GraphEdge<E>> = {};
  let graphSubscribers: Array<(state: GraphState<N, E>) => void> = [];
  const dbUnsubs: Unsubscribe[] = [];

  const root = getRoot();
  const nodesRef = root.get(path).get('nodes');
  const edgesRef = root.get(path).get('edges');

  // ---- internal helpers --------------------------------------------------

  function snapshot(): GraphState<N, E> {
    return { nodes: nodesMap, edges: edgesMap };
  }

  function notifyGraph(): void {
    const state = snapshot();
    for (const cb of graphSubscribers) {
      try { cb(state); } catch (e) { console.error('[useGraph]', e); }
    }
  }

  // ---- DB subscriptions --------------------------------------------------

  dbUnsubs.push(
    nodesRef.map().on((raw: unknown, key?: string) => {
      if (!key || key === '_') return;
      if (raw === null || raw === undefined) {
        const next = { ...nodesMap };
        delete next[key];
        nodesMap = next;
      } else {
        nodesMap = { ...nodesMap, [key]: toNode<N>(key, raw) };
      }
      notifyGraph();
    }),
  );

  dbUnsubs.push(
    edgesRef.map().on((raw: unknown, key?: string) => {
      if (!key || key === '_') return;
      if (raw === null || raw === undefined) {
        const next = { ...edgesMap };
        delete next[key];
        edgesMap = next;
      } else {
        edgesMap = { ...edgesMap, [key]: toEdge<E>(key, raw) };
      }
      notifyGraph();
    }),
  );

  // ---- Graph ref object --------------------------------------------------

  const graphRef: GraphRef<N, E> = {
    // ---- reactive accessors ----------------------------------------------

    get nodes(): Array<GraphNode<N>> {
      return Object.values(nodesMap);
    },

    get edges(): Array<GraphEdge<E>> {
      return Object.values(edgesMap);
    },

    get state(): GraphState<N, E> {
      return snapshot();
    },

    // ---- node mutations --------------------------------------------------

    addNode(nodeData): string {
      const anyData = nodeData as Record<string, unknown>;
      const id: string = (anyData.id as string | undefined) ?? crypto.randomUUID().slice(0, 12);
      const { id: _stripped, ...rest } = anyData;
      nodesRef.get(id).put(rest);
      nodesMap = { ...nodesMap, [id]: toNode<N>(id, rest) };
      notifyGraph();
      return id;
    },

    updateNode(id, data): void {
      const node = nodesMap[id];
      if (!node) return;
      const merged = { ...node.data, ...data } as N;
      nodesRef.get(id).put(merged);
      nodesMap = { ...nodesMap, [id]: { id, data: merged } };
      notifyGraph();
    },

    removeNode(id): void {
      // Remove incident edges too
      const incident = Object.values(edgesMap).filter(
        e => e.source === id || e.target === id,
      );
      for (const edge of incident) {
        edgesRef.get(edge.id).put(null);
        const next = { ...edgesMap };
        delete next[edge.id];
        edgesMap = next;
      }
      nodesRef.get(id).put(null);
      const next = { ...nodesMap };
      delete next[id];
      nodesMap = next;
      notifyGraph();
    },

    // ---- edge mutations --------------------------------------------------

    addEdge(source, target, data): string {
      const id = crypto.randomUUID().slice(0, 12);
      const raw = { source, target, ...(data ?? {}) };
      edgesRef.get(id).put(raw);
      edgesMap = { ...edgesMap, [id]: toEdge<E>(id, raw) };
      notifyGraph();
      return id;
    },

    updateEdge(id, data): void {
      const edge = edgesMap[id];
      if (!edge) return;
      const mergedData = { ...edge.data, ...data } as E;
      const raw = { source: edge.source, target: edge.target, ...mergedData };
      edgesRef.get(id).put(raw);
      edgesMap = { ...edgesMap, [id]: { ...edge, data: mergedData } };
      notifyGraph();
    },

    removeEdge(id): void {
      edgesRef.get(id).put(null);
      const next = { ...edgesMap };
      delete next[id];
      edgesMap = next;
      notifyGraph();
    },

    // ---- reactive queries ------------------------------------------------

    query<T>(
      selector: (nodes: Array<GraphNode<N>>, edges: Array<GraphEdge<E>>) => T,
    ): GraphQuery<T> {
      let current: T = selector(
        Object.values(nodesMap),
        Object.values(edgesMap),
      );
      let querySubscribers: Array<(v: T) => void> = [];

      const innerUnsub = graphRef.subscribe(() => {
        current = selector(Object.values(nodesMap), Object.values(edgesMap));
        for (const cb of querySubscribers) {
          try { cb(current); } catch (e) { console.error('[useGraph.query]', e); }
        }
      });

      const queryRef: GraphQuery<T> = {
        get value(): T {
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

    // ---- path finding ----------------------------------------------------

    findPath(fromId, toId): Array<GraphNode<N>> {
      if (fromId === toId) {
        const node = nodesMap[fromId];
        return node ? [node] : [];
      }

      const visited = new Set<string>();
      const queue: Array<{ id: string; path: Array<GraphNode<N>> }> = [];

      const start = nodesMap[fromId];
      if (!start) return [];

      queue.push({ id: fromId, path: [start] });
      visited.add(fromId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const outgoing = Object.values(edgesMap).filter(
          e => e.source === current.id,
        );

        for (const edge of outgoing) {
          if (visited.has(edge.target)) continue;
          const targetNode = nodesMap[edge.target];
          if (!targetNode) continue;

          const newPath = [...current.path, targetNode];
          if (edge.target === toId) return newPath;

          visited.add(edge.target);
          queue.push({ id: edge.target, path: newPath });
        }
      }

      return [];
    },

    // ---- Svelte store protocol (Svelte 4 compat) -------------------------

    subscribe(cb): Unsubscribe {
      graphSubscribers.push(cb);
      cb(snapshot());
      return () => {
        graphSubscribers = graphSubscribers.filter(s => s !== cb);
      };
    },

    // ---- cleanup ---------------------------------------------------------

    destroy(): void {
      for (const u of dbUnsubs) u();
      dbUnsubs.length = 0;
      graphSubscribers = [];
    },
  };

  return graphRef;
}
