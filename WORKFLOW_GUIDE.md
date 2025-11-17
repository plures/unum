# Automated Release Workflow Guide

## Overview

The unum repository now has a fully automated CI/CD pipeline that handles versioning, changelog generation, releasing, and publishing to both npm and GitHub Packages.

## Workflow Diagram

```
Developer Updates Version
         ↓
    Push to Main
         ↓
   [Version Detection]
         ↓
    Version Changed? ──No──> End
         ↓ Yes
    [Run Tests]
         ↓
    [Build Package]
         ↓
  [Generate Changelog]
         ↓
  [Create GitHub Release]
         ↓
    [Publish to npm]
         ↓
 [Publish to GitHub Packages]
         ↓
      Complete!
```

## Two Ways to Release

### Method 1: Automatic (Recommended)

1. Update version in package.json:
   ```bash
   npm version patch  # 0.1.0 → 0.1.1
   npm version minor  # 0.1.0 → 0.2.0
   npm version major  # 0.1.0 → 1.0.0
   ```

2. Push to main:
   ```bash
   git push origin main --follow-tags
   ```

3. The Release workflow automatically:
   - Detects the version change
   - Runs all tests and builds
   - Generates changelog from commits
   - Creates GitHub Release
   - Publishes to npm and GitHub Packages

### Method 2: Manual Workflow Dispatch

1. Go to GitHub Actions: https://github.com/plures/unum/actions
2. Click "Release" workflow
3. Click "Run workflow"
4. Select version bump type (patch/minor/major)
5. Click "Run workflow"

The workflow will:
- Bump version in package.json
- Commit and push the change
- Follow the same automated process as Method 1

## What Gets Published

### npm Registry
- Package name: `unum`
- URL: https://www.npmjs.com/package/unum
- Installation: `npm install unum`

### GitHub Packages
- Package name: `@plures/unum`
- URL: https://github.com/plures/unum/packages
- Installation: 
  ```bash
  npm install @plures/unum --registry=https://npm.pkg.github.com
  ```

## Changelog Generation

Changelogs are automatically generated from git commits between releases:
- Commits since last tag are collected
- Formatted as bullet points with commit hash
- Added to GitHub Release notes
- Manual CHANGELOG.md updates are still recommended for major changes

## Best Practices

1. **Commit Messages**: Write clear, descriptive commit messages as they become changelog entries
2. **Version Bumps**: Follow semantic versioning:
   - Patch: Bug fixes
   - Minor: New features (backward compatible)
   - Major: Breaking changes
3. **Testing**: Always ensure tests pass before merging to main
4. **Documentation**: Update CHANGELOG.md manually for significant releases

## Troubleshooting

### Release Didn't Trigger
- Check if version in package.json actually changed
- Verify push was to main branch
- Check GitHub Actions logs

### Publishing Failed
- Verify NPM_TOKEN secret is configured
- Check npm package version doesn't already exist
- Review workflow logs for specific errors

### Manual Intervention Needed
If automated release fails, you can still:
1. Create release manually on GitHub
2. Publish manually: `npm publish --access public`

## Security

All workflows use:
- Explicit permission blocks
- npm provenance for supply chain security
- Minimal required permissions
- CodeQL security scanning

## Links

- [CI Workflow](.github/workflows/ci.yml)
- [Release Workflow](.github/workflows/release.yml)
- [Publish Workflow](.github/workflows/publish-npm.yml)
- [PUBLISHING.md](PUBLISHING.md) - Detailed publishing guide
- [CHANGELOG.md](CHANGELOG.md) - Release history
