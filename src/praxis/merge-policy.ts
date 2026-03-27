/**
 * merge-policy — Praxis module for data source merging decisions.
 *
 * Handles conflict resolution when multiple sources provide the same data,
 * source priority enforcement, and deduplication logic.
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
 * Fact emitted when two or more data sources provide conflicting values for
 * the same path and no clear priority winner can be determined.
 */
export const MergeConflictDetected = defineFact<
  'unum.merge.conflict',
  { path: string; sources: string[]; values: unknown[] }
>('unum.merge.conflict');

/**
 * Fact emitted when a merge conflict has been resolved by selecting the
 * highest-priority source value for a given path.
 */
export const MergeResolved = defineFact<
  'unum.merge.resolved',
  { path: string; winner: string; value: unknown }
>('unum.merge.resolved');

/**
 * Fact emitted when the same source emits more than one update for an
 * identical path within a single engine step (i.e. a duplicate write).
 */
export const DuplicateDetected = defineFact<
  'unum.merge.duplicate',
  { path: string; key: string }
>('unum.merge.duplicate');

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Event fired whenever a data source writes a new value to a path.
 * Carries the source name, affected path, new value, and optional priority.
 */
export const DataSourceUpdated = defineEvent<
  'unum.source.updated',
  { source: string; path: string; value: unknown; priority?: number }
>('unum.source.updated');

/**
 * Event fired to request a merge decision for a set of competing source
 * values at a given path.  The engine resolves this into either a
 * {@link MergeResolved} or {@link MergeConflictDetected} fact.
 */
export const MergeRequested = defineEvent<
  'unum.merge.requested',
  { path: string; sources: Array<{ name: string; value: unknown; priority?: number }> }
>('unum.merge.requested');

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Runtime context injected into the merge-policy module rules.
 * Values here override the static configuration supplied to {@link mergePolicyModule}.
 */
export interface MergePolicyContext {
  /** Source priority map: source name → priority (higher wins) */
  sourcePriorities?: Record<string, number>;
  /** Current merged data state */
  mergedData?: Record<string, unknown>;
}

// ─── Module ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the merge-policy module.
 */
export interface MergePolicyConfig {
  /**
   * Default source priority map. Higher numbers win conflicts.
   * @default {}
   */
  priorities?: Record<string, number>;
  /**
   * Whether to detect and flag duplicate keys across sources.
   * @default true
   */
  detectDuplicates?: boolean;
}

/**
 * Create the merge-policy Praxis module.
 *
 * @example
 * ```ts
 * import { mergePolicyModule } from '@plures/unum/praxis';
 * registry.registerModule(mergePolicyModule({ priorities: { remote: 10, local: 5 } }));
 * ```
 */
export function mergePolicyModule(config: MergePolicyConfig = {}) {
  const { priorities = {}, detectDuplicates = true } = config;

  return defineModule<MergePolicyContext>({
    rules: [
      defineRule<MergePolicyContext>({
        id: 'unum.merge.conflict-resolution',
        description: 'Resolves data conflicts using source priority when multiple sources supply the same path.',
        eventTypes: 'unum.merge.requested',
        contract: {
          ruleId: 'unum.merge.conflict-resolution',
          behavior: 'Emits unum.merge.resolved with the highest-priority source value; emits unum.merge.conflict when sources cannot be ranked.',
          examples: [
            {
              given: 'two sources with different priorities provide the same path',
              when: 'unum.merge.requested fires',
              then: 'unum.merge.resolved emitted with value from higher-priority source',
            },
            {
              given: 'two sources with equal priority provide the same path',
              when: 'unum.merge.requested fires',
              then: 'unum.merge.conflict emitted',
            },
          ],
          invariants: [
            'A resolved merge must always identify the winning source',
            'A conflict must list all competing sources',
          ],
        },
        impl: (state, events) => {
          const mergeEvents = events.filter(MergeRequested.is);
          if (mergeEvents.length === 0) {
            return RuleResult.skip('No merge.requested event');
          }

          const emitted: Array<ReturnType<typeof MergeResolved.create> | ReturnType<typeof MergeConflictDetected.create>> = [];
          let hasMergeWithSources = false;

          const contextPriorities = state.context.sourcePriorities ?? {};
          const effectivePriorities = { ...priorities, ...contextPriorities };

          for (const event of mergeEvents) {
            const { path, sources } = event.payload;

            if (sources.length === 0) {
              // Keep behavior consistent: if *all* merge events have zero sources,
              // we'll return a noop after processing them.
              continue;
            }

            hasMergeWithSources = true;

            if (sources.length === 1) {
              emitted.push(
                MergeResolved.create({ path, winner: sources[0].name, value: sources[0].value }),
              );
              continue;
            }

            const ranked = [...sources].sort((a, b) => {
              const pa = a.priority ?? effectivePriorities[a.name] ?? 0;
              const pb = b.priority ?? effectivePriorities[b.name] ?? 0;
              return pb - pa;
            });

            const top = ranked[0];
            const second = ranked[1];
            const topPriority = top.priority ?? effectivePriorities[top.name] ?? 0;
            const secondPriority = second.priority ?? effectivePriorities[second.name] ?? 0;

            if (topPriority === secondPriority) {
              emitted.push(
                MergeConflictDetected.create({
                  path,
                  sources: sources.map(s => s.name),
                  values: sources.map(s => s.value),
                }),
              );
            } else {
              emitted.push(
                MergeResolved.create({ path, winner: top.name, value: top.value }),
              );
            }
          }

          if (!hasMergeWithSources) {
            return RuleResult.noop('No sources to merge');
          }

          if (emitted.length === 0) {
            // Defensive fallback: no facts emitted even though we had sources.
            return RuleResult.noop('No merge results produced');
          }

          return RuleResult.emit(emitted);
        },
      }),

      ...(detectDuplicates
        ? [
            defineRule<MergePolicyContext>({
              id: 'unum.merge.deduplication',
              description: 'Detects duplicate keys from the same source in a merge batch.',
              eventTypes: 'unum.source.updated',
              contract: {
                ruleId: 'unum.merge.deduplication',
                behavior: 'Emits unum.merge.duplicate when the same source emits the same path more than once in a step.',
                examples: [
                  {
                    given: 'a source emits two updates for the same path in one step',
                    when: 'unum.source.updated fires',
                    then: 'unum.merge.duplicate emitted for the repeated path',
                  },
                ],
                invariants: ['Duplicate detection must not suppress the original update'],
              },
              impl: (_state, events) => {
                const updates = events.filter(DataSourceUpdated.is);
                const seen = new Map<string, string>();
                const duplicates: Array<{ path: string; key: string }> = [];

                for (const ev of updates) {
                  const key = `${ev.payload.source}::${ev.payload.path}`;
                  if (seen.has(key)) {
                    duplicates.push({ path: ev.payload.path, key });
                  } else {
                    seen.set(key, ev.payload.source);
                  }
                }

                if (duplicates.length === 0) return RuleResult.noop('No duplicates detected');

                return RuleResult.emit(
                  duplicates.map(d => DuplicateDetected.create(d)),
                );
              },
            }),
          ]
        : []),
    ],

    constraints: [
      defineConstraint<MergePolicyContext>({
        id: 'unum.merge.conflict-not-silenced',
        description: 'Merge conflicts must be surfaced — resolved merges must not coexist with unresolved conflicts for the same path.',
        contract: {
          ruleId: 'unum.merge.conflict-not-silenced',
          behavior: 'Fails if unum.merge.resolved and unum.merge.conflict both exist for the same path.',
          examples: [
            {
              given: 'a path has both a conflict and a resolved fact',
              when: 'constraint is checked',
              then: 'constraint violation reported',
            },
          ],
          invariants: ['A path cannot be simultaneously conflicted and resolved'],
        },
        impl: (state) => {
          const conflicts = state.facts
            .filter(MergeConflictDetected.is)
            .map(f => f.payload.path);
          const resolved = state.facts
            .filter(MergeResolved.is)
            .map(f => f.payload.path);

          const overlap = conflicts.filter(p => resolved.includes(p));
          if (overlap.length > 0) {
            return `Paths have both conflict and resolved facts: ${overlap.join(', ')}`;
          }
          return true;
        },
      }),
    ],

    meta: { module: 'merge-policy', version: '1.0.0' },
  });
}
