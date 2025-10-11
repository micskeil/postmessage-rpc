# Update Package Name and Documentation

## Priority: DESIGN & COMPLETENESS
**Status:** 🟠 Documentation Mismatch

## Problem
The package was renamed from `@chamaileon-sdk/plugin-interface` to `message-interface` and version reset from `1.1.1` to `0.1.0`, but:
1. No README update explaining the change
2. No migration guide for existing users
3. Repository still references old package name
4. No changelog documenting the breaking changes

## Impact
- **User confusion**: Existing users won't understand the rename
- **Breaking change**: Different package name means manual update required
- **Lost users**: People may not find the new package
- **Trust issues**: Unexplained rename looks unprofessional
- **Discovery problems**: Old package name still in README/docs

## Changes Made (Already in package.json)

```json
{
  "name": "message-interface",  // Changed from "@chamaileon-sdk/plugin-interface"
  "version": "0.1.0",            // Reset from "1.1.1"
}
```

## Required Documentation Updates

### 1. Update README.md

#### Add Migration Notice (if maintaining old package)
```markdown
# message-interface

> ⚠️ **Package Renamed**: This package was formerly published as `@chamaileon-sdk/plugin-interface`.
> See [Migration Guide](#migration-from-chamaileon-sdkplugin-interface) below.

## Installation

\`\`\`bash
npm install message-interface
\`\`\`

### Migration from @chamaileon-sdk/plugin-interface

If you're upgrading from the old package name:

1. Uninstall old package:
\`\`\`bash
npm uninstall @chamaileon-sdk/plugin-interface
\`\`\`

2. Install new package:
\`\`\`bash
npm install message-interface
\`\`\`

3. Update imports:
\`\`\`typescript
// Old
import { initFullscreenPlugin } from '@chamaileon-sdk/plugin-interface';

// New
import { initFullscreenPlugin } from 'message-interface';
\`\`\`

4. Review [CHANGELOG.md](./CHANGELOG.md) for breaking changes

### Breaking Changes in v0.1.0
- Package renamed to `message-interface`
- Migrated to TypeScript
- Test framework changed from Jest to Vitest
- API changes: [document specific API changes here after fixing #01-#05]
```

#### Update Package Name References
Search and replace in README:
```bash
# Find old references
grep -r "@chamaileon-sdk/plugin-interface" docs/ README.md examples/

# Update to new name
sed -i 's/@chamaileon-sdk\/plugin-interface/message-interface/g' README.md
```

#### Update Installation Instructions
```markdown
## Installation

\`\`\`bash
npm install message-interface
\`\`\`

## Usage

\`\`\`typescript
import { initFullscreenPlugin, initInlinePlugin, providePlugin } from 'message-interface';
\`\`\`
```

### 2. Create CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-XX-XX

### Changed
- 🎉 **BREAKING**: Package renamed from `@chamaileon-sdk/plugin-interface` to `message-interface`
- 🎉 **BREAKING**: Migrated entire codebase from JavaScript to TypeScript
- 🎉 **BREAKING**: Switched test framework from Jest to Vitest
- Updated ESLint to flat config format
- Updated all dependencies to latest versions

### Added
- TypeScript type definitions for all APIs
- Improved type safety across the codebase
- Better IDE support with TypeScript

### Removed
- Dropped support for JavaScript-only usage (TypeScript types now required)
- Removed Jest test configuration

### Migration Guide
See README.md for migration instructions from `@chamaileon-sdk/plugin-interface`.

## [1.1.1] and earlier

See git history for changes in the old `@chamaileon-sdk/plugin-interface` package.
```

### 3. Update Examples

Update examples to use new package name:

```bash
# Update examples/content-editor-example.html
# Change any references from old package to new package
```

### 4. Add MIGRATION.md (Optional but Recommended)

Create a dedicated migration guide:

```markdown
# Migration Guide: @chamaileon-sdk/plugin-interface → message-interface

## Why the rename?

[Explain the reason for the rename - broader scope, new organization, etc.]

## What changed?

### Package Name
- **Old**: `@chamaileon-sdk/plugin-interface`
- **New**: `message-interface`

### Version Reset
- **Old**: `v1.1.1`
- **New**: `v0.1.0` (indicates breaking changes)

### Language
- **Old**: JavaScript
- **New**: TypeScript (with type definitions)

## Step-by-step Migration

### 1. Update package.json
\`\`\`bash
npm uninstall @chamaileon-sdk/plugin-interface
npm install message-interface
\`\`\`

### 2. Update imports
\`\`\`typescript
// Before
import { initFullscreenPlugin } from '@chamaileon-sdk/plugin-interface';

// After
import { initFullscreenPlugin } from 'message-interface';
\`\`\`

### 3. Add TypeScript (if not already using)
If your project doesn't use TypeScript yet, you'll benefit from the included type definitions:
\`\`\`bash
npm install -D typescript @types/node
\`\`\`

### 4. Update API calls (if needed)
[Document any API changes after fixing issues #01-#05]

## Compatibility

- **Node.js**: v18+ recommended
- **TypeScript**: v5.0+ recommended
- **Browsers**: Same as before (ES2022+)

## Questions?

Open an issue at [repository URL]
```

### 5. Update Repository Settings

If this is on GitHub/GitLab/Bitbucket:
- Update repository description
- Update repository topics/tags
- Add migration notice to repository README
- Consider adding a deprecation notice to old package (if still published)

### 6. Deprecate Old Package (if applicable)

If `@chamaileon-sdk/plugin-interface` is published on npm:

```bash
npm deprecate @chamaileon-sdk/plugin-interface "Package has been renamed to 'message-interface'. Please migrate: npm install message-interface"
```

## Files to Create/Update

### Create:
- `CHANGELOG.md`
- `MIGRATION.md` (optional but recommended)

### Update:
- `README.md`
- `examples/content-editor-example.html`
- Any other documentation files

### Check:
- GitHub/GitLab repository description
- npm package page (after publishing)

## Decision Required

### Why was the package renamed?
Document the reasoning so users understand. Possible reasons:
- Broader scope (not just Chamaileon SDK)
- Organizational change
- Rebranding
- Making it more generic/reusable

This should be clearly communicated in the documentation.

## Testing

After documentation updates:
1. Review all docs for old package name references
2. Verify all example code uses new package name
3. Test that installation instructions work
4. Ensure changelog is accurate
5. Spell check all new documentation

## Related Issues
- This is a meta-issue about the overall migration
- Should be updated after #01-#05 are fixed to document API changes
- Related to #10 (test migration) - affects testing documentation

## Timeline

This should be completed:
1. **Before** publishing to npm
2. **Before** announcing the new package
3. **After** all critical issues (#01-#05) are fixed
