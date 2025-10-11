# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**plugin-interface** (published as `@chamaileon-sdk/plugin-interface`) is a postMessage-based communication library that creates and maintains secure, standardized communication between window objects (e.g., a web page and an iframe). Built and maintained by Chamaileon.io for their plugin ecosystem (email editor, preview, gallery, etc.).

**Key Concepts:**

- **Parent-side initialization**: Use `initFullscreenPlugin` or `initInlinePlugin` to create an iframe and establish communication
- **Plugin-side registration**: Use `providePlugin` inside the plugin iframe to respond to initialization and expose methods/hooks
- **Bidirectional communication**: Built on `PostMessageSocket` class that handles message passing, request-response patterns, and event channels

## Development Commands

```bash
# Development server with TypeScript hot reload
npm run dev
# Opens at http://localhost:8765/

# Run examples (alias for dev, auto-opens browser)
npm run examples

# Build the library (outputs to dist/)
npm run build

# Build in watch mode for development
npm run build:watch

# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Lint and auto-fix
npm run lint-fix
```

## Interactive Examples

The project includes five interactive examples demonstrating different aspects of the plugin interface:

1. **Puppet Master** (`examples/puppet-master-example.html`) - Remote control demo showing real-time state synchronization
2. **Sync Monitor** (`examples/sync-monitor-example.html`) - Technical demo visualizing postMessage communication with metrics
3. **Color Echo Chamber** (`examples/color-echo-example.html`) - Visual demo of bidirectional data transformation
4. **Content Editor** (`examples/content-editor-example.html`) - Practical fullscreen plugin with animations
5. **Inline Ad** (`examples/inline-ad-example.html`) - Inline plugin embedded in page layout

Access all examples from the main landing page: `http://localhost:8765/examples/`

## Code Architecture

### Core Communication Layer: PostMessageSocket

**Location**: `src/postMessageSocket.ts`

The foundation of the entire library. Manages bidirectional communication between two windows using `postMessage` and event listeners.

**Key Features:**

- Creates message channels with typed request/response patterns
- Supports fire-and-forget messages (`send`) and request-response patterns (`sendAndWait`)
- Message validation and error handling with detailed error strings
- Unique message ID generation: `{counter}-{random}-{timestamp}`
- Answer handler pattern: promises that resolve when matching response arrives
- Termination cleanup: removes all listeners and clears state

**Important Implementation Details:**

- Each message must have: `id`, `name`, `payload`, `waitForResponse`
- Messages are validated before processing (`validateMessage`)
- Event source verification ensures messages come from expected window
- `stopImmediatePropagation` prevents event bubbling issues
- Once-listeners are automatically removed after first invocation

### Plugin Initialization (Parent Side)

**Files**: `src/initPlugin.ts`, `src/initFullscreenPlugin.ts`, `src/initInlinePlugin.ts`

**initPlugin** (core logic):

- Creates `PostMessageSocket` between parent window and iframe's `contentWindow`
- Establishes "domReady" handshake to ensure iframe is loaded
- Sends initialization data (data, settings, hooks) via "init" message channel
- Receives list of plugin methods and wraps them as async functions
- Implements timeout mechanism to reject if plugin doesn't respond
- Special handling for `updateHooks` method to manage hook lifecycle

**initFullscreenPlugin** (wrapper):

- Creates fullscreen overlay iframe with custom animations
- Provides `show()` / `hide()` with configurable transitions (translate3d, opacity, scale)
- Optional splash screen support if `settings.splashScreenUrl` is provided
- Returns interface with: `methods`, `show`, `hide`, `destroy`, `showSplashScreen`, `hideSplashScreen`

**initInlinePlugin** (wrapper):

- Creates inline iframe within specified container
- Simpler interface: just `methods` and `destroy`

### Plugin Registration (Plugin Side)

**File**: `src/providePlugin.ts`

Called inside the plugin iframe to register with parent:

- Creates `PostMessageSocket` (iframe → parent window)
- Automatically adds "error" hook if not present
- Registers all provided methods as message channels
- Waits for "init" message from parent (once-listener pattern)
- Runs optional validator function on received data/settings
- Returns promise resolving to: `{ data, settings, hooks, terminate }`

**Critical Detail**: There's a bug on line 84 - `readyChannel` is undefined but referenced. Should likely be a message channel created for "ready" or similar.

### Hook Update System

**File**: `src/updateHooks.ts`

Currently commented out. Original implementation allowed dynamic hook updates with two modes:

- **Merge mode** (`resetHooks: false`): Add new hooks to existing ones
- **Reset mode** (`resetHooks: true`): Remove all hooks and replace with new ones

### Type System

**Organization**: `src/types/` directory with separated files for better maintainability

#### Type Files:

**`src/types/result.ts`**: Result and error handling types
- `SafeResult<T>`: Rust-style result type `[T, null] | [null, Error]`
- `ResultStrings`: Enum for successful result string constants
- `SuccessResult<T>`: Represents successful result with typed data or success message
- `ErrorStrings`: Enum of all error messages for consistency

**`src/types/message.ts`**: Message and channel types
- `EventName`: String identifier for message channel names
- `Message`: Internal message structure with id, name, payload, waitForResponse
- `MessageChannel<T, U>`: Interface for typed message channels with `send` and `sendAndWait`

**`src/types/listener.ts`**: Event listener types
- `ListenerOptions`: Configuration interface for listener options (once flag)
- `CustomEventListener<T, U>`: Listener with callback, options, and message channel reference

**`src/types/plugin.ts`**: Plugin configuration and lifecycle types
- `Method`: Type for plugin methods and hook callbacks (sync/async)
- `Methods`: Map of method names to implementations
- `PluginConfig`: Configuration for plugin initialization (data, settings, hooks)
- `WindowConfig`: Window communication setup configuration
- `IframeOptions`: Options for creating and initializing iframe-based plugins
- `InitializedPlugin`: Interface returned by initPlugin (parent side)
- `ProvidedPlugin`: Interface returned by providePlugin (plugin side)
- `FullscreenPluginOptions`: Options for fullscreen plugin initialization
- `AnimationOptions`: Animation configuration for show/hide transitions
- `FullscreenPlugin`: Interface returned by initFullscreenPlugin
- `InlinePluginOptions`: Options for inline plugin initialization
- `InlinePlugin`: Interface returned by initInlinePlugin

**`src/types/index.ts`**: Central export file that re-exports all types from the above files

#### Design Principles:
- **Interfaces over types**: Using `interface` where possible for better extensibility
- **Separation of concerns**: Types grouped by functionality (result, message, listener, plugin)
- **Clear documentation**: Each type has JSDoc comments explaining its purpose
- **Type safety**: Strict TypeScript types throughout the codebase

## Testing Strategy

**Test Framework**: Vitest with jsdom environment

**Current Test Files**:

- `src/postMessageSocket.test.ts`: Core communication tests
- Legacy test files marked `.delete` during TypeScript migration

**Test Utilities**:

- `test/utils/fixEvents.ts`: Fixes jsdom event listener issues
- `test/utils/jsdomReset.ts`: Resets jsdom between tests

**Coverage Configuration**:

- Provider: Istanbul
- Excludes: generated files, interfaces, mocks, test files, bin
- Reports: text + HTML

## Migration Status

This codebase is **actively migrating from JavaScript to TypeScript**:

**Completed**:

- Core source files converted to `.ts`
- TypeScript configuration added (`tsconfig.json`)
- ESLint migrated to flat config with TypeScript support
- Vitest replacing Jest
- Type definitions in `src/types/index.ts`

**In Progress**:

- Test files being rewritten (old tests marked `.delete`)
- `src/providePlugin.ts` has compilation issues (line 84: `readyChannel` undefined)
- `src/updateHooks.ts` completely commented out, needs TypeScript rewrite

**Key Files to Watch**:

- `vite.config.ts`: Still references `src/main.js` (should be `src/main.ts` after full migration)
- Test utilities moved from `test/unit/testUtils/` to `test/utils/`

## Common Patterns

**Creating a Plugin Interface (Parent Side)**:

```typescript
const plugin = await initFullscreenPlugin(
  {
    data: {
      /* initial data */
    },
    settings: {
      /* plugin config */
    },
    hooks: {
      onSave: async (data) => {
        /* handle save */
      },
      onClose: async () => {
        /* handle close */
      },
    },
  },
  {
    src: "https://plugin-url.com",
    parentElem: document.body,
    timeout: 5000,
  },
);

// Call plugin methods
await plugin.methods.someMethod(payload);

// Cleanup
plugin.destroy();
```

**Providing a Plugin (Plugin Side)**:

```typescript
const { data, settings, hooks } = await providePlugin({
  hooks: ["onSave", "onClose"], // hooks this plugin accepts
  methods: {
    someMethod: async (payload) => {
      // method implementation
      return result;
    },
  },
  validator: ({ data, settings }) => {
    // validate initialization data
    if (!data.required) throw new Error("Missing required data");
  },
});

// Use hooks from parent
await hooks.onSave(data);
```

## Build Output

- **Format**: UMD and ES modules
- **Output**: `dist/pluginInterface.cjs` (CommonJS), `dist/pluginInterface.js` (ES module)
- **Sourcemaps**: Enabled
- **Entry**: Currently `src/main.js` (will be `src/main.ts` after migration)

## Important Notes

- **Event Listener Order**: Recent fix (commit 0c54296) addressed event listener order issues
- **TypeScript Strict Mode**: Enabled with `noImplicitAny`, `strictNullChecks`, but `strictPropertyInitialization: false`
- **Husky Pre-commit**: Configured but hooks must be installed via `npm run prepare`
- **Browser Target**: ES2022, expects modern browser with `postMessage` API
- **Security**: Always validates message source window to prevent XSS attacks
