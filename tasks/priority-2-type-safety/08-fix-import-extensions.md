# Fix Inconsistent Import Extensions

## Priority: TYPE SAFETY
**Status:** 🟡 Code Consistency Issue

## Locations
Import statements are inconsistent across TypeScript files:

### With `.js` extension:
- `src/initPlugin.ts:1` - `import PostMessageSocket from "./postMessageSocket.js"`
- `src/initFullscreenPlugin.ts:1` - `import { createInitPlugin } from "./initPlugin.js"`
- `src/initInlinePlugin.ts:1` - `import { createInitPlugin } from "./initPlugin.js"`

### Without extension:
- `src/providePlugin.ts:1` - `import PostMessageSocket from "./postMessageSocket"`
- `src/main.ts:1-3` - All imports lack extensions
- `src/postMessageSocket.ts:1-10` - Type imports lack extensions

## Problem
Mixing import styles creates:
1. **Inconsistent codebase** - confusing for developers
2. **Module resolution issues** - may cause bundler problems
3. **TypeScript configuration dependency** - relies on specific tsconfig.json settings

## Impact
- Inconsistent developer experience
- Potential module resolution errors in different environments
- May cause issues with different bundlers (Webpack, Rollup, etc.)
- Harder to maintain

## Background: TypeScript Import Extensions

In TypeScript, there are two common patterns:

### Pattern A: Use `.js` extensions (for compiled output)
```typescript
import PostMessageSocket from "./postMessageSocket.js";
```
- TypeScript compiler looks for `.ts` file but writes `.js` import in output
- Works with `"moduleResolution": "node16"` or `"nodenext"`
- More explicit about final output

### Pattern B: No extensions (let module resolution handle it)
```typescript
import PostMessageSocket from "./postMessageSocket";
```
- Relies on TypeScript's module resolution
- Works with `"moduleResolution": "node"`
- More concise, common in TypeScript projects

## Current Project Configuration

Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "esModuleInterop": true
  }
}
```

Since this is **not** using `"moduleResolution": "node16"`, the project doesn't require `.js` extensions.

## Recommended Solution

**Choose Pattern B** (no extensions) for consistency with:
- `package.json` `"type": "module"`
- Vite bundler (handles extensions automatically)
- Most TypeScript projects
- Cleaner, more maintainable code

### Changes Required

```typescript
// src/initPlugin.ts
-import PostMessageSocket from "./postMessageSocket.js";
+import PostMessageSocket from "./postMessageSocket";

// src/initFullscreenPlugin.ts
-import { createInitPlugin } from "./initPlugin.js";
+import { createInitPlugin } from "./initPlugin";

// src/initInlinePlugin.ts
-import { createInitPlugin } from "./initPlugin.js";
+import { createInitPlugin } from "./initPlugin";
```

## Alternative Solution

If you prefer Pattern A (with `.js` extensions), then:
1. Update `tsconfig.json` to use `"moduleResolution": "node16"` or `"nodenext"`
2. Add `.js` extensions to ALL imports in:
   - `src/providePlugin.ts`
   - `src/main.ts`
   - Type imports in `src/postMessageSocket.ts`

## Files to Modify (Recommended Path)
- `src/initPlugin.ts`
- `src/initFullscreenPlugin.ts`
- `src/initInlinePlugin.ts`

## Testing
After fixing:
1. Run `npm run build` - Should compile without errors
2. Run `npm test` - All tests should pass
3. Verify bundled output works correctly
4. Test with `examples/content-editor-example.html`
5. Verify no module resolution errors

## Related Issues
- Related to #07 (type annotations) - will be importing more types
- Related to #04 (vite config) - bundler must handle imports correctly

## References
- [TypeScript Module Resolution Docs](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [ECMAScript Modules in Node.js](https://nodejs.org/api/esm.html#import-specifiers)
