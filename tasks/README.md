# TypeScript Migration Tasks

This directory contains a comprehensive list of issues and improvements identified during the TypeScript migration review of the plugin-interface codebase.

## Task Organization

Tasks are organized by priority into three categories:

### 🔴 Priority 1: Critical (Must Fix)
**Location**: `priority-1-critical/`

These are **blocking issues** that prevent the code from running. They must be fixed before the package can be used.

| Task | File | Description | Impact |
|------|------|-------------|--------|
| #01 | `01-fix-readyChannel-undefined.md` | Fix undefined `readyChannel` variable | Plugin registration fails |
| #02 | `02-fix-initUpdateHooks-undefined.md` | Fix undefined `initUpdateHooks` function | Plugin init fails |
| #03 | `03-fix-postMessageSocket-api-mismatch.md` | Fix API method calls | Multiple runtime errors |
| #04 | `04-fix-vite-entry-point.md` | Fix Vite build config | Build fails |
| #05 | `05-fix-terminate-memory-leak.md` | Fix event listener cleanup | Memory leak |

**Recommendation**: Fix these in order (#01 → #02 → #03 → #04 → #05)

### 🟡 Priority 2: Type Safety (Should Fix)
**Location**: `priority-2-type-safety/`

These issues don't break the code but compromise TypeScript's benefits. Fix these to get proper type checking and IDE support.

| Task | File | Description |
|------|------|-------------|
| #06 | `06-fix-payload-typo.md` | Fix "playload" typo in type definition |
| #07 | `07-add-type-annotations.md` | Add missing type annotations to functions |
| #08 | `08-fix-import-extensions.md` | Standardize import statement extensions |

**Recommendation**: Fix after Priority 1, before publishing.

### 🟠 Priority 3: Design & Completeness (Nice to Have)
**Location**: `priority-3-design/`

These are improvements, documentation, and completeness issues. Fix these for a production-ready package.

| Task | File | Description |
|------|------|-------------|
| #09 | `09-fix-updateHooks-implementation.md` | Implement or remove updateHooks feature |
| #10 | `10-migrate-tests.md` | Migrate Jest tests to Vitest |
| #11 | `11-remove-unused-interface.md` | Remove unused Plugin interface |
| #12 | `12-update-package-documentation.md` | Update docs for package rename |

**Recommendation**: Fix after Priority 1 & 2 are done.

## Quick Start

### 1. Fix Critical Issues First
```bash
# Start with the most critical
cd priority-1-critical
cat 01-fix-readyChannel-undefined.md

# Work through them in order
```

### 2. Run Build After Each Fix
```bash
npm run build
npm test
```

### 3. Verify With Examples
```bash
static-server -c "*" -zp 8080
# Open http://localhost:8080/examples/content-editor-example.html
```

## Task Dependencies

Some tasks depend on others:

```
#01, #02, #03 ──→ #10 (need working code to test)
       ↓
      #04 ──────→ Build works
       ↓
      #05 ──────→ Memory safety

#07 ───────────→ #10 (tests need types)

#09 ───────────→ #02 (decision needed)

#12 ───────────→ #01-#05 (document API changes)
```

## Estimation

| Priority | Total Tasks | Estimated Time |
|----------|-------------|----------------|
| Priority 1 | 5 tasks | 4-8 hours |
| Priority 2 | 3 tasks | 2-4 hours |
| Priority 3 | 4 tasks | 4-6 hours |
| **Total** | **12 tasks** | **10-18 hours** |

## Progress Tracking

Use this checklist to track progress:

### Critical Issues
- [ ] #01 Fix readyChannel undefined
- [ ] #02 Fix initUpdateHooks undefined
- [ ] #03 Fix PostMessageSocket API mismatch
- [ ] #04 Fix Vite entry point
- [ ] #05 Fix terminate memory leak

### Type Safety
- [ ] #06 Fix payload typo
- [ ] #07 Add type annotations
- [ ] #08 Fix import extensions

### Design & Completeness
- [ ] #09 Fix updateHooks implementation
- [ ] #10 Migrate tests
- [ ] #11 Remove unused interface
- [ ] #12 Update package documentation

## Getting Help

Each task file contains:
- **Problem description**: What's wrong
- **Impact**: Why it matters
- **Solution**: How to fix it (with code examples)
- **Files to modify**: Where to make changes
- **Testing**: How to verify the fix
- **Related issues**: Dependencies and connections

## Questions?

If you need clarification on any task:
1. Read the detailed task file
2. Check related issues mentioned in the file
3. Review the code at the specified locations
4. Run the tests to see the failures

## Notes

- All file paths are relative to the project root
- Code examples in task files are suggestions, not requirements
- Feel free to improve upon the suggested solutions
- Run tests after each fix to catch regressions
- Update this README as tasks are completed
