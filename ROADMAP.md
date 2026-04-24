# unum Roadmap

## Role in OASIS
Unum is the reactive binding layer between PluresDB and Svelte UI. Every OASIS UI (Radix shell, plugins, and tools) relies on Unum to keep local‑first state synchronized across desktop, mobile, and terminal interfaces.

## Current State
- Svelte 4/5 compatible bindings are implemented with adapters (PluresDB, memory, Gun, Hyperswarm).
- Recent CI fixes and dependency maintenance merged.
- No open issues.

## Phase 1 — Reliability & API Stability
- Adapter conformance tests (reconnect, teardown, memory leak checks).
- Subscription cleanup under rapid mount/unmount scenarios.
- Error propagation into Svelte boundaries with actionable metadata.
- Stale data detection + sync status indicators for UI.

## Phase 2 — Performance & Scale
- Batch/transaction helpers for bursty updates.
- Selective reactivity to avoid re‑render on unrelated field changes.
- Large collection/graph pagination helpers.
- Bundle optimization and tree‑shakeable exports.

## Phase 3 — Advanced Patterns
- Optimistic updates with rollback hooks.
- Conflict‑resolution helpers surfaced in UI.
- Offline‑first policy defaults and documentation.
- Migration helpers for schema evolution.

## Phase 4 — Ecosystem Integration
- Chronos integration for automatic state history.
- Praxis bindings for reactive constraint evaluation in UI.
- DevTools for inspecting Unum state and subscriptions.
