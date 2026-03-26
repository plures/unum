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

// Adapters
export { createPluresDbAdapter } from './adapters/pluresdb.js';
export { createMemoryAdapter } from './adapters/memory.js';
export { createGunAdapter } from './adapters/gun.js';
export { createHyperswarmAdapter } from './adapters/hyperswarm.js';

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
