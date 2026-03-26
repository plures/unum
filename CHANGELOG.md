# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `useGraph()` — Svelte 5 runes-compatible reactive graph bindings with typed nodes and edges
- `createCollection<T>()` — typed collection hook with CRUD operations, reactive queries, and lazy subscriptions
- `createHyperswarmAdapter()` — Hyperswarm peer-sync adapter for real-time P2P graph replication
- Complete JSDoc coverage for all exported public API functions with `@param` and `@example` tags

### Changed
- Eliminated all `any` types across the codebase; all public APIs are fully type-safe with strict TypeScript
- Improved README with full API reference aligned to current exports
- Enforced 80% test coverage floor (statements, branches, functions, lines)
- Enforced lint-clean build — zero TypeScript errors, no unused locals

### Fixed
- Eliminated high/moderate CVEs in dev dependencies; dependency audit enforced in CI
- CI tech-doc-writer made resilient to push-event triggers

## [0.3.1] - 2026-03-20

### Added
- `@plures/praxis` integration — four declarative Praxis modules for reactive data management:
  - `merge-policy`: conflict detection and source-priority resolution
  - `schema-unification`: schema compatibility checks and type coercion rules
  - `subscription-policy`: reactive stream eligibility and routing
  - `freshness`: data staleness detection, TTL enforcement, and cache invalidation
- Lifecycle automation workflows (CI feedback loop, auto-approve, auto-rebase, Copilot PR lifecycle)
- Tech doc writer — auto-generates documentation updates on PR merge

### Fixed
- Bubble write notifications to all ancestor path listeners

## [0.3.0] - 2026-03-18

### Added
- Complete rewrite to PluresDB-native TypeScript architecture with no Gun.js dependency
- Pluggable `DbAdapter` abstraction — swap backends without changing application code
- Design mode support for Unum framework

### Changed
- **Breaking:** Replaced Gun.js CDN backend with pluggable `DbAdapter` interface
- Renamed package internals to align with PluresDB conventions

### Fixed
- Clarified GitHub Packages configuration in documentation

## [0.2.3] - 2026-01-26

### Changed
- Refactored README to reflect current project state, removing historical Gun.js context

## [0.2.2] - 2025-12-29

### Changed
- Renamed package to `@plures/unum` (previously published under a different scope)

## [0.2.1] - 2025-12-29

### Changed
- Internal version alignment; no functional changes

## [0.2.0] - 2025-12-27

### Changed
- Internal version alignment; no functional changes

## [0.1.2] - 2025-12-27

### Changed
- Updated version and metadata in `deno.json` to align with npm package version

## [0.1.1] - 2025-12-27

### Added
- Automated npm publishing pipeline via GitHub Actions
- Support for publishing to GitHub Packages as `@plures/unum`

### Changed
- Migrated from Gun.js to `pluresdb` npm package (v1.3.0) with Node.js N-API bindings
- Rebranded project to PluresDB and automated the release pipeline

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Svelte 4 & 5 compatibility
- `PluresStore` for store-based reactivity
- `usePlures` hook for Svelte 5 runes
- Action-based API (`plures`, `pluresList`)
- Full TypeScript support
- PluresDB integration

[Unreleased]: https://github.com/plures/unum/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/plures/unum/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/plures/unum/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/plures/unum/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/plures/unum/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/plures/unum/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/plures/unum/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/plures/unum/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/plures/unum/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/plures/unum/releases/tag/v0.1.0
