# Fix initUpdateHooks Undefined Function

## Priority: CRITICAL
**Status:** 🔴 Blocking - Code will not run

## Location
`src/initPlugin.ts:57`

## Problem
The code calls `initUpdateHooks(messageSocket)` but this function is never defined or imported.

```typescript
// Line 57
const updateHooks = initUpdateHooks(messageSocket);  // ❌ function doesn't exist!
updateHooks({ hooks });
```

## Impact
- Runtime error: "initUpdateHooks is not a function"
- Plugin initialization fails immediately
- Parent-side plugin setup is completely broken

## Root Cause
The `updateHooks.ts` file was converted to TypeScript but the entire implementation is commented out. The initPlugin code still expects this function to exist.

## Solution Options

### Option A: Implement the function (if updateHooks is needed)
1. Uncomment and properly implement `src/updateHooks.ts`
2. Export `initUpdateHooks` as default
3. Import it in `src/initPlugin.ts`

```typescript
// In src/initPlugin.ts
import initUpdateHooks from "./updateHooks.js";
```

### Option B: Remove the feature (if updateHooks is not needed)
1. Remove the `initUpdateHooks` call from `src/initPlugin.ts`
2. Simplify hook handling to be static (no dynamic updates)
3. Delete or comment out `src/updateHooks.ts`

## Recommended Approach
Review the original JavaScript implementation to understand if dynamic hook updates are a required feature:
- If YES: Implement Option A
- If NO: Implement Option B

## Files to Modify
- `src/initPlugin.ts` (required)
- `src/updateHooks.ts` (if implementing)

## Testing
After fixing:
1. Run `npm run build`
2. Run `npm test`
3. Test plugin initialization from parent side
4. If implementing updateHooks: test dynamic hook replacement

## Dependencies
- None (but related to overall API design)
