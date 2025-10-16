# Fix or Remove updateHooks Implementation

## Priority: DESIGN & COMPLETENESS
**Status:** 🟠 Feature Incomplete

## Location
`src/updateHooks.ts` (entire file)

## Problem
The entire `updateHooks.ts` file is commented out, leaving the feature incomplete. The commented code shows it was supposed to allow dynamic hook updates during plugin lifecycle.

```typescript
// export default function initUpdateHooks(messageSocket) {
//   // ... entire implementation commented
// }
```

## Impact
- Feature is non-functional
- Dead code in codebase
- Unclear whether feature is needed or abandoned
- Blocks completion of #02 (initUpdateHooks undefined)

## Decision Required

### Question: Is dynamic hook updating a required feature?

**Use Case**: Dynamic hook updates would allow a parent application to:
```javascript
// Parent side
const plugin = await initFullscreenPlugin({ ... });

// Later, update hooks without recreating plugin
await plugin.methods.updateHooks({
  hooks: {
    onSave: newSaveHandler,
    onClose: newCloseHandler
  },
  resetHooks: false  // merge with existing
});
```

### Option A: Implement the Feature (if needed)

#### Benefits:
- Allows dynamic behavior changes
- Parent can update callbacks without plugin reload
- More flexible API

#### Implementation Steps:

1. **Uncomment and convert to TypeScript**
```typescript
// src/updateHooks.ts
import type { PostMessageSocket } from "./postMessageSocket";

export interface HookUpdateOptions {
  hooks: Record<string, ((...args: any[]) => void | Promise<void>) | null>;
  resetHooks?: boolean;
}

export default function initUpdateHooks(messageSocket: PostMessageSocket) {
  const currentMessageSocket = messageSocket;
  let hooksFromParent: Record<string, Function> = {};

  // Add error hook by default
  const errorChannel = currentMessageSocket.createMessageChannel(
    "error",
    (payload) => console.warn(payload)
  );

  return function updateHooks({ hooks, resetHooks = false }: HookUpdateOptions): string[] {
    if (resetHooks) {
      // Remove all existing hooks
      Object.keys(hooksFromParent).forEach((hook) => {
        currentMessageSocket.removeListener(hook);
      });
      hooksFromParent = hooks;
    } else {
      // Merge with existing hooks
      hooksFromParent = { ...hooksFromParent, ...hooks };
    }

    // Register or remove hooks
    Object.entries(hooksFromParent).forEach(([hook, fn]) => {
      if (typeof fn !== "function" || fn === null) {
        currentMessageSocket.removeListener(hook);
        return;
      }

      currentMessageSocket.createMessageChannel(hook, (payload) =>
        fn(payload)
      );
    });

    // Return list of active hooks
    return Object.keys(hooksFromParent).filter(
      (hook) =>
        typeof hooksFromParent[hook] === "function" &&
        hooksFromParent[hook] !== null
    );
  };
}
```

2. **Update initPlugin.ts to use it properly**
```typescript
import initUpdateHooks from "./updateHooks";

// In initPlugin:
const updateHooks = initUpdateHooks(messageSocket);
const activeHooks = updateHooks({ hooks, resetHooks: false });
```

3. **Expose updateHooks method to parent**
```typescript
// In providePlugin, register it as a method
methods: {
  updateHooks: async (payload) => {
    return updateHooks(payload);
  }
}
```

4. **Add tests**
- Test hook registration
- Test hook updates (merge mode)
- Test hook replacement (reset mode)
- Test removing hooks (set to null)

### Option B: Remove the Feature (if not needed)

#### Benefits:
- Simpler API
- Less code to maintain
- Hooks are immutable (predictable behavior)
- Remove dead code

#### Implementation Steps:

1. **Delete the file**
```bash
rm src/updateHooks.ts
```

2. **Remove updateHooks handling from initPlugin.ts**
```typescript
// Remove these lines:
const updateHooks = initUpdateHooks(messageSocket);
updateHooks({ hooks });

// Simplify to direct hook registration:
Object.entries(hooks).forEach(([name, handler]) => {
  messageSocket.createMessageChannel(name, handler);
});
```

3. **Remove special handling in methods**
```typescript
// Remove special case:
if (type === "updateHooks") {
  return await messageSocket.sendRequest(type, updateHooks(payload));
}
```

4. **Update documentation**
- Note that hooks are set at initialization and cannot be changed
- To change hooks, destroy and recreate the plugin

## Recommendation

**Choose Option B (Remove)** unless you have a specific use case for dynamic hooks.

### Reasoning:
1. **Simpler API**: Most plugin systems have immutable hooks
2. **Predictable behavior**: Plugin behavior doesn't change at runtime
3. **Less complexity**: Fewer edge cases and bugs
4. **Easy workaround**: Can always destroy and recreate plugin if hooks need to change

If dynamic hooks are needed later, they can be added as a feature in a future version with proper design.

## Files to Modify

### If implementing (Option A):
- `src/updateHooks.ts` - Implement properly
- `src/initPlugin.ts` - Fix usage
- `src/types/index.ts` - Add types
- `test/unit/updateHooks.spec.ts` - Write tests

### If removing (Option B):
- `src/updateHooks.ts` - Delete file
- `src/initPlugin.ts` - Remove updateHooks logic
- `test/unit/updateHooks.delete` - Delete old test file

## Testing
After implementing or removing:
1. Run `npm run build`
2. Run `npm test`
3. Test plugin initialization
4. If implemented: Test dynamic hook updates
5. Verify no broken references remain

## Related Issues
- Blocks #02 (initUpdateHooks undefined)
- Related to #03 (API mismatch) - affects overall API design
