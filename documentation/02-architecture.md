# Architecture

This document describes the internal architecture of `@micskeil/postmessage-rpc`, including component structure, communication flow, and design decisions.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Communication Flow](#communication-flow)
5. [Design Decisions](#design-decisions)
6. [Security Model](#security-model)

## Overview

`@micskeil/postmessage-rpc` is built on three layers:

```
┌─────────────────────────────────────────────┐
│         High-Level API Layer                │
│  (initFullscreenPlugin, initInlinePlugin,   │
│   providePlugin)                            │
├─────────────────────────────────────────────┤
│         Core Plugin Layer                   │
│  (initPlugin, createInitPlugin)             │
├─────────────────────────────────────────────┤
│      PostMessage Communication Layer        │
│  (PostMessageSocket, MessageChannel)        │
└─────────────────────────────────────────────┘
```

## System Architecture

### Component Diagram

```
Parent Window                          Plugin Window (iframe)
┌──────────────────────────┐          ┌──────────────────────────┐
│                          │          │                          │
│  initFullscreenPlugin /  │          │                          │
│  initInlinePlugin        │          │     providePlugin        │
│         │                │          │            │             │
│         ▼                │          │            ▼             │
│    initPlugin            │          │   Register Methods       │
│         │                │          │   Register Hooks         │
│         ▼                │          │            │             │
│  createInitPlugin        │          │            │             │
│         │                │          │            │             │
│         ▼                │          │            ▼             │
│  PostMessageSocket ◄─────┼──────────┼───► PostMessageSocket   │
│    (currentWindow)       │postMessage│    (targetWindow)       │
│         │                │◄─────────►│            │             │
│         ▼                │          │            ▼             │
│  MessageChannels         │          │   MessageChannels        │
│  - domReady              │          │   - init                 │
│  - init                  │          │   - method1              │
│  - method1, method2...   │          │   - method2              │
│  - hook1, hook2...       │          │   - ...                  │
│         │                │          │            │             │
│         ▼                │          │            ▼             │
│   Methods Object         │          │    Hooks Object          │
│   (returned to parent)   │          │   (returned to plugin)   │
└──────────────────────────┘          └──────────────────────────┘
```

## Core Components

### 1. PostMessageSocket

**Location**: `src/postMessageSocket.ts`

The foundation of all communication. Manages message passing between two windows.

#### Responsibilities
- Send and receive messages via `postMessage`
- Create typed message channels
- Handle request-response patterns
- Validate message structure and source
- Generate unique message IDs
- Manage message handlers and cleanup

#### Key Methods
```typescript
class PostMessageSocket {
  // Create a bidirectional message channel
  createMessageChannel<T, U>(
    name: string,
    callback: (payload: T) => U,
    options?: { once: boolean }
  ): MessageChannel<T, U> | null;

  // Remove a specific listener
  removeListener(eventName: string): void;

  // Cleanup all listeners and state
  terminate(): void;

  // Private: Handle incoming messages
  private onMessage(event: MessageEvent): void;

  // Private: Validate message structure
  private validateMessage(message: unknown): message is Message;

  // Private: Generate unique message ID
  private getNextMsgId(): string;
}
```

#### Message ID Format
```
<counter>-<random>-<timestamp>
Example: "0-kj3h5a2-lmk9p4s"
```

#### Internal State
- `messageCounter`: Incremental counter for message IDs
- `isTerminated`: Boolean flag for lifecycle management
- `customEventListeners`: Map of event names to listener configs
- `answerHandlers`: Map of message IDs to promise resolvers
- `onMessageFn`: Bound message handler function

### 2. MessageChannel

**Location**: `src/types/index.ts`

Represents a bidirectional communication channel for a specific event.

```typescript
interface MessageChannel<T, U> {
  // Send without waiting for response
  send(payload: T, opts?: { msgId?: string }): ResultStrings.Success;

  // Send and wait for response
  sendAndWait(payload: T): Promise<SuccessResult<U>>;
}
```

### 3. initPlugin (Core Initialization)

**Location**: `src/initPlugin.ts`

Core plugin initialization logic used by both fullscreen and inline plugins.

#### Responsibilities
- Create PostMessageSocket between parent and plugin
- Manage initialization handshake
- Register hooks as message channels
- Wrap plugin methods as async functions
- Handle initialization timeout
- Return methods object to parent

#### Initialization Flow
```
1. Create PostMessageSocket(parent, iframe.contentWindow)
2. Setup hooks as message channels
3. Wait for "domReady" from plugin (with timeout)
4. Send "ackDomReady" acknowledgment
5. Send "init" with { data, settings, hooks[] }
6. Receive list of method names from plugin
7. Create method wrappers for each
8. Return { methods, terminate }
```

#### Timeout Handling
```typescript
if (timeout) {
  timeoutId = setTimeout(() => {
    messageSocket.terminate();
    container?.remove();
    reject(new Error(`Plugin initialization failed with timeout!`));
  }, timeout);
}
```

### 4. createInitPlugin

**Location**: `src/initPlugin.ts`

Helper that creates an iframe and calls `initPlugin`.

#### Responsibilities
- Create iframe element
- Set iframe attributes (src, styles)
- Call optional `beforeInit` hook
- Append iframe to container
- Delegate to `initPlugin`

### 5. initFullscreenPlugin

**Location**: `src/initFullscreenPlugin.ts`

High-level API for fullscreen overlay plugins.

#### Additional Features
- Fixed positioning overlay
- Show/hide animations (transform, opacity, scale)
- Z-index management for multiple overlays
- Optional splash screen support
- Destroy with cleanup

#### Return Interface
```typescript
interface FullscreenPluginInterface {
  methods: PluginMethods;
  show(opts?: AnimationOptions): void | Promise<void>;
  hide(): void | Promise<void>;
  showSplashScreen(): Promise<void> | undefined;
  hideSplashScreen(): void;
  destroy(): Promise<void>;
  _container: HTMLElement | null;
  _src: string;
}
```

### 6. initInlinePlugin

**Location**: `src/initInlinePlugin.ts`

High-level API for inline iframe plugins.

#### Characteristics
- Embeds in existing container
- No positioning/animation logic
- Simple destroy() method
- Minimal wrapper around createInitPlugin

#### Return Interface
```typescript
interface InlinePluginInterface {
  methods: PluginMethods;
  destroy(): void;
  _container: HTMLElement;
}
```

### 7. providePlugin

**Location**: `src/providePlugin.ts`

Plugin-side registration function called from within the iframe.

#### Responsibilities
- Create PostMessageSocket(iframe, parent)
- Automatically add "error" hook if not present
- Register all provided methods as message channels
- Wait for "init" message from parent
- Run optional validator on received data
- Create hook wrappers for parent callbacks
- Return { data, settings, hooks, terminate }

#### Registration Flow
```
1. Create PostMessageSocket(window, window.parent)
2. Add "error" hook if not in hooks array
3. Register each method as message channel
4. Register "init" listener (once: true)
5. Wait for parent to send "init"
6. Run validator on received data/settings
7. Create hook wrappers (sendAndWait functions)
8. Return { data, settings, hooks, terminate }
```

## Communication Flow

### Initialization Handshake

```
Time  │ Parent                    │ Plugin
──────┼───────────────────────────┼─────────────────────────
t0    │ initPlugin called         │
t1    │ Create PostMessageSocket  │
t2    │ Setup hooks channels      │
t3    │ Listen for "domReady"     │
t4    │                           │ DOM loaded
t5    │                           │ providePlugin called
t6    │                           │ Create PostMessageSocket
t7    │                           │ Register methods
t8    │                           │ Listen for "init"
t9    │                           │ Send "domReady" ───────►
t10   │ Receive "domReady"        │
t11   │ Send "ackDomReady" ──────►│
t12   │ Send "init" with data ───►│
t13   │                           │ Receive "init"
t14   │                           │ Run validator
t15   │                           │ Create hooks wrappers
t16   │                           │ Send method names ──────►
t17   │ Receive method names      │
t18   │ Create method wrappers    │
t19   │ Resolve promise           │ Resolve promise
t20   │ Return plugin interface   │ Return { data, settings, hooks }
```

### Method Call Flow

```
Parent calls: plugin.methods.someMethod(payload)
  │
  ├─→ PostMessageSocket.sendAndWait("someMethod", payload)
  │   │
  │   ├─→ postMessage({ id, name: "someMethod", payload, waitForResponse: true })
  │   │   │
  │   │   └─→ [Plugin] onMessage receives message
  │   │       │
  │   │       ├─→ Find "someMethod" listener
  │   │       │
  │   │       ├─→ Call callback(payload)
  │   │       │   │
  │   │       │   └─→ User's method implementation runs
  │   │       │       │
  │   │       │       └─→ Returns result
  │   │       │
  │   │       └─→ Send response: postMessage({ id, payload: result })
  │   │
  │   └─→ [Parent] onMessage receives response
  │       │
  │       └─→ Resolve promise with result
  │
  └─→ Return result to parent
```

### Hook Call Flow

```
Plugin calls: hooks.onSave(data)
  │
  ├─→ PostMessageSocket.sendAndWait("onSave", data)
  │   │
  │   ├─→ postMessage({ id, name: "onSave", payload: data, waitForResponse: true })
  │   │   │
  │   │   └─→ [Parent] onMessage receives message
  │   │       │
  │   │       ├─→ Find "onSave" listener (registered as hook)
  │   │       │
  │   │       ├─→ Call callback(data)
  │   │       │   │
  │   │       │   └─→ User's hook implementation runs
  │   │       │       │
  │   │       │       └─→ Returns result
  │   │       │
  │   │       └─→ Send response: postMessage({ id, payload: result })
  │   │
  │   └─→ [Plugin] onMessage receives response
  │       │
  │       └─→ Resolve promise with result
  │
  └─→ Return result to plugin
```

## Design Decisions

### 1. Promise-based API

**Decision**: Use async/await instead of callbacks

**Rationale**:
- Modern JavaScript pattern
- Better error handling
- Easier to reason about control flow
- Avoids callback hell

### 2. TypeScript First

**Decision**: Written in TypeScript with full type definitions

**Rationale**:
- Type safety prevents common bugs
- Better IDE support
- Self-documenting API
- Easier refactoring

### 3. Message Validation

**Decision**: Validate all incoming messages

**Rationale**:
- Security: Prevent malicious messages
- Reliability: Catch malformed data early
- Debugging: Clear error messages

### 4. Source Verification

**Decision**: Check `event.source === targetWindow`

**Rationale**:
- Security: Prevent messages from wrong origins
- Multiple iframes: Prevent cross-talk
- Isolation: Each socket only processes its target's messages

### 5. Unique Message IDs

**Decision**: Format `counter-random-timestamp`

**Rationale**:
- **Counter**: Ordering and debugging
- **Random**: Collision prevention
- **Timestamp**: Additional uniqueness and debugging

### 6. Once Listeners

**Decision**: Support `{ once: true }` option

**Rationale**:
- Handshake patterns (domReady, init)
- Automatic cleanup
- Prevents memory leaks

### 7. Bidirectional Channels

**Decision**: Both sides can send and listen on any channel

**Rationale**:
- Flexibility: Any communication pattern
- Symmetry: Same API on both sides
- Hooks and methods use same infrastructure

### 8. Explicit Termination

**Decision**: Require manual cleanup via `terminate()` or `destroy()`

**Rationale**:
- Predictable lifecycle
- Prevents premature cleanup
- Developer controls when resources are freed

### 9. Separation of Concerns

**Decision**: Three-layer architecture

**Rationale**:
- **PostMessageSocket**: Reusable communication primitive
- **initPlugin**: Core plugin logic
- **init*Plugin**: UI/UX concerns (fullscreen, inline)

### 10. Error Hook

**Decision**: Automatically add "error" hook if not present

**Rationale**:
- Consistent error handling
- Prevents silent failures
- Provides default error channel

## Security Model

### Message Validation

All messages must have:
```typescript
{
  id: string,
  name: string,
  payload: unknown,
  waitForResponse: boolean
}
```

Invalid messages are rejected with error.

### Source Verification

```typescript
if (event.source !== this.targetWindow) {
  this.errorCallback(ErrorStrings.NoSourceWindow);
  return;
}
```

Only messages from the target window are processed.

### Event Isolation

```typescript
event.stopImmediatePropagation();
```

Prevents message from bubbling to other handlers.

### No Origin Check?

**Current State**: The code uses `targetWindow.origin` when sending messages:
```typescript
this.targetWindow.postMessage(message, this.targetWindow.origin);
```

But it does NOT verify `event.origin` when receiving.

**Security Implication**:
- For same-origin: Safe
- For cross-origin: Potential vulnerability if targetWindow.origin changes

**Recommendation**: Add origin verification for production use:
```typescript
if (event.origin !== this.expectedOrigin) {
  return; // Reject messages from unexpected origins
}
```

### CORS Considerations

- iframe `src` must be accessible (no CORS errors)
- PostMessage works cross-origin, but data is serialized
- Cannot pass functions, DOM nodes, or other non-serializable data

## Memory Management

### Cleanup on Terminate

```typescript
terminate() {
  this.isTerminated = true;
  this.customEventListeners.clear();
  this.answerHandlers.clear();
  this.window.removeEventListener("message", this.onMessageFn);  // ⚠️ Currently missing!
}
```

**Note**: See [Task #05](../tasks/priority-1-critical/05-fix-terminate-memory-leak.md) - event listener removal is missing.

### Iframe Removal

```typescript
// Fullscreen
await plugin.destroy();  // Calls hide(), then container.remove()

// Inline
plugin.destroy();  // Removes all children from container
```

### Garbage Collection

Once terminated and iframe removed:
- PostMessageSocket can be garbage collected
- All closures and handlers are freed
- No memory leaks (assuming #05 is fixed)

## Performance Considerations

### Message Serialization

- `postMessage` serializes data using structured clone algorithm
- Large objects have serialization overhead
- Consider chunking large data transfers

### Animation Performance

Fullscreen plugin uses CSS transitions:
```typescript
container.style.transition = `all ${time}ms`;
```

- Uses GPU-accelerated properties (transform, opacity)
- Smooth 60fps animations
- Uses `requestAnimationFrame` for timing

### Z-index Management

```typescript
let currentZIndex = 0;
// Each show() increments:
currentZIndex++;
container.style.zIndex = currentZIndex;
```

Ensures newest plugin is always on top.

## Next Steps

- [API Reference](./03-api-reference.md) - Complete API documentation
- [Communication Protocol](./04-communication-protocol.md) - Message structure details
- [Development Guide](./06-development-guide.md) - Contributing to the project
