# CI/CD Setup Guide

This guide walks you through setting up the CI/CD pipeline for this repository.

## Prerequisites

- Repository owner or admin access
- npm account with publishing rights for `@micskeil` scope

## GitHub Secrets Configuration

### 1. NPM_TOKEN (Required for Publishing)

**Purpose:** Allows GitHub Actions to publish packages to npm

**Steps to create:**

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to your profile settings → Access Tokens
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" token type (recommended for CI/CD)
5. Copy the generated token (starts with `npm_...`)
6. In your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

**Verification:**
```bash
# Test locally (don't commit this!)
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" > .npmrc
npm publish --dry-run
rm .npmrc
```

### 2. GITHUB_TOKEN (Automatic)

**Purpose:** Allows workflows to interact with GitHub API (create releases, deploy to Pages)

This token is **automatically provided** by GitHub Actions - no setup required.

## Repository Settings

### 1. Enable GitHub Pages

**Purpose:** Host TypeDoc API documentation automatically

**Steps:**

1. Go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: Select `gh-pages` (will be created by first publish workflow)
4. Folder: `/ (root)`
5. Click "Save"

**Note:** The `gh-pages` branch will be created automatically by the first successful publish workflow run.

### 2. Branch Protection Rules (Recommended)

**Purpose:** Ensure all changes pass CI before merging

**Steps:**

1. Go to Settings → Branches
2. Click "Add branch protection rule"
3. Branch name pattern: `master`
4. Enable the following:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Add required checks: `lint`, `type-check`, `test`, `build`
   - ✅ Require branches to be up to date before merging
5. Click "Create" or "Save changes"

### 3. GitHub Actions Permissions

**Purpose:** Allow workflows to create releases and deploy Pages

**Steps:**

1. Go to Settings → Actions → General
2. Workflow permissions:
   - Select "Read and write permissions"
   - ✅ Enable "Allow GitHub Actions to create and approve pull requests"
3. Click "Save"

## Workflow Overview

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Every pull request to `master`
- Every push to `master`

**Jobs:**
- **lint**: ESLint validation
- **type-check**: TypeScript compilation check
- **test**: Vitest tests with coverage
- **build**: Library build validation

**No secrets required** - runs on every PR

### Publish Workflow (`.github/workflows/publish.yml`)

**Triggers:**
- Git tags matching `v*` pattern (e.g., `v0.1.1`, `v1.0.0`)
- Manual dispatch with optional dry-run mode

**Jobs:**
- **validate**: Runs full CI suite
- **publish-npm**: Publishes to npm registry (requires `NPM_TOKEN`)
- **publish-docs**: Deploys TypeDoc to GitHub Pages (uses `GITHUB_TOKEN`)
- **create-release**: Creates GitHub release with changelog (uses `GITHUB_TOKEN`)

**Required secrets:** `NPM_TOKEN`

### Dependabot (`.github/dependabot.yml`)

**Purpose:** Automatic dependency updates

**Configuration:**
- Weekly updates on Mondays
- Separate groups for dev and production dependencies
- Auto-labels PRs with `dependencies` and `automated`

**No secrets required** - uses `GITHUB_TOKEN` automatically

## Testing the Pipeline

### 1. Test CI (No Secrets Required)

Create a test PR to verify CI works:

```bash
git checkout -b test/ci-pipeline
echo "# Test" >> test-file.md
git add test-file.md
git commit -m "test: verify CI pipeline"
git push origin test/ci-pipeline
```

Create a PR on GitHub and verify all checks pass.

### 2. Test Publishing (Requires NPM_TOKEN)

**Option A: Dry Run (Safe)**

Manually trigger the publish workflow:
1. Go to Actions → Publish
2. Click "Run workflow"
3. Set dry-run: `true`
4. Click "Run workflow"

**Option B: Real Publish**

Create and push a version tag:

```bash
# Update version
npm version patch -m "chore: bump version to %s"

# Push with tags
git push && git push --tags
```

The workflow will automatically:
1. Run all tests
2. Publish to npm
3. Deploy docs to GitHub Pages
4. Create GitHub release

## Verification Checklist

After setup, verify:

- ✅ CI workflow runs on PRs
- ✅ All CI jobs pass (lint, type-check, test, build)
- ✅ Publish workflow can be manually triggered (dry-run)
- ✅ NPM_TOKEN is configured (check workflow logs for auth errors)
- ✅ GitHub Pages settings are configured
- ✅ Branch protection rules are active (if enabled)

## Troubleshooting

### "Error: Unable to find token" in publish workflow

**Cause:** `NPM_TOKEN` secret is not configured

**Fix:** Follow [NPM_TOKEN setup instructions](#1-npm_token-required-for-publishing)

### "GitHub Pages not found" during docs deployment

**Cause:** GitHub Pages is not enabled or `gh-pages` branch doesn't exist yet

**Fix:**
1. Enable GitHub Pages in repository settings
2. Let the workflow create the `gh-pages` branch on first run
3. Subsequent runs will deploy successfully

### "Resource not accessible by integration" for releases

**Cause:** Workflow doesn't have write permissions

**Fix:** Update workflow permissions in Settings → Actions → General → Workflow permissions → "Read and write permissions"

### Publish workflow doesn't trigger on tags

**Cause:** Tags were pushed before workflows existed

**Fix:** Delete and recreate the tag:
```bash
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
git tag v0.1.0
git push origin v0.1.0
```

## Support

For issues with:
- **GitHub Actions:** Check [Actions documentation](https://docs.github.com/en/actions)
- **npm Publishing:** Check [npm documentation](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages)
- **GitHub Pages:** Check [Pages documentation](https://docs.github.com/en/pages)

For project-specific issues, open an issue in the repository.
