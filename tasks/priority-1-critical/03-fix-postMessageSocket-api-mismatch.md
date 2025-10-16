# Fix PostMessageSocket API Mismatch

## Priority: CRITICAL
**Status:** 🔴 Blocking - Code will not run

## Location
`src/initPlugin.ts:61, 80, 81, 92, 94`

## Problem
The `initPlugin.ts` code calls methods on `PostMessageSocket` that don't exist:

```typescript
// Line 61 - ❌ addListener doesn't exist
messageSocket.addListener("domReady", onDomReady, { once: true });

// Line 80 - ❌ sendMessage doesn't exist
messageSocket.sendMessage("ackDomReady", {});

// Line 81, 92, 94 - ❌ sendRequest doesn't exist
const answer = await messageSocket.sendRequest("init", {...});
await messageSocket.sendRequest(type, updateHooks(payload));
await messageSocket.sendRequest(type, payload);
```

## Actual PostMessageSocket API
The `PostMessageSocket` class only has these public methods:
- `createMessageChannel<T, U>(name, callback, options)` - Returns `MessageChannel<T, U>`
- `removeListener(eventName)` - Removes a listener
- `terminate()` - Cleanup

The returned `MessageChannel` has:
- `send(payload, opts?)` - Fire and forget
- `sendAndWait(payload)` - Request/response

## Impact
- Multiple runtime errors: "method is not a function"
- Complete failure of parent-side initialization
- Cannot create or communicate with plugins

## Root Cause
During TypeScript migration, the API was refactored but `initPlugin.ts` was not updated to use the new API pattern.

## Solution

Replace method calls with proper `createMessageChannel` pattern:

```typescript
// OLD (broken)
messageSocket.addListener("domReady", onDomReady, { once: true });

// NEW (correct)
const domReadyChannel = messageSocket.createMessageChannel(
  "domReady",
  onDomReady,
  { once: true }
);
```

```typescript
// OLD (broken)
messageSocket.sendMessage("ackDomReady", {});
const answer = await messageSocket.sendRequest("init", {...});

// NEW (correct)
const ackChannel = messageSocket.createMessageChannel("ackDomReady", () => {});
ackChannel.send({});

const initChannel = messageSocket.createMessageChannel("init", () => {});
const answer = await initChannel.sendAndWait({...});
```

## Files to Modify
- `src/initPlugin.ts`

## Pattern Changes Required

### 1. One-time listeners
```typescript
// Create channel with once: true
const channel = messageSocket.createMessageChannel(
  "eventName",
  callbackFunction,
  { once: true }
);
```

### 2. Send without waiting
```typescript
const channel = messageSocket.createMessageChannel("event", () => {});
channel.send(payload);
```

### 3. Send and wait for response
```typescript
const channel = messageSocket.createMessageChannel("event", () => {});
const result = await channel.sendAndWait(payload);
```

## Testing
After fixing:
1. Run `npm run build`
2. Verify no TypeScript errors
3. Run `npm test`
4. Test with example HTML file
5. Verify full parent-plugin handshake works

## Related Issues
- Related to #01 (readyChannel) - both are handshake issues
- Related to #02 (initUpdateHooks) - all in same file
