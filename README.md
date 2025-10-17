# PostMessage RPC

[![CI](https://github.com/micskeil/postmessage-rpc/actions/workflows/ci.yml/badge.svg)](https://github.com/micskeil/postmessage-rpc/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@micskeil/postmessage-rpc.svg)](https://www.npmjs.com/package/@micskeil/postmessage-rpc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A professional postMessage-based RPC library that creates and maintains secure communication between window objects**, like a web page and an iframe inside it.

A fork of Chamaileon's original plugin-interface, enhanced and maintained independently with TypeScript-first approach and modern tooling.

## Key Features

- 🔒 **Secure by Default** - Message validation, origin checking, and iframe isolation prevent XSS attacks
- 📝 **TypeScript First** - Full type safety with comprehensive type definitions
- 🔄 **Bidirectional** - Parent ↔ Plugin two-way communication with async/await support
- ⚡ **Easy to Use** - Simple API: initialize parent, provide plugin, start communicating
- 🎣 **Hooks System** - Event-driven callbacks from plugin to parent
- 🎨 **Multiple Modes** - Fullscreen overlay or inline iframe plugins

## Installation

```bash
npm install @micskeil/postmessage-rpc
```

## Quick Start

### Parent Side (Initialize Plugin)

```typescript
import { initInlinePlugin } from '@micskeil/postmessage-rpc';

const plugin = await initInlinePlugin(
  {
    data: { userId: 123 },
    settings: { theme: 'dark' },
    hooks: {
      onSave: async (data) => {
        console.log('Saved:', data);
      }
    }
  },
  {
    src: 'https://your-plugin-url.com',
    container: document.getElementById('plugin-container'),
    timeout: 5000
  }
);

// Call plugin methods
const result = await plugin.methods.getData();

// Cleanup
plugin.destroy();
```

### Plugin Side (Register with Parent)

```typescript
import { providePlugin } from '@micskeil/postmessage-rpc';

const { data, settings, hooks } = await providePlugin({
  hooks: ['onSave', 'onClose'],
  methods: {
    getData: async () => {
      return { status: 'ok', data: myData };
    },
    setTheme: async (theme) => {
      applyTheme(theme);
      return { success: true };
    }
  },
  validator: ({ data, settings }) => {
    if (!data.userId) throw new Error('User ID is required');
  }
});

// Use data and settings from parent
console.log('Initialized with:', data, settings);

// Call parent hooks
await hooks.onSave({ content: 'Updated' });
```

## Core Concepts

### Inline Plugins
Embedded iframes within your page layout. Perfect for cards, widgets, or multiple instances.

```typescript
import { initInlinePlugin } from '@micskeil/postmessage-rpc';
const plugin = await initInlinePlugin(config, options);
```

### Fullscreen Plugins
Modal-style overlays that cover the entire viewport with show/hide animations and optional splash screens.

```typescript
import { initFullscreenPlugin } from '@micskeil/postmessage-rpc';
const plugin = await initFullscreenPlugin(config, options);
plugin.show();   // Animate in
plugin.hide();   // Animate out
```

## Use Cases

- Email editors with preview plugins
- Content management systems with widget plugins
- Dashboard applications with chart/analytics plugins
- Design tools with component library plugins
- Micro-frontend architecture
- Any scenario requiring sandboxed, communicating components

## Documentation

- **[📖 API Documentation](https://micskeil.github.io/postmessage-rpc/)** - Auto-generated TypeScript API reference
- **[🎮 Live Examples](./examples/)** - Interactive sticky notes demo
- **[💻 GitHub Repository](https://github.com/micskeil/postmessage-rpc)** - View source code and contribute

## Examples

The repository includes an interactive sticky notes demo demonstrating:

- Multiple inline plugins on the same page
- Fullscreen editor plugin with animations
- localStorage persistence
- Parent-plugin bidirectional communication
- CRUD operations through the plugin interface

Run the examples:

```bash
npm install
npm run examples
```

Then open your browser to `http://localhost:8765/examples/`

## Contributing

Contributions are welcome! Please see [GitHub Issues](https://github.com/micskeil/postmessage-rpc/issues) to report bugs or request features.

### Development Workflow

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and run tests: `npm test`
4. Lint and build: `npm run lint-fix && npm run build`
5. Submit a pull request

### Development Commands

```bash
npm run dev           # Development server with hot reload
npm run build         # Build the library
npm run test          # Run tests with coverage
npm run test:watch    # Watch mode
npm run lint-fix      # Lint and auto-fix
```

## CI/CD Pipeline

GitHub Actions automatically:

- Runs linting, type-checking, and tests on pull requests
- Publishes to npm on version tags
- Deploys API documentation to GitHub Pages
- Creates GitHub releases with changelogs

## License

MIT - See [LICENSE](./LICENSE) file for details.

---

**Fork of Chamaileon's original plugin-interface** | [View on NPM](https://www.npmjs.com/package/@micskeil/postmessage-rpc)
