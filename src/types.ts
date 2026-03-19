/**
 * unum — Reactive Svelte bindings for PluresDB
 *
 * Core types for the database adapter interface.
 */

/** Callback for data subscriptions */
export type DataCallback = (data: any, key?: string) => void;

/** Unsubscribe function returned by on() */
export type Unsubscribe = () => void;

/**
 * Chain node — the fluent API for navigating and mutating data.
 * Mirrors PluresDB/Gun's chain API but is backend-agnostic.
 */
export interface ChainNode {
  /** Navigate to a child key */
  get(key: string): ChainNode;
  /** Write data at this path */
  put(data: any, cb?: DataCallback): ChainNode;
  /** Add an item to a collection (auto-generates key) */
  set(data: any, cb?: DataCallback): ChainNode;
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
  defaults?: Record<string, any>;
}

/**
 * Reactive data reference returned by pluresData()
 */
export interface DataRef<T = Record<string, any>> {
  /** Current state snapshot */
  readonly state: T;
  /** For collections: array of items. For single items: the item. */
  readonly value: any;
  /** Get all items as an array (collections only) */
  list(): Array<T & { id: string }>;
  /** Add an item to the collection */
  add(data: any): void;
  /** Update an item or the current item */
  update(idOrUpdater: string | Partial<T> | ((item: T) => Partial<T>), updater?: Partial<T> | ((item: T) => Partial<T>)): void;
  /** Remove an item by ID */
  remove(id?: string): void;
  /** Svelte-compatible subscribe */
  subscribe(cb: (state: T) => void): Unsubscribe;
  /** Cleanup subscriptions */
  destroy(): void;
}
