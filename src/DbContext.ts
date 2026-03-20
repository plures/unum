/**
 * DbContext.ts — backward-compatibility re-export shim.
 *
 * All new code should import from `./context.ts`.
 * This module re-exports the context API under the legacy names used in
 * older unum versions (initializePlures, gun, plures, etc.).
 */

export {
  initDb,
  initDb as initializePlures,
  destroyDb,
  getAdapter,
  getRoot,
  db,
  db as gun,
  db as plures,
} from './context.js';
