# API Reference

Complete API documentation for `message-interface`.

## Table of Contents

1. [Parent-Side API](#parent-side-api)
2. [Plugin-Side API](#plugin-side-api)
3. [Types and Interfaces](#types-and-interfaces)
4. [Error Handling](#error-handling)

## Parent-Side API

### initFullscreenPlugin

Creates a fullscreen overlay plugin with show/hide animations.

```typescript
function initFullscreenPlugin(
  pluginData: {
    data: unknown;
    settings: unknown;
    hooks: Record<string, (...args: any[]) => void | Promise<void>>;
  },
  options: {
    id: string;
    src: string;
    parentElem?: HTMLElement;
    beforeInit?: (ctx: { container: HTMLElement; iframe: HTMLIFrameElement }) => void;
    timeout?: number;
  }
): Promise<FullscreenPluginInterface>
```

#### Parameters

**pluginData.data**
- Type: `unknown`
- Description: Initial data to send to the plugin
- Example: `{ documentId: 'doc-123', userId: 'user-456' }`

**pluginData.settings**
- Type: `unknown`
- Description: Configuration settings for the plugin
- Example: `{ theme: 'dark', splashScreenUrl: '/loading.html' }`

**pluginData.hooks**
- Type: `Record<string, Function>`
- Description: Callbacks that the plugin can invoke
- Example: `{ onSave: async (data) => { /* ... */ } }`

**options.id**
- Type: `string`
- Required: Yes
- Description: Unique ID for the plugin container element

**options.src**
- Type: `string`
- Required: Yes
- Description: URL of the plugin HTML file

**options.parentElem**
- Type: `HTMLElement`
- Required: No
- Default: `document.body`
- Description: Parent element to append the plugin container to

**options.beforeInit**
- Type: `(ctx: { container, iframe }) => void`
- Required: No
- Description: Callback invoked before iframe is appended

**options.timeout**
- Type: `number` (milliseconds)
- Required: No
- Default: No timeout
- Description: Maximum time to wait for plugin initialization

#### Returns

Promise that resolves to:

```typescript
interface FullscreenPluginInterface {
  // Plugin methods exposed by providePlugin
  methods: Record<string, (payload: any) => Promise<any>>;

  // Show the plugin with animation
  show(opts?: {
    x?: string;        // Transform x (default: '-100vw')
    y?: string;        // Transform y (default: '0px')
    opacity?: number;  // Initial opacity (default: 0.5)
    scale?: number;    // Initial scale (default: 1)
    time?: number;     // Animation duration in ms (default: 500)
  }): void | Promise<void>;

  // Hide the plugin with animation
  hide(): void | Promise<void>;

  // Show splash screen (if splashScreenUrl provided)
  showSplashScreen(): Promise<void> | undefined;

  // Hide splash screen
  hideSplashScreen(): void;

  // Destroy plugin and cleanup
  destroy(): Promise<void>;

  // Internal: Plugin container element
  _container: HTMLElement | null;

  // Internal: Plugin source URL
  _src: string;
}
```

#### Example

```typescript
const plugin = await initFullscreenPlugin(
  {
    data: { userId: 123 },
    settings: { theme: 'dark' },
    hooks: {
      onSave: async (data) => {
        console.log('Save:', data);
        return { success: true };
      }
    }
  },
  {
    id: 'my-plugin',
    src: 'https://example.com/plugin.html',
    timeout: 5000
  }
);

// Show with slide-in animation
plugin.show({ x: '-100vw', time: 300 });

// Call plugin methods
const result = await plugin.methods.getData();

// Hide when done
await plugin.hide();

// Cleanup
await plugin.destroy();
```

---

### initInlinePlugin

Creates an inline plugin embedded in a container.

```typescript
function initInlinePlugin(
  pluginData: {
    data: unknown;
    settings: unknown;
    hooks: Record<string, Function>;
  },
  options: {
    src: string;
    container: HTMLElement;
    beforeInit?: (ctx: { container, iframe }) => void;
    timeout?: number;
  }
): Promise<InlinePluginInterface>
```

#### Parameters

Same as `initFullscreenPlugin` except:
- No `id` parameter (uses provided container)
- No `parentElem` parameter (container is explicit)

#### Returns

```typescript
interface InlinePluginInterface {
  methods: Record<string, (payload: any) => Promise<any>>;
  destroy(): void;
  _container: HTMLElement;
}
```

#### Example

```typescript
const container = document.getElementById('plugin-container')!;

const plugin = await initInlinePlugin(
  {
    data: { /* ... */ },
    settings: { /* ... */ },
    hooks: { /* ... */ }
  },
  {
    src: './plugin.html',
    container
  }
);

// Use plugin
await plugin.methods.doSomething();

// Cleanup
plugin.destroy();
```

---

## Plugin-Side API

### providePlugin

Registers the plugin with the parent window.

```typescript
function providePlugin(
  options?: {
    hooks?: string[];
    methods?: Record<string, (payload: any) => any | Promise<any>>;
    validator?: (args: { data?: unknown; settings?: unknown }) => void;
  },
  currentWindow?: Window,
  targetWindow?: Window
): Promise<{
  data: unknown;
  settings: unknown;
  hooks: Record<string, (payload: any) => Promise<any>>;
  terminate: () => void;
}>
```

#### Parameters

**options.hooks**
- Type: `string[]`
- Required: No
- Default: `[]`
- Description: Names of hooks this plugin accepts from parent
- Note: `"error"` is automatically added if not present

**options.methods**
- Type: `Record<string, Function>`
- Required: No
- Default: `{}`
- Description: Methods to expose to the parent

**options.validator**
- Type: `(args) => void`
- Required: No
- Description: Validation function run on initialization
- Throws: Error if validation fails

**currentWindow**
- Type: `Window`
- Required: No
- Default: `window`
- Description: The plugin's window (usually `window`)

**targetWindow**
- Type: `Window`
- Required: No
- Default: `window.parent`
- Description: The parent window to communicate with

#### Returns

Promise that resolves to:

```typescript
{
  // Data sent from parent
  data: unknown;

  // Settings sent from parent
  settings: unknown;

  // Hook wrappers to call parent callbacks
  hooks: Record<string, (payload: any) => Promise<any>>;

  // Cleanup function
  terminate: () => void;
}
```

#### Example

```typescript
const { data, settings, hooks } = await providePlugin({
  // Define hooks we accept
  hooks: ['onSave', 'onClose', 'onError'],

  // Expose methods to parent
  methods: {
    getData: async () => {
      return { content: editor.getContent() };
    },

    setData: async (newData) => {
      editor.setContent(newData.content);
      return { success: true };
    },

    validate: async () => {
      const isValid = editor.validate();
      return { valid: isValid };
    }
  },

  // Validate initialization
  validator: ({ data, settings }) => {
    if (!data || !data.documentId) {
      throw new Error('documentId is required');
    }
  }
});

// Use received data
console.log('Document ID:', data.documentId);

// Call parent hooks
await hooks.onSave({ content: editor.getContent() });

// Handle errors
try {
  // ... risky operation
} catch (error) {
  await hooks.onError({ message: error.message });
}
```

---

## Types and Interfaces

### Core Types

```typescript
// Rust-style result type
export type SafeResult<T> =
  | [T, null]      // Success
  | [null, Error]; // Failure

// Success result
export enum ResultStrings {
  Success = "Success",
}
export type SuccessResult<T> = T | ResultStrings.Success;

// Event name type
export type EventName = string;
```

### Message Types

```typescript
// Message structure
export interface Message {
  name: EventName;
  id: string;
  payload: unknown;
  waitForResponse: boolean;
}

// Message channel interface
export interface MessageChannel<T, U> {
  send(payload: T, opts?: { msgId?: string }): ResultStrings.Success;
  sendAndWait(payload: T): Promise<SuccessResult<U>>;
}

// Event listener configuration
export interface CustomEventListener<T, U> {
  callback: (payload: T) => U;
  options: ListenerOptions;
  messageChannel: MessageChannel<T, U>;
}

export interface ListenerOptions {
  once: boolean;
}
```

### Error Strings

```typescript
export enum ErrorStrings {
  SocketIsTerminated = "Socket is terminated",
  NoTargetWindow = "No target window",
  NoSourceWindow = "The source window is not the target window",
  NoMessageChannel = "No message channel:",
  NoEventListener = "No event listener",
  NoEventName = "No event name",
  NoMessageId = "No message id",
  NoMessagePayload = "No message payload",
  WrongMessagePayload = "Wrong message payload format",
  NoMessageResponse = "No message response",
  NoMessageWaitForResponse = "No message wait for response",
}
```

---

## Error Handling

### Initialization Errors

#### Timeout Error
```typescript
try {
  const plugin = await initFullscreenPlugin(
    { /* ... */ },
    { src: './plugin.html', timeout: 5000 }
  );
} catch (error) {
  // Error: Plugin initialization failed with timeout!
  console.error('Plugin timed out:', error);
}
```

#### Validation Error
```typescript
// In plugin
const { data, settings, hooks } = await providePlugin({
  validator: ({ data }) => {
    if (!data.required) {
      throw new Error('Missing required field');
    }
  }
}).catch(error => {
  console.error('Validation failed:', error);
  // Plugin initialization rejected
});
```

### Runtime Errors

#### Method Call Errors
```typescript
try {
  const result = await plugin.methods.riskyMethod(payload);
} catch (error) {
  console.error('Method call failed:', error);
}
```

#### Hook Call Errors
```typescript
// In plugin
try {
  await hooks.onSave(data);
} catch (error) {
  console.error('Hook failed:', error);
  // Handle error in plugin
}
```

### Error Hook Pattern

```typescript
// Parent side
const plugin = await initFullscreenPlugin(
  {
    data: { /* ... */ },
    settings: { /* ... */ },
    hooks: {
      // Error hook automatically added
      error: async (errorInfo) => {
        console.error('Plugin error:', errorInfo);
        // Display to user, log to server, etc.
      }
    }
  },
  { /* ... */ }
);

// Plugin side
const { hooks } = await providePlugin({
  methods: {
    riskyOperation: async () => {
      try {
        // ... operation
      } catch (error) {
        // Notify parent of error
        await hooks.error({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
        throw error; // Re-throw if needed
      }
    }
  }
});
```

### PostMessageSocket Errors

Errors are sent to the `errorCallback` (default: `console.error`):

```typescript
// Custom error handler
const socket = new PostMessageSocket(
  window,
  iframe.contentWindow,
  (error) => {
    // Custom error handling
    console.warn('Socket error:', error);
    logToServer(error);
  }
);
```

Common errors:
- `"Socket is terminated"` - Trying to use terminated socket
- `"The source window is not the target window"` - Message from wrong source
- `"No message channel: <name>"` - No listener registered for event
- `"Wrong message payload format"` - Invalid message structure

---

## Advanced Usage

### Custom Window References

```typescript
// For testing or special cases
const socket = new PostMessageSocket(
  customWindow,
  customTargetWindow,
  customErrorCallback
);
```

### Method with Complex Types

```typescript
// Plugin side
const { data, settings, hooks } = await providePlugin({
  methods: {
    complexMethod: async (payload: {
      action: 'create' | 'update' | 'delete';
      data: { id: number; content: string };
      options?: { validate?: boolean };
    }) => {
      // TypeScript ensures payload structure
      switch (payload.action) {
        case 'create': /* ... */
        case 'update': /* ... */
        case 'delete': /* ... */
      }
      return { success: true, id: payload.data.id };
    }
  }
});
```

### Conditional Hooks

```typescript
// Parent side
const hooks: Record<string, Function> = {
  onSave: async (data) => { /* ... */ }
};

// Only add onClose if needed
if (userCanClose) {
  hooks.onClose = async () => { /* ... */ };
}

const plugin = await initFullscreenPlugin(
  { data, settings, hooks },
  { /* ... */ }
);
```

---

## Next Steps

- [Communication Protocol](./04-communication-protocol.md) - Understand message structure
- [Examples and Patterns](./05-examples-and-patterns.md) - Real-world examples
- [Testing Guide](./07-testing-guide.md) - Testing your plugins
