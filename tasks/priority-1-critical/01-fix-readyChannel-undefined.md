# Fix readyChannel Undefined Error

## Priority: CRITICAL
**Status:** 🔴 Blocking - Code will not run

## Location
`src/providePlugin.ts:84`

## Problem
The code references `readyChannel.sendAndWait({})` but the variable `readyChannel` is never defined or imported.

```typescript
// Line 84
readyChannel.sendAndWait({});  // ❌ readyChannel is undefined!
```

## Impact
- Runtime error: "readyChannel is not defined"
- Plugin registration completely broken
- Any code calling `providePlugin()` will fail

## Root Cause
During the TypeScript migration, the initialization handshake between parent and plugin was not fully implemented. The plugin needs to signal to the parent that it's ready to receive the "init" message.

## Solution

The plugin should create a message channel for "domReady" and use it to signal readiness:

```typescript
// Create the message channel before using it
const readyChannel = messageSocket.createMessageChannel("domReady", () => {});

// Register init listener
messageSocket.createMessageChannel("init", onInit, { once: true });

// Signal ready to parent
readyChannel.sendAndWait({});
```

## Files to Modify
- `src/providePlugin.ts`

## Testing
After fixing:
1. Run `npm run build` to ensure no compilation errors
2. Run `npm test` to verify all tests pass
3. Test with `examples/content-editor-example.html`
4. Verify plugin initialization completes without errors

## Related Issues
- This is related to #03 (API mismatch) - the parent side expects "domReady" message
