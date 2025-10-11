# Getting Started with message-interface

This guide will help you get up and running with `message-interface` in minutes.

## Installation

### NPM
```bash
npm install message-interface
```

### Yarn
```bash
yarn add message-interface
```

### PNPM
```bash
pnpm add message-interface
```

## Requirements

- **Node.js**: v18+ recommended
- **TypeScript**: v5.0+ (optional but recommended)
- **Browser**: Modern browsers with ES2022 support

## Basic Concepts

`message-interface` enables secure communication between two windows using postMessage:

1. **Parent Window**: The main application that embeds the plugin
2. **Plugin Window**: The iframe that runs plugin code
3. **Methods**: Functions exposed by the plugin to the parent
4. **Hooks**: Callbacks provided by the parent to the plugin

```
┌─────────────────────────────────────────┐
│         Parent Application              │
│  ┌───────────────────────────────────┐  │
│  │     Plugin (iframe)               │  │
│  │                                   │  │
│  │  Methods ←─── Parent calls        │  │
│  │  Hooks   ───→ Plugin calls        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Quick Start Example

### 1. Create a Simple Plugin (plugin.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Simple Plugin</title>
  <script type="module">
    import { providePlugin } from 'message-interface';

    // Register plugin with parent
    const { data, settings, hooks } = await providePlugin({
      // Define hooks this plugin accepts
      hooks: ['onSave', 'onClose'],

      // Define methods exposed to parent
      methods: {
        getData: async () => {
          return { message: 'Hello from plugin!' };
        },

        setContent: async (content) => {
          document.getElementById('content').textContent = content;
          return { success: true };
        }
      },

      // Optional: Validate initialization data
      validator: ({ data, settings }) => {
        if (!data) throw new Error('No data provided');
      }
    });

    // Display initial data
    console.log('Received data:', data);
    console.log('Received settings:', settings);

    // Use hooks to communicate with parent
    document.getElementById('saveBtn').addEventListener('click', async () => {
      const result = await hooks.onSave({
        content: document.getElementById('content').textContent
      });
      console.log('Save result:', result);
    });
  </script>
</head>
<body>
  <h1>Plugin Content</h1>
  <div id="content">Initial content</div>
  <button id="saveBtn">Save</button>
</body>
</html>
```

### 2. Initialize Plugin from Parent (app.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Parent Application</title>
  <script type="module">
    import { initFullscreenPlugin } from 'message-interface';

    // Initialize fullscreen plugin
    const plugin = await initFullscreenPlugin(
      {
        // Data to send to plugin
        data: {
          userId: 123,
          initialContent: 'Hello Plugin!'
        },

        // Plugin configuration
        settings: {
          theme: 'dark',
          splashScreenUrl: '/loading.html'
        },

        // Hooks - callbacks for plugin to call
        hooks: {
          onSave: async (data) => {
            console.log('Plugin wants to save:', data);
            // Save to server...
            return { success: true, id: Date.now() };
          },

          onClose: async () => {
            console.log('Plugin wants to close');
            await plugin.hide();
          }
        }
      },
      {
        id: 'my-plugin',
        src: './plugin.html',
        parentElem: document.body,
        timeout: 5000 // 5 second timeout
      }
    );

    // Show the plugin
    plugin.show({
      x: '-100vw',  // Slide in from left
      opacity: 0.5,
      time: 500     // 500ms animation
    });

    // Call plugin methods
    document.getElementById('sendBtn').addEventListener('click', async () => {
      const result = await plugin.methods.setContent('New content from parent!');
      console.log('Result:', result);
    });

    document.getElementById('getBtn').addEventListener('click', async () => {
      const data = await plugin.methods.getData();
      console.log('Got data:', data);
    });

    document.getElementById('closeBtn').addEventListener('click', async () => {
      await plugin.hide();
    });

    document.getElementById('destroyBtn').addEventListener('click', async () => {
      await plugin.destroy();
    });
  </script>
</head>
<body>
  <h1>Parent Application</h1>
  <button id="sendBtn">Send Content to Plugin</button>
  <button id="getBtn">Get Data from Plugin</button>
  <button id="closeBtn">Hide Plugin</button>
  <button id="destroyBtn">Destroy Plugin</button>
</body>
</html>
```

### 3. Run the Example

```bash
# Install a static server
npm install -g static-server

# Serve the files
static-server -p 8080

# Open in browser
open http://localhost:8080/app.html
```

## TypeScript Example

For TypeScript projects, you get full type safety:

```typescript
import {
  initFullscreenPlugin,
  providePlugin,
  type PluginInitData,
  type FullscreenPluginInterface
} from 'message-interface';

// Define your data types
interface MyPluginData {
  userId: number;
  initialContent: string;
}

interface MySaveData {
  content: string;
  timestamp: number;
}

// Parent side
const plugin: FullscreenPluginInterface = await initFullscreenPlugin(
  {
    data: {
      userId: 123,
      initialContent: 'Hello!'
    } as MyPluginData,

    settings: {
      theme: 'dark'
    },

    hooks: {
      onSave: async (data: MySaveData) => {
        // TypeScript knows data type
        console.log(data.content, data.timestamp);
        return { success: true };
      }
    }
  },
  {
    id: 'my-plugin',
    src: './plugin.html',
    parentElem: document.body
  }
);

// TypeScript provides autocomplete for all methods
await plugin.show();
await plugin.methods.someMethod({ /* ... */ });
await plugin.hide();
await plugin.destroy();
```

## Plugin Types

### Fullscreen Plugin

Creates a fixed overlay that covers the entire viewport:

```typescript
import { initFullscreenPlugin } from 'message-interface';

const plugin = await initFullscreenPlugin(
  { data, settings, hooks },
  {
    id: 'fullscreen-plugin',
    src: './plugin.html',
    parentElem: document.body
  }
);

// Show/hide with animations
plugin.show({ x: '-100vw', time: 500 });
plugin.hide();

// Optional splash screen
plugin.showSplashScreen();
plugin.hideSplashScreen();
```

### Inline Plugin

Embeds the plugin inline within a container:

```typescript
import { initInlinePlugin } from 'message-interface';

const container = document.getElementById('plugin-container');

const plugin = await initInlinePlugin(
  { data, settings, hooks },
  {
    src: './plugin.html',
    container
  }
);

// Destroy when done
plugin.destroy();
```

## Common Patterns

### Passing Initial Data

```typescript
const plugin = await initFullscreenPlugin(
  {
    data: {
      documentId: 'doc-123',
      userId: 'user-456',
      permissions: ['read', 'write']
    },
    settings: { /* ... */ },
    hooks: { /* ... */ }
  },
  { /* ... */ }
);
```

### Error Handling

```typescript
const { data, settings, hooks } = await providePlugin({
  methods: {
    riskyMethod: async (payload) => {
      try {
        // Do something risky
        return { success: true };
      } catch (error) {
        // Use error hook to notify parent
        await hooks.error({ message: error.message });
        return { success: false, error: error.message };
      }
    }
  },
  hooks: ['error']
});
```

### Validation

```typescript
const { data, settings, hooks } = await providePlugin({
  validator: ({ data, settings }) => {
    if (!data?.userId) {
      throw new Error('userId is required');
    }
    if (typeof settings?.theme !== 'string') {
      throw new Error('Invalid theme setting');
    }
  },
  // ... methods and hooks
});
```

### Cleanup

```typescript
// Fullscreen plugin
await plugin.destroy();

// Inline plugin
plugin.destroy();

// Both will:
// - Terminate PostMessageSocket
// - Remove iframes
// - Clean up event listeners
```

## Next Steps

- [Architecture](./02-architecture.md) - Understand how it works
- [API Reference](./03-api-reference.md) - Explore all available APIs
- [Examples and Patterns](./05-examples-and-patterns.md) - See more real-world examples
- [Communication Protocol](./04-communication-protocol.md) - Learn about the message protocol

## Troubleshooting

### Plugin not initializing
- Check that `src` URL is accessible
- Verify no CORS errors in console
- Increase `timeout` value if needed
- Check plugin script is loading

### Methods not working
- Ensure method is defined in `providePlugin` methods object
- Check for errors in browser console
- Verify PostMessageSocket is not terminated

### Hooks not being called
- Ensure hook name is in `hooks` array in `providePlugin`
- Check that parent provided the hook in initialization
- Verify hook returns a value (even if just `undefined`)

### Memory leaks
- Always call `destroy()` when done with plugin
- Don't create plugins in loops without cleaning up
- Check browser DevTools Performance tab for memory growth
