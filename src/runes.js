/**
 * runes.js — backward-compatibility re-export shim.
 *
 * All new code should import from `./runes.ts` directly.
 * This file exists only to avoid breaking existing imports of `runes.js`.
 */
export {
  pluresData,
  pluresDerived,
  pluresBind,
  gunData,
  gunDerived,
  gunBind,
} from './runes.ts';
