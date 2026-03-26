/**
 * unum — Reactive Svelte bindings for PluresDB
 *
 * Core types for the database adapter interface.
 */

/** Callback for data subscriptions */
export type DataCallback = (data: unknown, key?: string) => void;

// ---------------------------------------------------------------------------
// Graph types
// ---------------------------------------------------------------------------

/**
 * A node in the graph.
 * `T` is the shape of the application data stored on the node.
 */
export interface GraphNode<T = Record<string, unknown>> {
  /** Unique identifier for this node */
  id: string;
  /** Application data stored on this node */
  data: T;
}

/**
 * A directed edge in the graph.
 * `T` is the shape of the application data stored on the edge.
 */
export interface GraphEdge<T = Record<string, unknown>> {
  /** Unique identifier for this edge */
  id: string;
  /** ID of the source node */
  source: string;
  /** ID of the target node */
  target: string;
  /** Application data stored on this edge */
  data: T;
}

/**
 * Complete snapshot of the graph — used as the value emitted by subscribe().
 */
export interface GraphState<
  N = Record<string, unknown>,
  E = Record<string, unknown>,
> {
  /** Map of node ID → GraphNode */
  nodes: Record<string, GraphNode<N>>;
  /** Map of edge ID → GraphEdge */
  edges: Record<string, GraphEdge<E>>;
}

/**
 * Reactive graph query result.
 *
 * Implements the Svelte store protocol so it can be consumed directly with
 * the `$store` auto-subscription syntax in Svelte 4, or wrapped in a
 * `$derived` expression in Svelte 5.
 *
 * @example
 * ```svelte
 * <script>
 *   const graph = useGraph('my-graph');
 *   const activeNodes = graph.query((nodes) => nodes.filter(n => n.data.active));
 *   // Svelte 4: use $activeNodes
 *   // Svelte 5: $derived(activeNodes.value)
 * </script>
 * ```
 */
export interface GraphQuery<T> {
  /** Current computed value */
  readonly value: T;
  /** Svelte store protocol */
  subscribe(cb: (value: T) => void): Unsubscribe;
  /** Remove this query's internal subscription and release memory */
  destroy(): void;
}

/**
 * Reactive graph reference returned by `useGraph()`.
 *
 * Implements the Svelte 4 store protocol (`.subscribe()`) for backward
 * compatibility, and exposes getter-based properties that work naturally
 * with Svelte 5 `$derived` expressions.
 *
 * @example
 * ```svelte
 * <!-- Svelte 5 runes usage -->
 * <script>
 *   import { useGraph } from '@plures/unum';
 *
 *   const graph = useGraph<{ label: string }, { weight: number }>('my-graph');
 *
 *   // Reactive query — re-evaluates whenever the graph changes
 *   const heavy = graph.query((nodes, edges) =>
 *     edges.filter(e => e.data.weight > 10)
 *   );
 *
 *   // $effect for side-effect subscriptions
 *   $effect(() => {
 *     return graph.subscribe(state => {
 *       console.log('Graph updated', state);
 *     });
 *   });
 * </script>
 * ```
 */
export interface GraphRef<
  N = Record<string, unknown>,
  E = Record<string, unknown>,
> {
  // ---- Reactive accessors (work with $derived in Svelte 5) ---------------

  /** Current nodes as a flat array */
  readonly nodes: Array<GraphNode<N>>;
  /** Current edges as a flat array */
  readonly edges: Array<GraphEdge<E>>;
  /** Full graph state snapshot */
  readonly state: GraphState<N, E>;

  // ---- Node mutations ----------------------------------------------------

  /** Add a node; returns the generated/provided ID */
  addNode(data: N & { id?: string }): string;
  /** Merge `data` into an existing node's data */
  updateNode(id: string, data: Partial<N>): void;
  /** Remove a node and all its incident edges */
  removeNode(id: string): void;

  // ---- Edge mutations ----------------------------------------------------

  /** Add a directed edge from `source` to `target`; returns the generated ID */
  addEdge(source: string, target: string, data?: Partial<E>): string;
  /** Merge `data` into an existing edge's data */
  updateEdge(id: string, data: Partial<E>): void;
  /** Remove an edge */
  removeEdge(id: string): void;

  // ---- Reactive queries --------------------------------------------------

  /**
   * Create a derived reactive query.
   *
   * The selector is re-evaluated every time the graph changes and the result
   * is made available via `.value` and the store `.subscribe()` protocol.
   *
   * Designed for use with Svelte 5's `$derived`:
   * ```ts
   * const activeNodes = graph.query(nodes => nodes.filter(n => n.data.active));
   * // In Svelte 5: $derived(activeNodes.value)
   * // In Svelte 4: $activeNodes
   * ```
   */
  query<T>(
    selector: (nodes: Array<GraphNode<N>>, edges: Array<GraphEdge<E>>) => T,
  ): GraphQuery<T>;

  /**
   * Find the shortest path between two nodes using breadth-first search.
   * Returns an ordered array of nodes from `fromId` to `toId`, or an empty
   * array if no path exists.
   */
  findPath(fromId: string, toId: string): Array<GraphNode<N>>;

  // ---- Svelte store protocol (Svelte 4 backward compat) ------------------

  /** Subscribe to full graph state changes — Svelte 4 store protocol */
  subscribe(cb: (state: GraphState<N, E>) => void): Unsubscribe;

  /** Tear down all DB subscriptions and release memory */
  destroy(): void;
}

/** Unsubscribe function returned by on() */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Collection types
// ---------------------------------------------------------------------------

/**
 * A single item in a typed collection.
 * `T` is the shape of the application data stored on the item.
 */
export interface CollectionItem<T = Record<string, unknown>> {
  /** Unique identifier for this item */
  id: string;
  /** Application data stored on this item */
  data: T;
}

/**
 * Reactive collection query result.
 *
 * Implements the Svelte store protocol so it can be consumed with
 * the `$store` auto-subscription syntax in Svelte 4, or wrapped in
 * `$derived` in Svelte 5.
 *
 * @example
 * ```svelte
 * <script>
 *   const col = createCollection<Task>('tasks');
 *   const pending = col.query(items => items.filter(i => !i.data.done));
 *   // Svelte 5: $derived(pending.value)
 *   // Svelte 4: $pending
 * </script>
 * ```
 */
export interface CollectionQuery<T> {
  /** Current computed value */
  readonly value: T;
  /** Svelte store protocol */
  subscribe(cb: (value: T) => void): Unsubscribe;
  /** Remove this query's internal subscription and release memory */
  destroy(): void;
}

/**
 * Reactive collection reference returned by `createCollection()`.
 *
 * Implements the Svelte 4 store protocol (`.subscribe()`) for backward
 * compatibility, and exposes getter-based properties that work naturally
 * with Svelte 5 `$derived` expressions.
 *
 * @example
 * ```svelte
 * <!-- Svelte 5 runes usage -->
 * <script>
 *   import { createCollection } from '@plures/unum';
 *
 *   interface Task { title: string; done: boolean }
 *   const tasks = createCollection<Task>('tasks');
 *
 *   const pending = tasks.query(items => items.filter(i => !i.data.done));
 *
 *   $effect(() => tasks.subscribe(items => console.log('changed', items)));
 * </script>
 *
 * {#each tasks.items as task}
 *   <p>{task.data.title}</p>
 * {/each}
 * ```
 */
export interface CollectionRef<T = Record<string, unknown>> {
  // ---- Reactive accessors (work with $derived in Svelte 5) ---------------

  /** Current items as a flat array */
  readonly items: Array<CollectionItem<T>>;
  /** Number of items in the collection */
  readonly size: number;

  // ---- CRUD mutations -----------------------------------------------------

  /** Add an item; accepts an optional `id` field. Returns the generated/provided ID */
  add(data: Omit<T, 'id'> & { id?: string }): string;
  /** Merge `data` into an existing item */
  update(id: string, data: Partial<Omit<T, 'id'>>): void;
  /** Remove an item by ID */
  remove(id: string): void;
  /** Retrieve a single item by ID, or `undefined` if not found */
  get(id: string): CollectionItem<T> | undefined;

  // ---- Reactive queries ---------------------------------------------------

  /**
   * Create a derived reactive query.
   *
   * The selector is re-evaluated every time the collection changes and the
   * result is available via `.value` and the store `.subscribe()` protocol.
   *
   * ```ts
   * const pending = tasks.query(items => items.filter(i => !i.data.done));
   * // Svelte 5: $derived(pending.value)
   * // Svelte 4: $pending
   * ```
   */
  query<R>(selector: (items: Array<CollectionItem<T>>) => R): CollectionQuery<R>;

  // ---- Svelte store protocol (Svelte 4 backward compat) ------------------

  /** Subscribe to collection changes — Svelte 4 store protocol */
  subscribe(cb: (items: Array<CollectionItem<T>>) => void): Unsubscribe;

  /** Tear down all DB subscriptions and release memory */
  destroy(): void;
}

/**
 * Chain node — the fluent API for navigating and mutating data.
 * Mirrors PluresDB/Gun's chain API but is backend-agnostic.
 */
export interface ChainNode {
  /** Navigate to a child key */
  get(key: string): ChainNode;
  /** Write data at this path */
  put(data: unknown, cb?: DataCallback): ChainNode;
  /** Add an item to a collection (auto-generates key) */
  set(data: unknown, cb?: DataCallback): ChainNode;
  /** Subscribe to live updates */
  on(cb: DataCallback): Unsubscribe;
  /** Read once */
  once(cb: DataCallback): void;
  /** Iterate over collection children */
  map(): ChainNode;
  /** Unsubscribe all listeners at this path */
  off(): void;
}

/**
 * Database adapter — implement this to plug in any backend.
 */
export interface DbAdapter {
  /** Get the root chain node */
  root(): ChainNode;
  /** Optional cleanup */
  destroy?(): void;
}

/**
 * Options for pluresData()
 */
export interface PluresDataOptions {
  /** Initial/default data before first load */
  defaults?: Record<string, unknown>;
}

/**
 * Reactive data reference returned by pluresData()
 */
export interface DataRef<T = Record<string, unknown>> {
  /** Current state snapshot */
  readonly state: T;
  /** For collections: array of items. For single items: the item. */
  readonly value: T | Array<T & { id: string }>;
  /** Get all items as an array (collections only) */
  list(): Array<T & { id: string }>;
  /** Add an item to the collection */
  add(data: Omit<T, 'id'> & { id?: string }): void;
  /** Update an item or the current item */
  update(idOrUpdater: string | Partial<T> | ((item: T) => Partial<T>), updater?: Partial<T> | ((item: T) => Partial<T>)): void;
  /** Remove an item by ID */
  remove(id?: string): void;
  /** Svelte-compatible subscribe */
  subscribe(cb: (state: T) => void): Unsubscribe;
  /** Cleanup subscriptions */
  destroy(): void;
}
