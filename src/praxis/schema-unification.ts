/**
 * schema-unification — Praxis module for schema type compatibility and coercion.
 *
 * Handles type compatibility checks between data sources, coercion gating,
 * and field mapping validation during schema unification.
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
 * Fact emitted when a schema check determines that the source type is
 * assignment-compatible with the target type (e.g. same type, or widening).
 */
export const SchemaCompatible = defineFact<
  'unum.schema.compatible',
  { path: string; sourceType: string; targetType: string }
>('unum.schema.compatible');

/**
 * Fact emitted when a schema check determines that the source type cannot
 * be safely assigned to the target type without an explicit coercion.
 */
export const SchemaIncompatible = defineFact<
  'unum.schema.incompatible',
  { path: string; sourceType: string; targetType: string; reason: string }
>('unum.schema.incompatible');

/**
 * Fact emitted when a requested type coercion is present in the allowed
 * coercion list and may therefore proceed.
 */
export const CoercionAllowed = defineFact<
  'unum.schema.coercion-allowed',
  { path: string; fromType: string; toType: string }
>('unum.schema.coercion-allowed');

/**
 * Fact emitted when a requested type coercion is NOT in the allowed coercion
 * list and must be rejected to maintain type safety.
 */
export const CoercionBlocked = defineFact<
  'unum.schema.coercion-blocked',
  { path: string; fromType: string; toType: string; reason: string }
>('unum.schema.coercion-blocked');

/**
 * Fact emitted when a field mapping between two schemas is well-formed
 * (both `sourceField` and `targetField` are non-empty strings).
 */
export const MappingValid = defineFact<
  'unum.schema.mapping-valid',
  { sourceField: string; targetField: string }
>('unum.schema.mapping-valid');

/**
 * Fact emitted when a field mapping between two schemas is malformed —
 * for example, when either field name is an empty string.
 */
export const MappingInvalid = defineFact<
  'unum.schema.mapping-invalid',
  { sourceField: string; targetField: string; reason: string }
>('unum.schema.mapping-invalid');

// ─── Events ─────────────────────────────────────────────────────────────────

/**
 * Event fired to request a type-compatibility check between a source type
 * and a target type at a given path.
 */
export const SchemaCheckRequested = defineEvent<
  'unum.schema.check-requested',
  { path: string; sourceType: string; targetType: string }
>('unum.schema.check-requested');

/**
 * Event fired to request a coercion gate decision for a `fromType → toType`
 * conversion at a given path.
 */
export const CoercionRequested = defineEvent<
  'unum.schema.coercion-requested',
  { path: string; fromType: string; toType: string }
>('unum.schema.coercion-requested');

/**
 * Event fired to validate that a field mapping between two schemas is
 * well-formed before it is applied.
 */
export const MappingCheckRequested = defineEvent<
  'unum.schema.mapping-check-requested',
  { sourceField: string; targetField: string; sourceType?: string; targetType?: string }
>('unum.schema.mapping-check-requested');

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * Runtime context injected into the schema-unification module rules.
 * Values here extend the static configuration supplied to {@link schemaUnificationModule}.
 */
export interface SchemaUnificationContext {
  /**
   * Allowed coercion pairs: `"fromType->toType"`.
   * @default built-in safe coercions
   */
  allowedCoercions?: string[];
}

// ─── Built-in safe coercions ─────────────────────────────────────────────────

const DEFAULT_ALLOWED_COERCIONS = new Set([
  'number->string',
  'boolean->string',
  'integer->number',
  'integer->string',
  'null->undefined',
  'undefined->null',
]);

// ─── Type compatibility ───────────────────────────────────────────────────────

function typesCompatible(source: string, target: string): boolean {
  if (source === target) return true;
  if (target === 'any' || target === 'unknown') return true;
  if (source === 'integer' && target === 'number') return true;
  return false;
}

// ─── Module ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the schema-unification module.
 */
export interface SchemaUnificationConfig {
  /**
   * Additional allowed coercion pairs beyond the built-in safe ones.
   * Format: `"fromType->toType"` (e.g. `"float->integer"`).
   */
  extraCoercions?: string[];
  /**
   * Whether to validate field mappings between source and target schemas.
   * @default true
   */
  validateMappings?: boolean;
}

/**
 * Create the schema-unification Praxis module.
 *
 * @example
 * ```ts
 * import { schemaUnificationModule } from '@plures/unum/praxis';
 * registry.registerModule(schemaUnificationModule({ extraCoercions: ['float->integer'] }));
 * ```
 */
export function schemaUnificationModule(config: SchemaUnificationConfig = {}) {
  const { extraCoercions = [], validateMappings = true } = config;

  const allowedCoercions = new Set([
    ...DEFAULT_ALLOWED_COERCIONS,
    ...extraCoercions,
  ]);

  return defineModule<SchemaUnificationContext>({
    rules: [
      defineRule<SchemaUnificationContext>({
        id: 'unum.schema.type-compatibility',
        description: 'Checks whether a source type is assignment-compatible with a target type.',
        eventTypes: 'unum.schema.check-requested',
        contract: {
          ruleId: 'unum.schema.type-compatibility',
          behavior: 'Emits unum.schema.compatible or unum.schema.incompatible based on type relationship.',
          examples: [
            {
              given: 'source type equals target type',
              when: 'unum.schema.check-requested fires',
              then: 'unum.schema.compatible emitted',
            },
            {
              given: 'source type is "string", target is "number"',
              when: 'unum.schema.check-requested fires',
              then: 'unum.schema.incompatible emitted',
            },
          ],
          invariants: [
            'Every schema check must produce exactly one compatibility fact',
            'integer is always compatible with number (widening)',
          ],
        },
        impl: (_state, events) => {
          const checks = events.filter(SchemaCheckRequested.is);
          if (checks.length === 0) return RuleResult.skip('No schema check events');

          const facts = checks.map(ev => {
            const { path, sourceType, targetType } = ev.payload;
            if (typesCompatible(sourceType, targetType)) {
              return SchemaCompatible.create({ path, sourceType, targetType });
            }
            return SchemaIncompatible.create({
              path,
              sourceType,
              targetType,
              reason: `'${sourceType}' is not assignable to '${targetType}'`,
            });
          });

          return RuleResult.emit(facts);
        },
      }),

      defineRule<SchemaUnificationContext>({
        id: 'unum.schema.coercion-gate',
        description: 'Gates type coercion requests against the allowed coercion list.',
        eventTypes: 'unum.schema.coercion-requested',
        contract: {
          ruleId: 'unum.schema.coercion-gate',
          behavior: 'Emits unum.schema.coercion-allowed or unum.schema.coercion-blocked.',
          examples: [
            {
              given: 'coercion "number->string" is requested',
              when: 'unum.schema.coercion-requested fires',
              then: 'unum.schema.coercion-allowed emitted',
            },
            {
              given: 'coercion "string->boolean" is requested and not in allowed list',
              when: 'unum.schema.coercion-requested fires',
              then: 'unum.schema.coercion-blocked emitted',
            },
          ],
          invariants: [
            'Every coercion request must produce exactly one gate decision',
            'Unsafe coercions must always be blocked unless explicitly allowed',
          ],
        },
        impl: (state, events) => {
          const requests = events.filter(CoercionRequested.is);
          if (requests.length === 0) return RuleResult.skip('No coercion-requested events');

          const contextCoercions = new Set([
            ...allowedCoercions,
            ...(state.context.allowedCoercions ?? []),
          ]);

          const facts = requests.map(ev => {
            const { path, fromType, toType } = ev.payload;
            const pair = `${fromType}->${toType}`;
            if (contextCoercions.has(pair)) {
              return CoercionAllowed.create({ path, fromType, toType });
            }
            return CoercionBlocked.create({
              path,
              fromType,
              toType,
              reason: `Coercion '${pair}' is not in the allowed coercion list`,
            });
          });

          return RuleResult.emit(facts);
        },
      }),

      ...(validateMappings
        ? [
            defineRule<SchemaUnificationContext>({
              id: 'unum.schema.mapping-validation',
              description: 'Validates that field mappings between schemas are well-formed.',
              eventTypes: 'unum.schema.mapping-check-requested',
              contract: {
                ruleId: 'unum.schema.mapping-validation',
                behavior: 'Emits unum.schema.mapping-valid or unum.schema.mapping-invalid for each mapping request.',
                examples: [
                  {
                    given: 'sourceField and targetField are both non-empty strings',
                    when: 'unum.schema.mapping-check-requested fires',
                    then: 'unum.schema.mapping-valid emitted',
                  },
                  {
                    given: 'targetField is empty',
                    when: 'unum.schema.mapping-check-requested fires',
                    then: 'unum.schema.mapping-invalid emitted',
                  },
                ],
                invariants: [
                  'Every mapping check must produce exactly one validity fact',
                  'Mappings with empty field names are always invalid',
                ],
              },
              impl: (_state, events) => {
                const checks = events.filter(MappingCheckRequested.is);
                if (checks.length === 0) return RuleResult.skip('No mapping-check events');

                const facts = checks.map(ev => {
                  const { sourceField, targetField } = ev.payload;
                  if (!sourceField?.trim()) {
                    return MappingInvalid.create({
                      sourceField,
                      targetField,
                      reason: 'sourceField must not be empty',
                    });
                  }
                  if (!targetField?.trim()) {
                    return MappingInvalid.create({
                      sourceField,
                      targetField,
                      reason: 'targetField must not be empty',
                    });
                  }
                  return MappingValid.create({ sourceField, targetField });
                });

                return RuleResult.emit(facts);
              },
            }),
          ]
        : []),
    ],

    constraints: [
      defineConstraint<SchemaUnificationContext>({
        id: 'unum.schema.no-blocked-coercions-in-use',
        description: 'Blocked coercions must not appear alongside allowed coercions for the same path.',
        contract: {
          ruleId: 'unum.schema.no-blocked-coercions-in-use',
          behavior: 'Fails if unum.schema.coercion-allowed and unum.schema.coercion-blocked both exist for the same path.',
          examples: [
            {
              given: 'a path has both allowed and blocked coercion facts',
              when: 'constraint is checked',
              then: 'constraint violation reported',
            },
          ],
          invariants: ['A coercion path cannot be simultaneously allowed and blocked'],
        },
        impl: (state) => {
          const allowed = state.facts
            .filter(CoercionAllowed.is)
            .map(f => f.payload.path);
          const blocked = state.facts
            .filter(CoercionBlocked.is)
            .map(f => f.payload.path);

          const overlap = allowed.filter(p => blocked.includes(p));
          if (overlap.length > 0) {
            return `Paths have both coercion-allowed and coercion-blocked facts: ${overlap.join(', ')}`;
          }
          return true;
        },
      }),
    ],

    meta: { module: 'schema-unification', version: '1.0.0' },
  });
}
