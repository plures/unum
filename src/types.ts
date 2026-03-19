/**
 * unum - TypeScript type definitions
 *
 * Core interfaces for the DbAdapter abstraction layer that decouples
 * unum from any specific database backend (PluresDB, Gun, mock, etc.).
 */

// ---------------------------------------------------------------------------
// Database adapter interfaces
// ---------------------------------------------------------------------------

/** Function returned by subscriptions to cancel them. */
export type DbUnsubscribe = () => void;

/**
 * A reference to a node (or collection) within a database.
 * Models the Gun.js / PluresDB chained-query API so that adapters can
 * wrap either implementation without additional boilerplate.
 */
export interface DbNode {
  /** Traverse to a child node. */
  get(path: string): DbNode;
  /** Write data to this node. */
  put(data: unknown): DbNode;
  /**
   * Subscribe to live updates on this node.
   * Returns an unsubscribe function or void (depending on the backend).
   */
  on(callback: (data: unknown, key?: string) => void): DbUnsubscribe | void;
  /** Read the current value exactly once. */
  once(callback: (data: unknown, key?: string) => void): void;
  /** Unsubscribe all listeners on this node. */
  off(): DbNode;
  /** Iterate over all child nodes (collection semantics). */
  map(callback?: (data: unknown, key: string) => void): DbNode;
}

/**
 * Top-level database adapter.
 *
 * Implement this interface to plug any storage backend into unum.
 * Ship two built-ins:
 *  - `PluresDbAdapter` (`src/adapters/pluresdb.ts`) for the `pluresdb` npm package.
 *  - `GunAdapter`      (`src/adapters/gun.ts`)       for legacy Gun.js code-paths.
 */
export interface DbAdapter {
  /** Return a reference to a top-level path in the database. */
  get(path: string): DbNode;
}

// ---------------------------------------------------------------------------
// Svelte store compatibility
// ---------------------------------------------------------------------------

/** Minimal Svelte-store-compatible interface. */
export interface Subscribable<T> {
  subscribe(callback: (value: T) => void): DbUnsubscribe;
}

/** A writable store holding the active DbAdapter (or null before init). */
export type AdapterStore = Subscribable<DbAdapter | null>;

// ---------------------------------------------------------------------------
// pluresData result shape
// ---------------------------------------------------------------------------

export interface PluresDataResult<T = Record<string, unknown>> {
  /** Raw state object (keyed by item ID for collections, flat for single items). */
  readonly state: T;
  /** Array-form of a collection state; empty for single-item references. */
  readonly value: T extends Record<string, unknown> ? T[] : T;
  /** Returns the collection as an array suitable for `{#each}` loops. */
  list(): Array<T & { id: string }>;
  /** Add an item to a collection. */
  add(data: Partial<T> & { id?: string }): void;
  /** Update an item (or the current item for single-item references). */
  update(itemIdOrUpdater: string | Partial<T> | ((current: T) => Partial<T>), updater?: Partial<T> | ((current: T) => Partial<T>)): void;
  /** Remove an item from a collection, or null-out a single-item reference. */
  remove(itemId?: string | null): void;
  /** Subscribe to state changes (Svelte store–compatible). */
  subscribe(callback: (state: T) => void): DbUnsubscribe;
  /** Clean up all subscriptions. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// pluresDerived result shape
// ---------------------------------------------------------------------------

export interface PluresDerivedResult<R> {
  /** The current derived value. */
  readonly value: R;
  /** Subscribe to derived value changes. */
  subscribe(callback: (value: R) => void): DbUnsubscribe;
  /** Clean up subscriptions. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// pluresBind result shape
// ---------------------------------------------------------------------------

export interface PluresBindResult<V = unknown> {
  /** The current field value. */
  value: V;
  /** Clean up subscriptions. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Design mode types (re-exported for convenience)
// ---------------------------------------------------------------------------

export type DesignModeType = 'normal' | 'design';

export interface DesignTemplates {
  normal: unknown;
  design: unknown;
}

export interface DesignConfig {
  mode: DesignModeType;
  templates: DesignTemplates;
  customizations: Record<string, unknown>;
}
