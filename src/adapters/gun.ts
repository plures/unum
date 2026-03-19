/**
 * unum - Gun.js Adapter
 *
 * Wraps an existing Gun.js instance so that it satisfies the `DbAdapter` /
 * `DbNode` interfaces used throughout unum.  Use this when migrating a
 * Gun.js codebase to unum's adapter pattern without switching databases yet.
 *
 * **Important:** This adapter does NOT load Gun from CDN.  You must install
 * Gun yourself (`npm install gun`) and construct the instance before passing
 * it here.  This removes the CDN dependency that existed in the old
 * `GunContext.js`.
 *
 * Usage:
 * ```ts
 * import Gun from 'gun';
 * import { GunAdapter } from '@plures/unum/adapters/gun';
 * import { initializePlures } from '@plures/unum';
 *
 * const gun = Gun({ peers: ['http://localhost:8765/gun'] });
 * initializePlures(new GunAdapter(gun));
 * ```
 */
import type { DbAdapter, DbNode } from '../types.js';

/**
 * Wraps a Gun.js instance as a `DbAdapter`.
 *
 * Gun.js already exposes `get`, `put`, `on`, `once`, `off`, and `map` — the
 * same API modelled by `DbNode` — so this is a zero-overhead typed façade.
 */
export class GunAdapter implements DbAdapter {
  /** @param gun — A Gun.js instance (from the `gun` npm package). */
  constructor(private readonly gun: DbNode) {}

  /**
   * Return a reference to a top-level path in the Gun graph.
   * The returned object satisfies `DbNode` and can be chained further.
   */
  get(path: string): DbNode {
    return this.gun.get(path);
  }
}
