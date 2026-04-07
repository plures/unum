# Unum Roadmap

## Current: v0.4.0

## Phase 1: Reliability (v0.5)
- [ ] Connection resilience — auto-reconnect on PluresDB restart
- [ ] Subscription cleanup — prevent memory leaks on rapid mount/unmount
- [ ] Error propagation — surface PluresDB errors to Svelte error boundaries
- [ ] Stale data detection — warn when subscriptions lag behind writes
- [ ] Test coverage — integration tests with real PluresDB instance

## Phase 2: Performance (v0.6)
- [ ] Batch updates — debounce rapid writes into single PluresDB transactions
- [ ] Selective reactivity — only re-render when specific fields change
- [ ] Virtual collections — lazy-load large datasets with cursor-based pagination
- [ ] Optimistic updates — update UI immediately, reconcile on sync
- [ ] Bundle analysis — tree-shakeable exports, minimize shipped code

## Phase 3: Advanced Patterns (v0.7)
- [ ] Computed graphs — derived data that updates reactively across relations
- [ ] Conflict resolution UI — surface CRDT conflicts to users with merge options
- [ ] Offline indicator — show sync status in UI
- [ ] Migration helpers — schema evolution without data loss
- [ ] Middleware — intercept reads/writes for caching, validation, logging

## Phase 4: Ecosystem (v1.0)
- [ ] Chronos integration — automatic state history for all unum stores
- [ ] Praxis bindings — reactive constraint evaluation in UI
- [ ] Server-side rendering — SvelteKit SSR with PluresDB hydration
- [ ] DevTools — browser extension for inspecting unum state
- [ ] Documentation site — interactive examples, API playground

