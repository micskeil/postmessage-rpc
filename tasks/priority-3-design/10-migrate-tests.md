# Migrate Tests from Jest to Vitest

## Priority: DESIGN & COMPLETENESS
**Status:** 🟠 Incomplete Migration

## Locations
- `test/unit/initPlugin.delete` (old test, renamed but not migrated)
- `test/unit/providePlugin.delete` (old test, renamed but not migrated)
- `test/unit/updateHooks.delete` (old test, renamed but not migrated)
- `src/providePlugin.test.delete` (test in wrong location)

## Problem
The codebase migrated from Jest to Vitest, but:
1. Old tests were renamed with `.delete` extension instead of being migrated
2. Only `postMessageSocket.test.ts` has been properly migrated
3. Core functionality (`initPlugin`, `providePlugin`) has no test coverage
4. New test file is in wrong location (`src/` instead of `test/`)

## Impact
- **No test coverage** for critical initialization code
- **Can't verify** that fixes for issues #01-#05 actually work
- **Regression risk** - changes may break existing functionality undetected
- **Quality concerns** - untested code in a communication library is risky

## Current Test Status

| Module | Old Test (Jest) | New Test (Vitest) | Status |
|--------|----------------|-------------------|---------|
| postMessageSocket | ✅ Deleted | ✅ `src/postMessageSocket.test.ts` | Complete |
| initPlugin | 📁 `.delete` | ❌ None | **Missing** |
| providePlugin | 📁 `.delete` | ⚠️ `src/providePlugin.test.delete` | **Wrong location** |
| updateHooks | 📁 `.delete` | ❌ None | **Missing** |
| initFullscreenPlugin | ❌ None | ❌ None | **Never existed** |
| initInlinePlugin | ❌ None | ❌ None | **Never existed** |

## Migration Strategy

### Step 1: Review Old Tests

Read the old Jest tests to understand what was being tested:

```bash
# Review old test logic
cat test/unit/initPlugin.delete
cat test/unit/providePlugin.delete
cat test/unit/updateHooks.delete
```

Key scenarios to preserve:
- Plugin initialization handshake
- Message passing between parent and plugin
- Timeout handling
- Error cases
- Hook registration and invocation

### Step 2: Create New Vitest Tests

Create properly structured Vitest tests with TypeScript:

#### `test/unit/initPlugin.test.ts`
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import initPlugin from '../../src/initPlugin';
import PostMessageSocket from '../../src/postMessageSocket';

describe('initPlugin', () => {
  let mockWindow: Window;
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    // Setup mock windows
    mockWindow = window;
    mockIframe = document.createElement('iframe');
    document.body.appendChild(mockIframe);
  });

  it('should initialize plugin and return methods', async () => {
    // Test basic initialization
  });

  it('should timeout if plugin does not respond', async () => {
    // Test timeout handling
  });

  it('should handle domReady handshake', async () => {
    // Test handshake protocol
  });

  it('should register all hooks provided', async () => {
    // Test hook registration
  });

  // ... more tests
});
```

#### `test/unit/providePlugin.test.ts`
Move and rewrite `src/providePlugin.test.delete`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import providePlugin from '../../src/providePlugin';

describe('providePlugin', () => {
  it('should register plugin with parent', async () => {
    // Test plugin registration
  });

  it('should validate initialization data', async () => {
    // Test validator function
  });

  it('should expose methods to parent', async () => {
    // Test method exposure
  });

  it('should handle initialization failure', async () => {
    // Test error cases
  });

  // ... more tests
});
```

#### `test/unit/updateHooks.test.ts` (if keeping feature)
Only create if updateHooks is implemented (see #09).

#### `test/integration/fullscreen-plugin.test.ts` (new)
```typescript
import { describe, it, expect } from 'vitest';
import initFullscreenPlugin from '../../src/initFullscreenPlugin';

describe('initFullscreenPlugin', () => {
  it('should create fullscreen overlay', async () => {
    // Test overlay creation
  });

  it('should show/hide with animation', async () => {
    // Test show/hide functionality
  });

  it('should handle splash screen', async () => {
    // Test splash screen
  });

  // ... more tests
});
```

#### `test/integration/inline-plugin.test.ts` (new)
```typescript
import { describe, it, expect } from 'vitest';
import initInlinePlugin from '../../src/initInlinePlugin';

describe('initInlinePlugin', () => {
  it('should create inline iframe in container', async () => {
    // Test inline plugin creation
  });

  it('should destroy cleanly', async () => {
    // Test cleanup
  });

  // ... more tests
});
```

### Step 3: Integration Tests

Create end-to-end tests that verify parent-plugin communication:

#### `test/integration/parent-plugin-communication.test.ts`
```typescript
describe('Parent-Plugin Communication', () => {
  it('should establish full communication between parent and plugin', async () => {
    // Setup: Create parent and plugin in separate contexts
    // Test: Full initialization handshake
    // Test: Method calls from parent to plugin
    // Test: Hook calls from plugin to parent
    // Test: Proper cleanup
  });
});
```

### Step 4: Test Utilities

Update test utilities for Vitest:
- ✅ `test/utils/fixEvents.ts` - Already migrated
- ✅ `test/utils/jsdomReset.ts` - Already migrated
- Add more helpers as needed

### Step 5: Cleanup

After successful migration:
```bash
# Remove old test files
rm test/unit/initPlugin.delete
rm test/unit/providePlugin.delete
rm test/unit/updateHooks.delete
rm src/providePlugin.test.delete
```

## Test Coverage Goals

Aim for:
- **Line coverage**: > 80%
- **Branch coverage**: > 75%
- **Function coverage**: > 90%

Run coverage:
```bash
npm test
```

View coverage report:
```bash
open coverage/index.html
```

## Files to Create

### Required:
- `test/unit/initPlugin.test.ts`
- `test/unit/providePlugin.test.ts`

### Optional (based on decisions):
- `test/unit/updateHooks.test.ts` (if feature kept)
- `test/integration/fullscreen-plugin.test.ts`
- `test/integration/inline-plugin.test.ts`
- `test/integration/parent-plugin-communication.test.ts`

### To Delete:
- `test/unit/initPlugin.delete`
- `test/unit/providePlugin.delete`
- `test/unit/updateHooks.delete`
- `src/providePlugin.test.delete`

## Testing

After migration:
1. Run `npm test` - All tests should pass
2. Run `npm run test:watch` - Verify watch mode works
3. Run `npm run test:ui` - Check Vitest UI
4. Check coverage report - Verify adequate coverage
5. Run `npm run build` - Verify no side effects

## Dependencies

### Blocks:
- Cannot fully verify fixes for issues #01-#05 without tests

### Blocked By:
- Should fix #01-#05 first, then write tests that verify the fixes
- Should decide on #09 (updateHooks) before migrating updateHooks tests

## Related Issues
- Related to #07 (type annotations) - tests need proper types
- Related to #09 (updateHooks) - affects which tests to migrate
- Enables verification of #01-#05 fixes
