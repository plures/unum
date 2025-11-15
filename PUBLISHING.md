# Publishing to NPM

This document describes how to publish the `unum` package to npm using the automated GitHub Actions workflow.

## About PluresDB

PluresDB is published to `@plures/pluresdb` on npm and is also available as a GitHub package. It provides a modern, graph-based database with real-time synchronization capabilities. Unum provides Svelte bindings for PluresDB.

## Prerequisites

Before publishing, ensure:

1. **NPM Token**: The repository has an `NPM_TOKEN` secret configured in GitHub Settings
   - Go to: Repository Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm authentication token (get from npmjs.com)
   - Token requires: Read and write permissions for packages

2. **Version Update**: Update the version in `package.json` following [Semantic Versioning](https://semver.org/)
   ```bash
   npm version patch  # For bug fixes (0.1.0 → 0.1.1)
   npm version minor  # For new features (0.1.0 → 0.2.0)
   npm version major  # For breaking changes (0.1.0 → 1.0.0)
   ```

## Publishing Process

### Automated Publishing (Recommended)

The package uses an automated CI/CD pipeline for publishing. There are two ways to trigger a release:

#### Method 1: Automatic Release on Version Change (Recommended)

1. **Update the version in package.json**
   ```bash
   npm version patch  # For bug fixes (0.1.0 → 0.1.1)
   npm version minor  # For new features (0.1.0 → 0.2.0)
   npm version major  # For breaking changes (0.1.0 → 1.0.0)
   ```

2. **Push to main branch**
   ```bash
   git push origin main --follow-tags
   ```

3. **Automated Workflow Runs**
   The GitHub Actions Release workflow will automatically:
   - ✅ Detect the version change
   - ✅ Run tests and build
   - ✅ Generate changelog from git commits
   - ✅ Create a GitHub Release with the changelog
   - ✅ Publish to npm with provenance
   - ✅ Publish to GitHub Packages as @plures/unum

4. **Monitor the Workflow**
   - Go to: https://github.com/plures/unum/actions
   - Check the "Release" workflow run
   - Verify successful publication

#### Method 2: Manual Workflow Dispatch

You can also trigger a release manually from GitHub Actions:

1. **Navigate to Actions**
   - Go to: https://github.com/plures/unum/actions
   - Click on "Release" workflow

2. **Run Workflow**
   - Click "Run workflow"
   - Select the version bump type (patch, minor, or major)
   - Click "Run workflow"

3. **Automated Process**
   The workflow will:
   - ✅ Bump the version in package.json
   - ✅ Commit and push the version change
   - ✅ Run tests and build
   - ✅ Generate changelog
   - ✅ Create a GitHub Release
   - ✅ Publish to npm
   - ✅ Publish to GitHub Packages

### Manual Publishing (Local)

If needed, you can publish manually from your local machine:

```bash
# Ensure you're on the main branch and up to date
git checkout main
git pull origin main

# Run the full prepublish checks
npm run prepublishOnly

# Publish to npm
npm publish --access public
```

**Note**: Manual publishing requires you to be logged in to npm:
```bash
npm login
```

## CI/CD Pipeline

The repository includes three workflows:

### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: On push to `main` or pull requests
- **Purpose**: Ensures code quality before merging
- **Actions**:
  - Runs tests on Node.js 18 and 20
  - Runs linter
  - Builds the package
  - Validates prepublish script

### 2. Release Workflow (`.github/workflows/release.yml`)
- **Triggers**: 
  - Automatically when package.json version changes on main branch
  - Manually via workflow dispatch
- **Purpose**: Automates the entire release process
- **Actions**:
  - Detects version changes
  - Runs tests and builds
  - Generates changelog from git commits
  - Creates GitHub Release with auto-generated notes
  - Publishes to npm with provenance
  - Publishes to GitHub Packages as @plures/unum

### 3. Publish Workflow (`.github/workflows/publish-npm.yml`)
- **Triggers**: When a GitHub release is manually published
- **Purpose**: Fallback publishing mechanism
- **Actions**:
  - Runs tests
  - Builds the package
  - Publishes to npm with provenance
  - Publishes to GitHub Packages

## NPM Provenance

The publish workflow includes npm provenance (`--provenance` flag), which:
- Creates a verifiable link between the npm package and the source code
- Shows the GitHub Actions workflow that published the package
- Enhances security and supply chain transparency
- Displays a badge on the npm package page

## Troubleshooting

### Publication Failed

If the GitHub Actions workflow fails:

1. **Check the workflow logs**: Go to Actions → Failed workflow → Review error messages

2. **Common issues**:
   - **Authentication failed**: Verify `NPM_TOKEN` secret is configured correctly
   - **Version already exists**: Update version in `package.json`
   - **Tests failed**: Fix failing tests before publishing
   - **Build failed**: Ensure TypeScript compilation succeeds locally

3. **Retry**: Fix the issue, create a new tag/release, and try again

### Manual Republish

If you need to republish the same version (not recommended):

```bash
# This is generally NOT allowed by npm
npm unpublish unum@0.1.0  # Only works within 72 hours
npm publish --access public
```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes to the API
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

## Package Information

- **Package Name**: `unum` (npm) / `@plures/unum` (GitHub Packages)
- **NPM Registry**: https://www.npmjs.com/package/unum
- **GitHub Packages**: https://github.com/plures/unum/packages
- **Scope**: Public (no scope on npm, @plures scope on GitHub)
- **Access Level**: Public

### PluresDB Package

- **Package Name**: `@plures/pluresdb`
- **NPM Registry**: https://www.npmjs.com/package/@plures/pluresdb
- **GitHub Packages**: Available as GitHub package

## Support

For issues related to publishing:
- Check GitHub Actions logs
- Review npm publish documentation: https://docs.npmjs.com/cli/publish
- Open an issue in the repository
