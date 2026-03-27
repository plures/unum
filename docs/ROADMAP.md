# Unum Roadmap

## Role in Plures Ecosystem
Unum is the reactive data binding layer that makes PluresDB usable inside Svelte apps. It bridges graph/collection data to Svelte stores and runes so every UI can stay in sync with local-first state without bespoke glue.

## Current State
Core adapters (memory, PluresDB, Gun, Hyperswarm wrapper) and reactive APIs (collections, graphs, pluresData, stores) are implemented with TypeScript types and Svelte 4/5 compatibility. Runes helpers exist, plus Praxis modules for merge policy, schema unification, and freshness. Examples cover SvelteKit and Deno. Gaps are around offline-first policies, optimistic update ergonomics, and long-term adapter API stability.

## Milestones

### Near-term (Q2 2026)
- Finalize Svelte 5 runes API surface and update docs to reflect canonical patterns.
- Add adapter conformance tests and a stability matrix for DbAdapter implementations.
- Improve optimistic update helpers for collections/graphs with rollback hooks.
- Document offline-first defaults and best practices for PluresDB + Hyperswarm.

### Mid-term (Q3-Q4 2026)
- Introduce sync policy hooks for conflict resolution beyond Praxis defaults.
- Add adapter lifecycle hooks for reconnection, hydration, and persistence.
- Expand examples to include multi-peer sync and schema evolution scenarios.
- Tighten type-safety around graph edge/node payloads and derived queries.

### Long-term
- Unified adapter registry for runtime swapping and diagnostic inspection.
- Stable public API contract with semantic versioning guarantees and deprecation tooling.
- Optimized reactive diffing for large graphs/collections with minimal Svelte invalidations.
