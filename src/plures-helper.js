/**
 * plures-helper.js — backward-compatibility re-export shim.
 *
 * All new code should import from `./plures-helper.ts` directly.
 * This file exists only to avoid breaking existing imports of `plures-helper.js`.
 */
export {
  isPluresAvailable,
  isGunAvailable,
  safeGet,
  safeMap,
  safeChain,
  getPlures,
  getGun,
} from './plures-helper.ts';
