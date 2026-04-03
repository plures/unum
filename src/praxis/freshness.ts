/**
 * freshness — Praxis module for data freshness, staleness, and cache invalidation.
 *
 * Handles staleness detection, refresh trigger decisions, TTL enforcement,
 * and cache invalidation policies for reactive data sources.
 */

import {
  defineModule,
  defineRule,
  defineConstraint,
  defineFact,
  defineEvent,
  RuleResult,
} from '@plures/praxis';

// ─── Facts ──────────────────────────────────────────────────────────────────

/**
 * Fact emitted when a freshness check determines that data at a path is
 * within its TTL and therefore still considered current.
 */
export const DataFresh = defineFact<
  'unum.freshness.fresh',
  { path: string; age: number; ttl: number }
>('unum.freshness.fresh');

/**
 * Fact emitted when a freshness check determines that data at a path has
 * exceeded its TTL and is no longer considered current.
 */
export const DataStale = defineFact<
  'unum.freshness.stale',
  { path: string; age: number; ttl: number }
>('unum.freshness.stale');

/**
 * Fact emitted when the engine decides to trigger a data refresh, either
 * because the data became stale or an explicit refresh was requested.
 */
export const RefreshTriggered = defineFact<
  'unum.freshness.refresh-triggered',
  { path: string; reason: string }
>('unum.freshness.refresh-triggered');

/**
 * Fact emitted when a write to a path invalidates its cached/fresh state,
 * forcing consumers to treat the previous freshness reading as void.
 */
export const CacheInvalidated = defineFact<
  'unum.freshness.cache-invalidated',
  { path: string; reason: string }
>('unum.freshness.cache-invalidated');

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Event fired to request a freshness evaluation for a path.
 * Carries the path, the timestamp of the last known write, and an optional
 * `now` override for deterministic testing.
 */
export const FreshnessCheckRequested = defineEvent<
  'unum.freshness.check-requested',
  { path: string; lastUpdated: number; now?: number }
>('unum.freshness.check-requested');

/**
 * Event fired whenever data is written to a path.
 * Used by the cache-invalidation rule to invalidate freshness state.
 */
export const DataWritten = defineEvent<
  'unum.freshness.data-written',
  { path: string; timestamp: number }
>('unum.freshness.data-written');

/**
 * Event fired to request an explicit (manual) refresh of data at a path,
 * bypassing the normal TTL-based staleness detection.
 */
export const RefreshRequested = defineEvent<
  'unum.freshness.refresh-requested',
  { path: string; reason?: string }
>('unum.freshness.refresh-requested');

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Runtime context injected into the freshness module rules.
 * Values here override the static configuration supplied to {@link freshnessModule}.
 */
export interface FreshnessContext {
  /** Per-path TTL overrides (milliseconds) */
  ttlOverrides?: Record<string, number>;
  /** Current timestamp — can be injected for deterministic testing */
  now?: number;
}

// ─── Module ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the freshness module.
 */
export interface FreshnessConfig {
  /**
   * Default TTL in milliseconds.
   * @default 300_000 (5 minutes)
   */
  defaultTtlMs?: number;
  /**
   * Per-path TTL overrides. Path glob patterns are not supported — use exact paths.
   */
  ttlOverrides?: Record<string, number>;
  /**
   * Automatically trigger a refresh when data becomes stale.
   * @default true
   */
  autoRefresh?: boolean;
  /**
   * Invalidate the cache whenever a write to a path is detected.
   * @default true
   */
  invalidateOnWrite?: boolean;
}

/**
 * Create the freshness Praxis module.
 *
 * @param config - Optional configuration for TTL, auto-refresh, and cache invalidation.
 * @returns A `PraxisModule` ready to register with a `PraxisRegistry`.
 *
 * @example
 * ```ts
 * import { freshnessModule } from '@plures/unum/praxis';
 * registry.registerModule(freshnessModule({ defaultTtlMs: 60_000, autoRefresh: true }));
 * ```
 */
export function freshnessModule(config: FreshnessConfig = {}) {
  const {
    defaultTtlMs = 300_000,
    ttlOverrides = {},
    autoRefresh = true,
    invalidateOnWrite = true,
  } = config;

  return defineModule<FreshnessContext>({
    rules: [
      defineRule<FreshnessContext>({
        id: 'unum.freshness.staleness-detection',
        description: 'Detects whether data at a path has exceeded its TTL and marks it fresh or stale.',
        eventTypes: 'unum.freshness.check-requested',
        contract: {
          ruleId: 'unum.freshness.staleness-detection',
          behavior: 'Emits unum.freshness.fresh when age < TTL; unum.freshness.stale when age >= TTL.',
          examples: [
            {
              given: 'data was last updated 10 seconds ago with a 60-second TTL',
              when: 'unum.freshness.check-requested fires',
              then: 'unum.freshness.fresh emitted',
            },
            {
              given: 'data was last updated 120 seconds ago with a 60-second TTL',
              when: 'unum.freshness.check-requested fires',
              then: 'unum.freshness.stale emitted',
            },
          ],
          invariants: [
            'Every freshness check must produce exactly one freshness fact',
            'Age is always computed as now - lastUpdated',
          ],
        },
        impl: (state, events) => {
          const checks = events.filter(FreshnessCheckRequested.is);
          if (checks.length === 0) return RuleResult.skip('No freshness check events');

          const contextTtlOverrides = state.context.ttlOverrides ?? {};
          const now = state.context.now ?? Date.now();

          const facts = checks.map(ev => {
            const { path, lastUpdated } = ev.payload;
            const checkNow = ev.payload.now ?? now;
            const ttl =
              contextTtlOverrides[path] ??
              ttlOverrides[path] ??
              defaultTtlMs;
            const age = checkNow - lastUpdated;

            if (age >= ttl) {
              return DataStale.create({ path, age, ttl });
            }
            return DataFresh.create({ path, age, ttl });
          });

          return RuleResult.emit(facts);
        },
      }),

      ...(autoRefresh
        ? [
            defineRule<FreshnessContext>({
              id: 'unum.freshness.auto-refresh',
              description: 'Triggers a refresh when stale data facts are present.',
              contract: {
                ruleId: 'unum.freshness.auto-refresh',
                behavior: 'Emits unum.freshness.refresh-triggered for each unum.freshness.stale fact not yet refreshed.',
                examples: [
                  {
                    given: 'a unum.freshness.stale fact exists for a path',
                    when: 'the engine steps',
                    then: 'unum.freshness.refresh-triggered emitted for that path',
                  },
                  {
                    given: 'no stale facts exist',
                    when: 'the engine steps',
                    then: 'noop — no refresh triggered',
                  },
                ],
                invariants: [
                  'A refresh must only be triggered for stale paths',
                  'Already-refreshed paths must not be triggered again in the same step',
                ],
              },
              impl: (state, _events) => {
                const stalePaths = state.facts
                  .filter(DataStale.is)
                  .map(f => f.payload.path);

                if (stalePaths.length === 0) return RuleResult.noop('No stale paths');

                const alreadyTriggered = new Set(
                  state.facts.filter(RefreshTriggered.is).map(f => f.payload.path),
                );

                const toRefresh = stalePaths.filter(p => !alreadyTriggered.has(p));
                if (toRefresh.length === 0) return RuleResult.noop('All stale paths already have refresh triggered');

                return RuleResult.emit(
                  toRefresh.map(path =>
                    RefreshTriggered.create({ path, reason: 'Data exceeded TTL' }),
                  ),
                );
              },
            }),
          ]
        : []),

      ...(invalidateOnWrite
        ? [
            defineRule<FreshnessContext>({
              id: 'unum.freshness.cache-invalidation',
              description: 'Invalidates cached data when a write event is received for a path.',
              eventTypes: 'unum.freshness.data-written',
              contract: {
                ruleId: 'unum.freshness.cache-invalidation',
                behavior: 'Emits unum.freshness.cache-invalidated for every unum.freshness.data-written event.',
                examples: [
                  {
                    given: 'a write to path "users/profile" is received',
                    when: 'unum.freshness.data-written fires',
                    then: 'unum.freshness.cache-invalidated emitted for "users/profile"',
                  },
                ],
                invariants: [
                  'Every write must produce a cache invalidation fact',
                  'Cache invalidation must name the written path',
                ],
              },
              impl: (_state, events) => {
                const writes = events.filter(DataWritten.is);
                if (writes.length === 0) return RuleResult.skip('No data-written events');

                return RuleResult.emit(
                  writes.map(ev =>
                    CacheInvalidated.create({
                      path: ev.payload.path,
                      reason: `Write at timestamp ${ev.payload.timestamp}`,
                    }),
                  ),
                );
              },
            }),
          ]
        : []),

      defineRule<FreshnessContext>({
        id: 'unum.freshness.explicit-refresh',
        description: 'Handles explicit refresh requests, emitting a refresh-triggered fact.',
        eventTypes: 'unum.freshness.refresh-requested',
        contract: {
          ruleId: 'unum.freshness.explicit-refresh',
          behavior: 'Emits unum.freshness.refresh-triggered for each unum.freshness.refresh-requested event.',
          examples: [
            {
              given: 'a manual refresh is requested for a path',
              when: 'unum.freshness.refresh-requested fires',
              then: 'unum.freshness.refresh-triggered emitted',
            },
          ],
          invariants: ['Every explicit refresh request must produce a refresh-triggered fact'],
        },
        impl: (_state, events) => {
          const requests = events.filter(RefreshRequested.is);
          if (requests.length === 0) return RuleResult.skip('No refresh-requested events');

          return RuleResult.emit(
            requests.map(ev =>
              RefreshTriggered.create({
                path: ev.payload.path,
                reason: ev.payload.reason ?? 'Explicit refresh requested',
              }),
            ),
          );
        },
      }),
    ],

    constraints: [
      defineConstraint<FreshnessContext>({
        id: 'unum.freshness.no-stale-and-fresh',
        description: 'A path cannot be simultaneously marked fresh and stale.',
        contract: {
          ruleId: 'unum.freshness.no-stale-and-fresh',
          behavior: 'Fails if unum.freshness.fresh and unum.freshness.stale both exist for the same path.',
          examples: [
            {
              given: 'a path has both fresh and stale facts',
              when: 'constraint is checked',
              then: 'constraint violation reported',
            },
          ],
          invariants: ['A path cannot be simultaneously fresh and stale'],
        },
        impl: (state) => {
          const freshPaths = state.facts.filter(DataFresh.is).map(f => f.payload.path);
          const stalePaths = state.facts.filter(DataStale.is).map(f => f.payload.path);

          const overlap = freshPaths.filter(p => stalePaths.includes(p));
          if (overlap.length > 0) {
            return `Paths are simultaneously fresh and stale: ${overlap.join(', ')}`;
          }
          return true;
        },
      }),
    ],

    meta: { module: 'freshness', version: '1.0.0' },
  });
}
