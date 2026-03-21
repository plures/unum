/**
 * @plures/unum — Praxis logic modules
 *
 * Declarative rule-based logic for data source merging, schema unification,
 * subscription eligibility, and data freshness.
 *
 * Each module is a `PraxisModule` factory that accepts configuration and returns
 * a module you can register with a `PraxisRegistry`.
 *
 * @example
 * ```ts
 * import { PraxisRegistry, createPraxisEngine } from '@plures/praxis';
 * import {
 *   mergePolicyModule,
 *   schemaUnificationModule,
 *   subscriptionPolicyModule,
 *   freshnessModule,
 * } from '@plures/unum/praxis';
 *
 * const registry = new PraxisRegistry();
 * registry.registerModule(mergePolicyModule({ priorities: { remote: 10, local: 5 } }));
 * registry.registerModule(schemaUnificationModule());
 * registry.registerModule(subscriptionPolicyModule({ requireAuth: true }));
 * registry.registerModule(freshnessModule({ defaultTtlMs: 60_000 }));
 *
 * const engine = createPraxisEngine({ initialContext: {}, registry });
 * ```
 */

// ─── Merge Policy ────────────────────────────────────────────────────────────
export { mergePolicyModule } from './merge-policy.js';
export type { MergePolicyConfig, MergePolicyContext } from './merge-policy.js';
export {
  MergeConflictDetected,
  MergeResolved,
  DuplicateDetected,
  DataSourceUpdated,
  MergeRequested,
} from './merge-policy.js';

// ─── Schema Unification ──────────────────────────────────────────────────────
export { schemaUnificationModule } from './schema-unification.js';
export type { SchemaUnificationConfig, SchemaUnificationContext } from './schema-unification.js';
export {
  SchemaCompatible,
  SchemaIncompatible,
  CoercionAllowed,
  CoercionBlocked,
  MappingValid,
  MappingInvalid,
  SchemaCheckRequested,
  CoercionRequested,
  MappingCheckRequested,
} from './schema-unification.js';

// ─── Subscription Policy ─────────────────────────────────────────────────────
export { subscriptionPolicyModule } from './subscription-policy.js';
export type { SubscriptionPolicyConfig, SubscriptionPolicyContext } from './subscription-policy.js';
export {
  SubscriptionEligible,
  SubscriptionIneligible,
  StreamRouted,
  StreamFiltered,
  SubscriptionRequested,
  StreamUpdateReceived,
} from './subscription-policy.js';

// ─── Freshness ───────────────────────────────────────────────────────────────
export { freshnessModule } from './freshness.js';
export type { FreshnessConfig, FreshnessContext } from './freshness.js';
export {
  DataFresh,
  DataStale,
  RefreshTriggered,
  CacheInvalidated,
  FreshnessCheckRequested,
  DataWritten,
  RefreshRequested,
} from './freshness.js';
