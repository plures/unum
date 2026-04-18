## [0.6.0] — 2026-04-18

- feat(lifecycle v12): auto-release when milestone completes (2124cec)

## [0.5.0] — 2026-04-18

- feat(lifecycle v11): smart CI failure handling — infra vs code (33ad15d)

## [0.4.1] — 2026-04-17

- fix(lifecycle): label-based retry counter + CI fix priority (72f749d)
- chore(deps-dev): bump the dev-dependencies group with 4 updates (#89) (629698a)
- Initial plan (#88) (96051a8)
- chore(deps-dev): bump the dev-dependencies group with 5 updates (#87) (49f93a9)
- ci: inline lifecycle workflow — fix schedule failures (aa4c8c2)
- docs: add structured ROADMAP.md for automated issue generation (7532410)
- chore: remove redundant workflow — handled by release-reusable.yml (fb0b79e)

## [0.4.0] — 2026-04-07

- chore: centralize release to org-wide reusable workflow (47974d3)
- chore: centralize CI to org-wide reusable workflow (dc83397)
- ci: add Design-Dojo UI compliance gate (5db6cec)
- ci: standardize Node version to lts/* — remove hardcoded versions (ca6150a)
- Initial plan (#83) (4c52c89)
- fix: add missing `typecheck` script to package.json (#82) (178b956)
- docs: improve api-documented coverage from 0% to 90% (#70) (c3fcb02)
- chore(deps-dev): bump the dev-dependencies group with 4 updates (#80) (467f6fb)
- fix: resolve path-to-regexp vulnerability (npm audit fix) (bfb2ffb)
- ci: tech-doc-writer triggers on minor prerelease only [actions-optimization] (84c1a98)
- ci: add concurrency group to copilot-pr-lifecycle [actions-optimization] (2890c8c)
- ci: centralize lifecycle — event-driven with schedule guard (b13f73d)
- ci: remove @copilot mentions from ci-feedback-loop — no comments rule (9c45422)
- refactor: centralize lifecycle — call reusable from plures/repo-template (c9c4e57)
- fix: lifecycle v4.4 — catch self-approval error, don't crash on own PRs (8b25e56)
- fix: lifecycle v4.3 — guard notify step, escape PR title in JSON (671e741)
- fix: lifecycle v4.2 — filter out release/publish checks from CI evaluation (e3ca2b1)
- fix: lifecycle v4.1 — process all PRs independently, add Path F debug logging (9af2cb7)
- feat: lifecycle v4 — merge all PRs, Copilot default reviewer, no nudges (b8e8186)
- fix(lifecycle): v9.1 — fix QA dispatch (client_payload as JSON object) (be3a3be)
- fix(lifecycle): rewrite v9 — apply suggestions, merge, no nudges (27d617f)
- chore: standardize license to MIT (4369be8)
- docs: add ROADMAP.md (e851323)
- chore: cleanup and housekeeping (b81334c)
- chore: add API documentation (d949e02)
- chore: standardize CI workflow (cd83b81)
- docs: add JSDoc to all praxis fact/event/context exports (api-documented 0% → 100%) (#65) (208e4cf)
- fix: strengthen tsconfig strictness to lock in lint-clean at 100% (#68) (069de84)
- chore: add Copilot coding instructions (#66) (6a941e8)
- chore(deps-dev): bump the dev-dependencies group with 7 updates (#55) (0ab3262)
- docs: bring CHANGELOG current — document all versions v0.1.1 through v0.3.1 (#58) (4985e30)
- fix: lint-clean 0% → 100% — remove dead code, enforce noUnusedLocals (#57) (5a1c7fe)
- feat: eliminate all `any` types — type-safety 0% → 100% (#56) (1a9dbe8)
- test: enforce 80% coverage floor — add tests for store, helpers, adapters (#54) (d43f163)
- fix: enforce dependency audit in CI and automate vulnerability patching (#53) (265242c)
- docs: complete JSDoc coverage for all exported public API (#52) (3e8396b)
- fix(ci): make tech-doc-writer resilient to push-event triggers (#46) (cfad9c3)
- fix(ci): enforce lint-clean by removing continue-on-error from lint step (#45) (fae2162)
- feat: type-safety — eliminate all `any` annotations (0% → 100%) (#44) (19f0bf3)
- docs: improve readme-quality from 50% to 100% (#43) (c68b3ae)
- [WIP] Fix repo health for no-known-vulns to reach 100% (#42) (de1b28f)
- docs: add complete JSDoc to all exported public API functions (#41) (2c26a4a)
- [WIP] Add test coverage from 0% to 80% (#37) (5777530)
- fix: eliminate high/moderate CVEs in dev dependencies (no-known-vulns 0% → 100%) (#36) (85e9f82)
- docs: fix api-documented dimension (0% → 90%) (#35) (6001c10)
- fix: add level-critical, improvement, and strategic-gate priority buckets (31619ca)
- feat: Hyperswarm peer-sync adapter for real-time graph replication (#27) (3112d9a)
- fix: v8.3 — fix JS template literal syntax in stall detection (8069d1b)
- fix: v8.2 — QA notify only on actual merge events (51e5f1f)
- fix: v8.1 — assign next issue in same run after merge (don't rely on re-trigger) (60999c7)
- feat: typed collection hooks — createCollection() with CRUD operations (#26) (75b7c62)
- fix: v8 — bounded 30min periodic check (max 4), self-clearing on merge (c6b57c1)
- fix: v7 — no CI = vacuously green (don't block repos without test suites) (f396060)
- fix: v6.5 — workflow_dispatch triggers queue-advance (88ecb55)
- fix: v6.4 — queue-advance runs on PR sync/open for repos without CI (963f015)
- fix: v6.3 — request review after CI green, not on every push (421d382)
- fix: v6.2 — workflow_dispatch + stall detection (7fc5e12)
- fix: v6.1 — add check_suite trigger to close bootstrap gap (e71b7ff)
- fix: v6 lifecycle — issue-driven, no inline PR triggers for bot events (ee6596c)
- fix: remove cron from auto-approve — reactive only (ADR-0001) (1703e3c)
- fix: doc writer v3 — do NOT assign Copilot (prevents race with queue-advance, ADR-0005) (6c5a115)
- fix: v5 lifecycle — doc debt + QA bugs block feature queue (ADR-0005/0006) (da1bbd0)
- fix: doc writer v2 — diff-based context, stale-doc warning (ADR-0005) (74fd0d5)
- feat: v4 lifecycle — add QA dispatch on merge + doc issue fallback in queue-advance (e2ae6d7)
- feat: add tech doc writer — auto-generate doc updates on PR merge (b546fdc)
- feat: useGraph() — Svelte 5 runes-compatible reactive graph bindings (#25) (065c9b1)
- fix: align with ADR-0003/0004 — correct author check (Copilot), require label+type, auto-merge on approve (171d034)
- fix: auto-approve after Copilot code review + CI pass (closes review gap) (19f868b)
- fix: use COPILOT_PAT for queue-advance (GITHUB_TOKEN lacks copilot scope) (eda307f)
- fix: request copilot (not human) as PR reviewer for full automation (34f6e9f)
- chore: add copilot-setup-steps.yml for coding agent (9921f22)
- ci: add lifecycle automation workflows from praxis-business (#21) (972ce4f)
- ci: add ci-feedback-loop.yml from praxis-business template (e77069c)
- ci: add auto-rebase-bot-prs.yml from praxis-business template (b0426ff)
- ci: add auto-approve-copilot-runs.yml from praxis-business template (71caaf4)
- ci: add copilot-pr-lifecycle.yml from praxis-business template (67a6a4a)
- feat: Adopt @plures/praxis for declarative logic management (#20) (2c80609)

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
