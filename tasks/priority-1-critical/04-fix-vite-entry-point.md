# Fix Vite Entry Point to TypeScript

## Priority: CRITICAL
**Status:** 🔴 Build Configuration Error

## Location
`vite.config.ts:10`

## Problem
The Vite build configuration points to `src/main.js` but the file has been renamed to `src/main.ts` during the TypeScript migration.

```typescript
// Line 10 - ❌ Wrong entry point
entry: path.resolve(__dirname, "./src/main.js"),
```

## Impact
- Build will fail: "Entry file not found"
- Cannot generate distribution files
- Package cannot be published
- Development mode (`npm run dev`) will fail

## Root Cause
During the TypeScript migration, source files were renamed from `.js` to `.ts`, but the build configuration was not updated to reflect this change.

## Solution

Update the entry point to use `.ts` extension:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: "./dist",
    target: "esnext",
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "./src/main.ts"),  // ✅ Fixed
      name: "pluginInterface",
      fileName: (format) => {
        if (format === "umd") return "pluginInterface.cjs";
        return "pluginInterface.js";
      },
    },
  },
});
```

## Files to Modify
- `vite.config.ts`

## Testing
After fixing:
1. Run `npm run build` - should complete without errors
2. Verify `dist/pluginInterface.js` exists
3. Verify `dist/pluginInterface.cjs` exists
4. Check that sourcemaps are generated
5. Run `npm run dev` - watch mode should work
6. Import the built package in a test file to verify it works

## Additional Check
Verify that `package.json` exports point to the correct distribution files:
```json
{
  "exports": {
    ".": {
      "import": "./dist/pluginInterface.js",
      "require": "./dist/pluginInterface.cjs"
    }
  },
  "main": "./dist/pluginInterface.cjs",
  "module": "./dist/pluginInterface.js"
}
```

## Related Issues
- None (isolated configuration issue)
