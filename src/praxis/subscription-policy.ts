/**
 * subscription-policy — Praxis module for reactive stream subscription eligibility.
 *
 * Determines which reactive streams should be subscribed based on context,
 * applies filter rules, and handles context-aware routing decisions.
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
 * Fact emitted when a subscription request passes all eligibility checks
 * (auth, path allow-list, and concurrency limit).
 */
export const SubscriptionEligible = defineFact<
  'unum.subscription.eligible',
  { streamId: string; reason: string }
>('unum.subscription.eligible');

/**
 * Fact emitted when a subscription request fails one or more eligibility
 * checks (e.g. unauthenticated, blocked path, or concurrency limit reached).
 */
export const SubscriptionIneligible = defineFact<
  'unum.subscription.ineligible',
  { streamId: string; reason: string }
>('unum.subscription.ineligible');

/**
 * Fact emitted when an incoming stream update is forwarded to its target
 * path because the originating stream is eligible.
 */
export const StreamRouted = defineFact<
  'unum.subscription.routed',
  { streamId: string; targetPath: string }
>('unum.subscription.routed');

/**
 * Fact emitted when an incoming stream update is dropped because the
 * originating stream has been marked ineligible.
 */
export const StreamFiltered = defineFact<
  'unum.subscription.filtered',
  { streamId: string; reason: string }
>('unum.subscription.filtered');

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Event fired when a consumer requests a subscription to a reactive stream.
 * The engine evaluates eligibility and emits either {@link SubscriptionEligible}
 * or {@link SubscriptionIneligible}.
 */
export const SubscriptionRequested = defineEvent<
  'unum.subscription.requested',
  { streamId: string; path: string; context?: Record<string, unknown> }
>('unum.subscription.requested');

/**
 * Event fired when a reactive stream delivers a new data update.
 * The routing rule uses the current eligibility facts to decide whether
 * to emit {@link StreamRouted} or {@link StreamFiltered}.
 */
export const StreamUpdateReceived = defineEvent<
  'unum.subscription.stream-update',
  { streamId: string; data: unknown; path: string }
>('unum.subscription.stream-update');

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Runtime context injected into the subscription-policy module rules.
 * Values here override or extend the static configuration supplied to
 * {@link subscriptionPolicyModule}.
 */
export interface SubscriptionPolicyContext {
  /** Paths/streams the current context is allowed to subscribe to */
  allowedPaths?: string[];
  /** Paths/streams that are blocked for the current context */
  blockedPaths?: string[];
  /** Whether the session is authenticated */
  authenticated?: boolean;
  /** Maximum concurrent subscriptions allowed */
  maxSubscriptions?: number;
  /** Currently active subscription IDs */
  activeSubscriptions?: string[];
}

// ─── Module ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the subscription-policy module.
 */
export interface SubscriptionPolicyConfig {
  /**
   * Require authentication before any subscription is allowed.
   * @default false
   */
  requireAuth?: boolean;
  /**
   * Maximum number of concurrent subscriptions (0 = unlimited).
   * @default 0
   */
  maxSubscriptions?: number;
  /**
   * Paths that are always blocked regardless of context.
   */
  blockedPaths?: string[];
}

/**
 * Create the subscription-policy Praxis module.
 *
 * @example
 * ```ts
 * import { subscriptionPolicyModule } from '@plures/unum/praxis';
 * registry.registerModule(subscriptionPolicyModule({ requireAuth: true, maxSubscriptions: 50 }));
 * ```
 */
export function subscriptionPolicyModule(config: SubscriptionPolicyConfig = {}) {
  const { requireAuth = false, maxSubscriptions = 0, blockedPaths = [] } = config;

  return defineModule<SubscriptionPolicyContext>({
    rules: [
      defineRule<SubscriptionPolicyContext>({
        id: 'unum.subscription.eligibility',
        description: 'Determines whether a stream subscription request is eligible based on context.',
        eventTypes: 'unum.subscription.requested',
        contract: {
          ruleId: 'unum.subscription.eligibility',
          behavior: 'Emits unum.subscription.eligible or unum.subscription.ineligible for each subscription request.',
          examples: [
            {
              given: 'auth is required and the context is authenticated',
              when: 'unum.subscription.requested fires',
              then: 'unum.subscription.eligible emitted',
            },
            {
              given: 'auth is required and the context is not authenticated',
              when: 'unum.subscription.requested fires',
              then: 'unum.subscription.ineligible emitted',
            },
            {
              given: 'the requested path is in the blocked list',
              when: 'unum.subscription.requested fires',
              then: 'unum.subscription.ineligible emitted',
            },
          ],
          invariants: [
            'Every subscription request must produce exactly one eligibility fact',
            'Blocked paths must never be eligible',
          ],
        },
        impl: (state, events) => {
          const requests = events.filter(SubscriptionRequested.is);
          if (requests.length === 0) return RuleResult.skip('No subscription.requested events');

          const ctx = state.context;
          const effectiveBlocked = new Set([
            ...blockedPaths,
            ...(ctx.blockedPaths ?? []),
          ]);
          const allowedPaths = ctx.allowedPaths;

          const facts = requests.map(ev => {
            const { streamId, path } = ev.payload;

            if (effectiveBlocked.has(path) || effectiveBlocked.has(streamId)) {
              return SubscriptionIneligible.create({
                streamId,
                reason: `Path '${path}' is blocked`,
              });
            }

            if (requireAuth && !ctx.authenticated) {
              return SubscriptionIneligible.create({
                streamId,
                reason: 'Authentication required',
              });
            }

            if (allowedPaths && !allowedPaths.includes(path)) {
              return SubscriptionIneligible.create({
                streamId,
                reason: `Path '${path}' is not in the allowed paths list`,
              });
            }

            if (maxSubscriptions > 0) {
              const active = ctx.activeSubscriptions?.length ?? 0;
              if (active >= maxSubscriptions) {
                return SubscriptionIneligible.create({
                  streamId,
                  reason: `Maximum concurrent subscriptions (${maxSubscriptions}) reached`,
                });
              }
            }

            return SubscriptionEligible.create({ streamId, reason: 'All eligibility checks passed' });
          });

          return RuleResult.emit(facts);
        },
      }),

      defineRule<SubscriptionPolicyContext>({
        id: 'unum.subscription.routing',
        description: 'Routes eligible stream updates to their target paths based on context.',
        eventTypes: 'unum.subscription.stream-update',
        contract: {
          ruleId: 'unum.subscription.routing',
          behavior: 'Emits unum.subscription.routed for updates from eligible streams; unum.subscription.filtered for ineligible ones.',
          examples: [
            {
              given: 'a stream update arrives from an eligible stream',
              when: 'unum.subscription.stream-update fires',
              then: 'unum.subscription.routed emitted',
            },
            {
              given: 'a stream update arrives from a stream marked ineligible in facts',
              when: 'unum.subscription.stream-update fires',
              then: 'unum.subscription.filtered emitted',
            },
          ],
          invariants: [
            'Only eligible streams should have their updates routed',
            'Every stream update must produce a routing decision',
          ],
        },
        impl: (state, events) => {
          const updates = events.filter(StreamUpdateReceived.is);
          if (updates.length === 0) return RuleResult.skip('No stream-update events');

          const ineligibleIds = new Set(
            state.facts.filter(SubscriptionIneligible.is).map(f => f.payload.streamId),
          );

          const facts = updates.map(ev => {
            const { streamId, path } = ev.payload;
            if (ineligibleIds.has(streamId)) {
              return StreamFiltered.create({
                streamId,
                reason: `Stream '${streamId}' is marked ineligible`,
              });
            }
            return StreamRouted.create({ streamId, targetPath: path });
          });

          return RuleResult.emit(facts);
        },
      }),
    ],

    constraints: [
      defineConstraint<SubscriptionPolicyContext>({
        id: 'unum.subscription.no-over-subscription',
        description: 'Active subscriptions must not exceed the configured maximum.',
        contract: {
          ruleId: 'unum.subscription.no-over-subscription',
          behavior: 'Fails when context.activeSubscriptions count exceeds maxSubscriptions.',
          examples: [
            {
              given: 'maxSubscriptions is 2 and context.activeSubscriptions has 3 entries',
              when: 'constraint is checked',
              then: 'constraint violation reported',
            },
          ],
          invariants: ['Active subscription count must never exceed the configured maximum'],
        },
        impl: (state) => {
          if (maxSubscriptions === 0) return true;

          const activeCount = state.context.activeSubscriptions?.length ?? 0;
          if (activeCount > maxSubscriptions) {
            return `Active subscription count ${activeCount} exceeds the maximum of ${maxSubscriptions}`;
          }
          return true;
        },
      }),
    ],

    meta: { module: 'subscription-policy', version: '1.0.0' },
  });
}
