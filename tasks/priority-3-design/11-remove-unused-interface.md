# Remove Unused Plugin Interface

## Priority: DESIGN & COMPLETENESS
**Status:** 🟠 Code Cleanup

## Location
`src/initPlugin.ts:5-17`

## Problem
The `Plugin` interface is defined but never used anywhere in the codebase.

```typescript
// Lines 5-17 - Never used
interface Plugin {
  plugin: {
    data: unknown;
    settings: unknown;
    methods: Record<string, Method>;
  };
  settings: {
    currentWindow: Window;
    targetWindow: Window;
    timeout?: number | null;
    container?: HTMLElement;
  };
}
```

## Impact
- **Dead code**: Clutters the codebase
- **Maintenance burden**: Must be updated even though unused
- **Confusion**: Developers may think it's part of the API
- **Incorrect structure**: Doesn't match actual return types

## Analysis

### Where it should be used (but isn't):
Looking at the actual return values and parameters, this interface doesn't match anything:

1. **initPlugin returns**:
```typescript
{
  methods: Record<string, Method>,
  terminate: () => void
}
```
❌ Doesn't match `Plugin` interface

2. **createInitPlugin returns**:
Same as initPlugin
❌ Doesn't match `Plugin` interface

3. **initFullscreenPlugin returns**:
```typescript
{
  _container: HTMLElement | null,
  _src: string,
  methods: PluginMethods,
  showSplashScreen: () => Promise<void> | undefined,
  hideSplashScreen: () => void,
  show: (...) => void | Promise<void>,
  hide: () => void | Promise<void>,
  destroy: () => Promise<void>
}
```
❌ Doesn't match `Plugin` interface

### Why it exists:
Likely a leftover from an earlier design iteration that was refactored.

## Solution

### Option A: Remove It (Recommended)
Simply delete the unused interface:

```typescript
// DELETE lines 5-17
interface Plugin {
  // ...
}
```

**Reasoning:**
- It's not used anywhere
- The structure doesn't match actual types
- Real types should be defined properly in `src/types/index.ts` (see #07)

### Option B: Use It (Not Recommended)
Try to retrofit it to match current code. **Don't do this** because:
- The structure is wrong
- Better types should be in `src/types/index.ts`
- Would require significant refactoring for no benefit

## Files to Modify
- `src/initPlugin.ts` (remove lines 5-17)

## Verification

After removal, search for any references:
```bash
# Should return no results
grep -r "Plugin" src/ --include="*.ts" | grep -v "// Plugin" | grep -v "initPlugin"
```

## Testing
After removing:
1. Run `npm run build` - Should compile without errors
2. Run `npm run lint` - No linting issues
3. Run `npm test` - All tests should pass
4. Verify TypeScript doesn't complain about missing type

## Related Issues
- Related to #07 (add type annotations) - proper types should be defined there
- Part of general code cleanup and technical debt reduction

## Notes
This is a simple cleanup task that can be done independently. It's low risk and improves code quality.
