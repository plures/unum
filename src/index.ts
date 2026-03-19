/**
 * @plures/unum — Reactive Svelte bindings for PluresDB
 *
 * Zero Gun.js dependency. Backend-agnostic via adapters.
 */

// Core
export { initDb, getAdapter, getRoot, destroyDb, db } from './context.js';
export { pluresData, pluresDerived, pluresBind } from './runes.js';
export { PluresStore, createPluresStore } from './store.js';

// Adapters
export { createPluresDbAdapter } from './adapters/pluresdb.js';
export { createMemoryAdapter } from './adapters/memory.js';

// Types
export type {
  ChainNode,
  DbAdapter,
  DataCallback,
  DataRef,
  PluresDataOptions,
  Unsubscribe,
} from './types.js';
