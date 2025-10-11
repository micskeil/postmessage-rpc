# Fix Memory Leak in PostMessageSocket.terminate()

## Priority: CRITICAL
**Status:** 🔴 Memory Leak / Resource Leak

## Location
`src/postMessageSocket.ts:234-238`

## Problem
The `terminate()` method clears internal state but never removes the event listener from the window. This causes:
1. Memory leak - the PostMessageSocket instance cannot be garbage collected
2. Event listener continues receiving messages even after termination
3. Multiple plugin lifecycles will accumulate event listeners

```typescript
// Current implementation (line 234-238)
terminate() {
  this.isTerminated = true;
  this.customEventListeners.clear();
  this.answerHandlers.clear();
  // ❌ Missing: Event listener removal!
}
```

## Impact
- **Memory Leak**: Each plugin initialization creates a permanent event listener
- **Performance degradation**: Multiple terminated sockets still processing messages
- **Resource exhaustion**: After many plugin open/close cycles, browser performance degrades
- **Unexpected behavior**: Terminated sockets may still trigger error callbacks

## Root Cause
The event listener is added in the constructor but never removed:

```typescript
// Line 46 - listener added
this.window.addEventListener("message", this.onMessageFn);

// But terminate() never removes it!
```

## Solution

Add event listener cleanup to the `terminate()` method:

```typescript
terminate() {
  this.isTerminated = true;
  this.customEventListeners.clear();
  this.answerHandlers.clear();

  // ✅ Clean up event listener
  this.window.removeEventListener("message", this.onMessageFn);
}
```

## Why This Matters

### Memory Leak Example
```typescript
// User opens plugin 100 times during a session
for (let i = 0; i < 100; i++) {
  const plugin = await initFullscreenPlugin({...});
  // ... use plugin ...
  plugin.destroy(); // Calls terminate()
}

// Result: 100 event listeners still attached to window!
// Each PostMessageSocket instance cannot be garbage collected
```

### Performance Impact
Every postMessage event to the window will:
1. Call ALL 100+ event listeners
2. Each checks if message is for them
3. Each calls errorCallback for wrong source
4. Browser performance degrades significantly

## Files to Modify
- `src/postMessageSocket.ts`

## Testing
After fixing:

### 1. Memory Leak Test
```javascript
// In browser console
const before = performance.memory.usedJSHeapSize;

for (let i = 0; i < 50; i++) {
  const plugin = await initFullscreenPlugin({...});
  await plugin.destroy();
}

const after = performance.memory.usedJSHeapSize;
console.log('Memory increase:', after - before);
// Should be minimal, not proportional to loop count
```

### 2. Event Listener Count Test
```javascript
// Check listener count (Chrome DevTools)
getEventListeners(window).message.length
// Should not increase after plugin destroy
```

### 3. Functional Test
```typescript
const socket = new PostMessageSocket(window, iframe.contentWindow);
socket.terminate();

// Verify no more messages processed
// Verify no error callbacks triggered
// Verify object can be garbage collected
```

## Related Issues
- This affects all plugin types: fullscreen, inline
- Related to proper cleanup in `initFullscreenPlugin.destroy()` and `initInlinePlugin.destroy()`
