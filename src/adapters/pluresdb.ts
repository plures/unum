/**
 * unum - PluresDB Adapter
 *
 * Wraps a native PluresDB instance (from the `pluresdb` npm package) so that
 * it satisfies the `DbAdapter` / `DbNode` interfaces used throughout unum.
 *
 * Usage:
 * ```ts
 * import { PluresDB } from 'pluresdb';
 * import { PluresDbAdapter } from '@plures/unum/adapters/pluresdb';
 * import { initializePlures } from '@plures/unum';
 *
 * const db = new PluresDB({ /* ...options *\/ });
 * initializePlures(new PluresDbAdapter(db));
 * ```
 */
import type { DbAdapter, DbNode } from '../types.js';

/**
 * Wraps any PluresDB-compatible instance as a `DbAdapter`.
 *
 * PluresDB exposes the same chained-query API as Gun.js (`get`, `put`, `on`,
 * `once`, `off`, `map`), so the adapter is a lightweight typed façade with no
 * runtime overhead.
 */
export class PluresDbAdapter implements DbAdapter {
  /** @param db — A PluresDB instance from the `pluresdb` npm package. */
  constructor(private readonly db: DbNode) {}

  /**
   * Return a reference to a top-level path in the database.
   * The returned object satisfies `DbNode` and can be chained further.
   */
  get(path: string): DbNode {
    return this.db.get(path);
  }
}
