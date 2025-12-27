# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Updated branding and documentation to focus on PluresDB (pluresdb npm package)
- Updated all examples and dependencies to use pluresdb package instead of gun
- **Updated to PluresDB v1.3.0** with Node.js N-API bindings for enhanced performance
- Updated CI/CD pipeline to support automated versioning, changelog generation, and publishing
- Added support for publishing to both npm and GitHub Packages

### Added
- Automated release workflow with version detection
- Automatic changelog generation from git commits
- GitHub Packages publishing as @plures/unum

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Svelte 4 & 5 compatibility
- PluresStore for store-based reactivity
- usePlures hook for Svelte 5 runes
- Action-based API (plures, pluresList)
- Full TypeScript support
- PluresDB integration

[Unreleased]: https://github.com/plures/unum/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/plures/unum/releases/tag/v0.1.0
