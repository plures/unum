/**
 * Tests for @plures/unum Praxis logic modules.
 *
 * Each module is tested by:
 * 1. Creating an engine with the module registered
 * 2. Stepping the engine with relevant events
 * 3. Asserting the expected facts are produced
 */

import { describe, it, expect } from 'vitest';
import { PraxisRegistry, createPraxisEngine } from '@plures/praxis';

import {
  mergePolicyModule,
  MergeRequested,
  MergeResolved,
  MergeConflictDetected,
  DataSourceUpdated,
  DuplicateDetected,
} from '../src/praxis/merge-policy.js';

import {
  schemaUnificationModule,
  SchemaCheckRequested,
  SchemaCompatible,
  SchemaIncompatible,
  CoercionRequested,
  CoercionAllowed,
  CoercionBlocked,
  MappingCheckRequested,
  MappingValid,
  MappingInvalid,
} from '../src/praxis/schema-unification.js';

import {
  subscriptionPolicyModule,
  SubscriptionRequested,
  SubscriptionEligible,
  SubscriptionIneligible,
  StreamUpdateReceived,
  StreamRouted,
  StreamFiltered,
} from '../src/praxis/subscription-policy.js';
import type { SubscriptionPolicyContext } from '../src/praxis/subscription-policy.js';

import {
  freshnessModule,
  FreshnessCheckRequested,
  DataFresh,
  DataStale,
  RefreshTriggered,
  DataWritten,
  CacheInvalidated,
  RefreshRequested,
} from '../src/praxis/freshness.js';
import type { FreshnessContext } from '../src/praxis/freshness.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEngine<
  TCtx,
  TModule extends Parameters<PraxisRegistry<TCtx>['registerModule']>[0],
>(module: TModule, ctx: TCtx) {
  const registry = new PraxisRegistry<TCtx>();
  registry.registerModule(module);
  return createPraxisEngine<TCtx>({ initialContext: ctx, registry });
}

// ─── merge-policy ─────────────────────────────────────────────────────────────

describe('merge-policy module', () => {
  it('resolves a single-source merge immediately', () => {
    const engine = makeEngine(mergePolicyModule(), {});
    const result = engine.step([
      MergeRequested.create({
        path: 'users/profile',
        sources: [{ name: 'remote', value: { name: 'Alice' } }],
      }),
    ]);
    const resolved = result.state.facts.filter(MergeResolved.is);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].payload.winner).toBe('remote');
  });

  it('resolves conflict via priority config', () => {
    const engine = makeEngine(
      mergePolicyModule({ priorities: { remote: 10, local: 5 } }),
      {},
    );
    const result = engine.step([
      MergeRequested.create({
        path: 'data/x',
        sources: [
          { name: 'local', value: 1 },
          { name: 'remote', value: 2 },
        ],
      }),
    ]);
    const resolved = result.state.facts.filter(MergeResolved.is);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].payload.winner).toBe('remote');
    expect(resolved[0].payload.value).toBe(2);
  });

  it('emits conflict fact when sources have equal priority', () => {
    const engine = makeEngine(mergePolicyModule(), {});
    const result = engine.step([
      MergeRequested.create({
        path: 'data/y',
        sources: [
          { name: 'a', value: 1 },
          { name: 'b', value: 2 },
        ],
      }),
    ]);
    const conflicts = result.state.facts.filter(MergeConflictDetected.is);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].payload.sources).toContain('a');
    expect(conflicts[0].payload.sources).toContain('b');
  });

  it('detects duplicate source updates for the same path', () => {
    const engine = makeEngine(mergePolicyModule({ detectDuplicates: true }), {});
    const result = engine.step([
      DataSourceUpdated.create({ source: 'remote', path: 'todos', value: 1 }),
      DataSourceUpdated.create({ source: 'remote', path: 'todos', value: 2 }),
    ]);
    const dups = result.state.facts.filter(DuplicateDetected.is);
    expect(dups).toHaveLength(1);
  });

  it('does not emit duplicates when detectDuplicates is false', () => {
    const engine = makeEngine(mergePolicyModule({ detectDuplicates: false }), {});
    const result = engine.step([
      DataSourceUpdated.create({ source: 's', path: 'todos', value: 1 }),
      DataSourceUpdated.create({ source: 's', path: 'todos', value: 2 }),
    ]);
    const dups = result.state.facts.filter(DuplicateDetected.is);
    expect(dups).toHaveLength(0);
  });

  it('resolves priority from the event payload priority field', () => {
    const engine = makeEngine(mergePolicyModule(), {});
    const result = engine.step([
      MergeRequested.create({
        path: 'cfg',
        sources: [
          { name: 'a', value: 'low', priority: 1 },
          { name: 'b', value: 'high', priority: 99 },
        ],
      }),
    ]);
    const resolved = result.state.facts.filter(MergeResolved.is);
    expect(resolved[0].payload.winner).toBe('b');
  });
});

// ─── schema-unification ───────────────────────────────────────────────────────

describe('schema-unification module', () => {
  it('emits compatible fact for matching types', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      SchemaCheckRequested.create({ path: 'name', sourceType: 'string', targetType: 'string' }),
    ]);
    const compat = result.state.facts.filter(SchemaCompatible.is);
    expect(compat).toHaveLength(1);
  });

  it('emits incompatible fact for mismatched types', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      SchemaCheckRequested.create({ path: 'age', sourceType: 'string', targetType: 'number' }),
    ]);
    const incompat = result.state.facts.filter(SchemaIncompatible.is);
    expect(incompat).toHaveLength(1);
    expect(incompat[0].payload.reason).toContain("'string' is not assignable to 'number'");
  });

  it('integer is compatible with number (widening)', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      SchemaCheckRequested.create({ path: 'count', sourceType: 'integer', targetType: 'number' }),
    ]);
    expect(result.state.facts.filter(SchemaCompatible.is)).toHaveLength(1);
  });

  it('allows built-in safe coercions', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      CoercionRequested.create({ path: 'id', fromType: 'number', toType: 'string' }),
    ]);
    expect(result.state.facts.filter(CoercionAllowed.is)).toHaveLength(1);
  });

  it('blocks unsafe coercions', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      CoercionRequested.create({ path: 'flag', fromType: 'string', toType: 'boolean' }),
    ]);
    expect(result.state.facts.filter(CoercionBlocked.is)).toHaveLength(1);
  });

  it('allows extra coercions from config', () => {
    const engine = makeEngine(
      schemaUnificationModule({ extraCoercions: ['float->integer'] }),
      {},
    );
    const result = engine.step([
      CoercionRequested.create({ path: 'x', fromType: 'float', toType: 'integer' }),
    ]);
    expect(result.state.facts.filter(CoercionAllowed.is)).toHaveLength(1);
  });

  it('validates a well-formed field mapping', () => {
    const engine = makeEngine(schemaUnificationModule({ validateMappings: true }), {});
    const result = engine.step([
      MappingCheckRequested.create({ sourceField: 'firstName', targetField: 'first_name' }),
    ]);
    expect(result.state.facts.filter(MappingValid.is)).toHaveLength(1);
  });

  it('rejects mappings with empty target field', () => {
    const engine = makeEngine(schemaUnificationModule(), {});
    const result = engine.step([
      MappingCheckRequested.create({ sourceField: 'foo', targetField: '' }),
    ]);
    expect(result.state.facts.filter(MappingInvalid.is)).toHaveLength(1);
  });

  it('skips mapping validation when validateMappings is false', () => {
    const engine = makeEngine(schemaUnificationModule({ validateMappings: false }), {});
    const result = engine.step([
      MappingCheckRequested.create({ sourceField: 'foo', targetField: '' }),
    ]);
    expect(result.state.facts.filter(MappingInvalid.is)).toHaveLength(0);
    expect(result.state.facts.filter(MappingValid.is)).toHaveLength(0);
  });
});

// ─── subscription-policy ─────────────────────────────────────────────────────

describe('subscription-policy module', () => {
  it('marks a subscription eligible with no restrictions', () => {
    const engine = makeEngine(subscriptionPolicyModule(), {});
    const result = engine.step([
      SubscriptionRequested.create({ streamId: 's1', path: 'todos' }),
    ]);
    expect(result.state.facts.filter(SubscriptionEligible.is)).toHaveLength(1);
  });

  it('blocks subscription to a blocked path', () => {
    const engine = makeEngine(
      subscriptionPolicyModule({ blockedPaths: ['admin/logs'] }),
      {},
    );
    const result = engine.step([
      SubscriptionRequested.create({ streamId: 's1', path: 'admin/logs' }),
    ]);
    expect(result.state.facts.filter(SubscriptionIneligible.is)).toHaveLength(1);
  });

  it('requires authentication when requireAuth is true', () => {
    const engine = makeEngine(
      subscriptionPolicyModule({ requireAuth: true }),
      { authenticated: false },
    );
    const result = engine.step([
      SubscriptionRequested.create({ streamId: 's1', path: 'data' }),
    ]);
    expect(result.state.facts.filter(SubscriptionIneligible.is)).toHaveLength(1);
  });

  it('allows subscription when authenticated and requireAuth is true', () => {
    const engine = makeEngine(
      subscriptionPolicyModule({ requireAuth: true }),
      { authenticated: true },
    );
    const result = engine.step([
      SubscriptionRequested.create({ streamId: 's1', path: 'data' }),
    ]);
    expect(result.state.facts.filter(SubscriptionEligible.is)).toHaveLength(1);
  });

  it('enforces max subscriptions limit', () => {
    const engine = makeEngine(
      subscriptionPolicyModule({ maxSubscriptions: 1 }),
      { activeSubscriptions: ['existing-stream'] },
    );
    const result = engine.step([
      SubscriptionRequested.create({ streamId: 's2', path: 'data' }),
    ]);
    expect(result.state.facts.filter(SubscriptionIneligible.is)).toHaveLength(1);
  });

  it('routes updates from eligible streams', () => {
    const engine = makeEngine(subscriptionPolicyModule(), {});
    // First step: establish eligibility
    engine.step([
      SubscriptionRequested.create({ streamId: 's1', path: 'todos' }),
    ]);
    // Second step: receive stream update
    const result = engine.step([
      StreamUpdateReceived.create({ streamId: 's1', path: 'todos', data: { v: 1 } }),
    ]);
    expect(result.state.facts.filter(StreamRouted.is)).toHaveLength(1);
  });

  it('filters updates from ineligible streams', () => {
    const registry = new PraxisRegistry<SubscriptionPolicyContext>();
    registry.registerModule(subscriptionPolicyModule({ blockedPaths: ['admin'] }));
    const engine = createPraxisEngine({
      initialContext: {},
      registry,
      // Pre-seed an ineligible fact
      initialFacts: [SubscriptionIneligible.create({ streamId: 'bad', reason: 'blocked' })],
    });
    const result = engine.step([
      StreamUpdateReceived.create({ streamId: 'bad', path: 'admin', data: {} }),
    ]);
    expect(result.state.facts.filter(StreamFiltered.is)).toHaveLength(1);
  });

  it('constraint: reports violation when context.activeSubscriptions exceeds max', () => {
    const registry = new PraxisRegistry<SubscriptionPolicyContext>();
    registry.registerModule(subscriptionPolicyModule({ maxSubscriptions: 2 }));
    const engine = createPraxisEngine({
      initialContext: { activeSubscriptions: ['s1', 's2', 's3'] },
      registry,
    });
    const result = engine.step([]);
    expect(result.diagnostics?.some(d => d.message?.includes('exceeds the maximum'))).toBe(true);
  });

  it('constraint: no violation when context.activeSubscriptions is within max', () => {
    const registry = new PraxisRegistry<SubscriptionPolicyContext>();
    registry.registerModule(subscriptionPolicyModule({ maxSubscriptions: 5 }));
    const engine = createPraxisEngine({
      initialContext: { activeSubscriptions: ['s1', 's2'] },
      registry,
    });
    const result = engine.step([]);
    const violations = result.diagnostics?.filter(d => d.message?.includes('exceeds the maximum')) ?? [];
    expect(violations).toHaveLength(0);
  });
});

// ─── freshness ───────────────────────────────────────────────────────────────

describe('freshness module', () => {
  const now = 1_000_000;
  const ttl = 60_000;

  it('marks data fresh when age < TTL', () => {
    const engine = makeEngine(freshnessModule({ defaultTtlMs: ttl }), { now });
    const result = engine.step([
      FreshnessCheckRequested.create({
        path: 'users',
        lastUpdated: now - 30_000, // 30s ago
        now,
      }),
    ]);
    expect(result.state.facts.filter(DataFresh.is)).toHaveLength(1);
    expect(result.state.facts.filter(DataStale.is)).toHaveLength(0);
  });

  it('marks data stale when age >= TTL', () => {
    const engine = makeEngine(freshnessModule({ defaultTtlMs: ttl }), { now });
    const result = engine.step([
      FreshnessCheckRequested.create({
        path: 'users',
        lastUpdated: now - 90_000, // 90s ago
        now,
      }),
    ]);
    expect(result.state.facts.filter(DataStale.is)).toHaveLength(1);
    expect(result.state.facts.filter(DataFresh.is)).toHaveLength(0);
  });

  it('auto-triggers refresh for stale paths', () => {
    const registry = new PraxisRegistry<FreshnessContext>();
    registry.registerModule(freshnessModule({ defaultTtlMs: ttl, autoRefresh: true }));
    const engine = createPraxisEngine({
      initialContext: { now },
      registry,
      initialFacts: [DataStale.create({ path: 'todos', age: 90_000, ttl })],
    });
    const result = engine.step([]);
    expect(result.state.facts.filter(RefreshTriggered.is).some(f => f.payload.path === 'todos')).toBe(true);
  });

  it('does not auto-trigger when autoRefresh is false', () => {
    const registry = new PraxisRegistry<FreshnessContext>();
    registry.registerModule(freshnessModule({ defaultTtlMs: ttl, autoRefresh: false }));
    const engine = createPraxisEngine({
      initialContext: { now },
      registry,
      initialFacts: [DataStale.create({ path: 'todos', age: 90_000, ttl })],
    });
    const result = engine.step([]);
    expect(result.state.facts.filter(RefreshTriggered.is)).toHaveLength(0);
  });

  it('invalidates cache on data write', () => {
    const engine = makeEngine(freshnessModule({ invalidateOnWrite: true }), {});
    const result = engine.step([
      DataWritten.create({ path: 'todos', timestamp: now }),
    ]);
    expect(result.state.facts.filter(CacheInvalidated.is)).toHaveLength(1);
    expect(result.state.facts.filter(CacheInvalidated.is)[0].payload.path).toBe('todos');
  });

  it('skips cache invalidation when invalidateOnWrite is false', () => {
    const engine = makeEngine(freshnessModule({ invalidateOnWrite: false }), {});
    const result = engine.step([
      DataWritten.create({ path: 'todos', timestamp: now }),
    ]);
    expect(result.state.facts.filter(CacheInvalidated.is)).toHaveLength(0);
  });

  it('handles explicit refresh requests', () => {
    const engine = makeEngine(freshnessModule(), {});
    const result = engine.step([
      RefreshRequested.create({ path: 'settings', reason: 'user action' }),
    ]);
    expect(result.state.facts.filter(RefreshTriggered.is)).toHaveLength(1);
    expect(result.state.facts.filter(RefreshTriggered.is)[0].payload.reason).toBe('user action');
  });

  it('respects per-path TTL overrides', () => {
    const engine = makeEngine(
      freshnessModule({ defaultTtlMs: 60_000, ttlOverrides: { 'hot-data': 5_000 } }),
      { now },
    );
    const result = engine.step([
      FreshnessCheckRequested.create({
        path: 'hot-data',
        lastUpdated: now - 10_000, // 10s ago > 5s TTL
        now,
      }),
    ]);
    expect(result.state.facts.filter(DataStale.is)).toHaveLength(1);
  });
});
