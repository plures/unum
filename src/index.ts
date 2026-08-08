/**
 * @plures/unum — Reactive Svelte bindings for PluresDB
 *
 * Zero Gun.js dependency. Backend-agnostic via adapters.
 */

// Core
export { initDb, getAdapter, getRoot, destroyDb, db } from './context.js';
export { pluresData, pluresDerived, pluresBind } from './runes.js';
export { PluresStore, createPluresStore } from './store.js';
export { useGraph } from './graph.js';
export { createCollection } from './collection.js';

// Error propagation
export {
  UnumError,
  onUnumError,
  createErrorBoundary,
} from './errors.js';

// Adapters
export { createPluresDbAdapter } from './adapters/pluresdb.js';
export { createMemoryAdapter } from './adapters/memory.js';
export { createGunAdapter } from './adapters/gun.js';
export { createHyperswarmAdapter } from './adapters/hyperswarm.js';

// Sync status
export { createSyncStatus, createTrackedSync } from './sync-status.js';

// Utility helpers
export { isPluresAvailable, safeGet, safeMap, safeChain } from './plures-helper.js';

// Types
export type {
  ChainNode,
  DbAdapter,
  DataCallback,
  DataRef,
  PluresDataOptions,
  Unsubscribe,
  GraphNode,
  GraphEdge,
  GraphState,
  GraphQuery,
  GraphRef,
  CollectionItem,
  CollectionQuery,
  CollectionRef,
} from './types.js';

export type {
  ErrorSeverity,
  ErrorSource,
  UnumErrorMeta,
  UnumErrorHandler,
  ErrorBoundary,
} from './errors.js';

export type {
  SyncState,
  SyncStatusOptions,
  SyncStatusSnapshot,
  SyncStatusRef,
} from './sync-status.js';
