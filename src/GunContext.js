/**
 * GunContext.js — backward-compatibility re-export shim.
 *
 * All new code should import from `./DbContext.js` (TypeScript source).
 * This file exists only to avoid breaking existing imports of
 * `GunContext.js` in consumer code.
 */
export {
  initializePlures,
  initializePlures as initializeGun,
  db,
  plures,
  gun,
} from './DbContext.js';
