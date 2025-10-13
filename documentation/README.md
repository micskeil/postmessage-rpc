# PostMessage RPC Documentation

Complete documentation for the `@micskeil/postmessage-rpc` library - a TypeScript-based postMessage RPC framework for secure window-to-window communication.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](./01-getting-started.md)
3. [Architecture](./02-architecture.md)
4. [API Reference](./03-api-reference.md)
5. [Communication Protocol](./04-communication-protocol.md)
6. [Examples and Patterns](./05-examples-and-patterns.md)
7. [Development Guide](./06-development-guide.md)
8. [Testing Guide](./07-testing-guide.md)
9. [Migration Guide](./08-migration-guide.md)

## Overview

`@micskeil/postmessage-rpc` is a postMessage-based RPC library that creates and maintains secure, standardized communication between window objects (e.g., a web page and an iframe). It provides a typed, promise-based API for bidirectional communication with built-in error handling and lifecycle management.

### Key Features

- 🔒 **Secure Communication**: Message validation and source verification
- 📝 **TypeScript First**: Full type safety with comprehensive type definitions
- 🔄 **Bidirectional**: Parent ↔ Plugin two-way communication
- ⚡ **Promise-based**: Async/await support for request-response patterns
- 🎣 **Hooks System**: Event-driven callbacks from plugin to parent
- 🎨 **Multiple Modes**: Fullscreen overlay or inline iframe plugins
- 🧹 **Lifecycle Management**: Proper cleanup and memory management

### Use Cases

- **Email Editor Plugins**: Embed rich text editors in iframes
- **Content Galleries**: Load external content galleries securely
- **Preview Systems**: Safe preview of user-generated content
- **Modular Applications**: Micro-frontend architecture
- **Third-party Integrations**: Safely integrate external tools

### Core Concepts

#### Parent Side
Initialize a plugin from the parent window:
```typescript
import { initFullscreenPlugin } from '@micskeil/postmessage-rpc';

const plugin = await initFullscreenPlugin(
  {
    data: { /* initial data */ },
    settings: { /* configuration */ },
    hooks: {
      onSave: async (data) => { /* handle save */ },
      onClose: async () => { /* handle close */ }
    }
  },
  {
    id: 'my-plugin',
    src: 'https://plugin-url.com',
    parentElem: document.body
  }
);

// Call plugin methods
await plugin.methods.someMethod(payload);

// Cleanup
await plugin.destroy();
```

#### Plugin Side
Register methods and hooks from inside the plugin iframe:
```typescript
import { providePlugin } from '@micskeil/postmessage-rpc';

const { data, settings, hooks } = await providePlugin({
  hooks: ['onSave', 'onClose'],
  methods: {
    someMethod: async (payload) => {
      // Implementation
      return result;
    }
  },
  validator: ({ data, settings }) => {
    if (!data.required) throw new Error('Missing required data');
  }
});

// Call parent hooks
await hooks.onSave(editorData);
```

## Quick Navigation

### For First-Time Users
1. [Getting Started](./01-getting-started.md) - Installation and quick start
2. [Examples and Patterns](./05-examples-and-patterns.md) - Common use cases

### For Developers Integrating the Library
1. [API Reference](./03-api-reference.md) - Complete API documentation
2. [Communication Protocol](./04-communication-protocol.md) - Understanding the message flow

### For Contributors
1. [Architecture](./02-architecture.md) - System design and structure
2. [Development Guide](./06-development-guide.md) - Setting up development environment
3. [Testing Guide](./07-testing-guide.md) - Writing and running tests

### For Users of Old Package
1. [Migration Guide](./08-migration-guide.md) - Migrating from original Chamaileon plugin-interface

## Documentation Files

| File | Description |
|------|-------------|
| `01-getting-started.md` | Installation, quick start, basic examples |
| `02-architecture.md` | System architecture, component overview, design decisions |
| `03-api-reference.md` | Complete API documentation with all methods and types |
| `04-communication-protocol.md` | Message structure, handshake protocol, security |
| `05-examples-and-patterns.md` | Real-world examples and best practices |
| `06-development-guide.md` | Development environment setup, building, testing |
| `07-testing-guide.md` | Writing tests, test utilities, coverage |
| `08-migration-guide.md` | Migrating from old package, breaking changes |

## Package Information

- **Package Name**: `@micskeil/postmessage-rpc`
- **Version**: `0.1.0`
- **License**: MIT
- **Repository**: [micskeil/postmessage-rpc](https://github.com/micskeil/postmessage-rpc)
- **Origin**: Fork of Chamaileon's `@chamaileon-sdk/plugin-interface`

## Support

- **Issues**: [GitHub Issues](https://github.com/micskeil/postmessage-rpc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/micskeil/postmessage-rpc/discussions)

## Contributing

See [Development Guide](./06-development-guide.md) for information on:
- Setting up the development environment
- Running tests
- Submitting pull requests
- Code style guidelines

## License

MIT

---

**Note**: This documentation is for version 0.1.0. This is a fork of Chamaileon's original `@chamaileon-sdk/plugin-interface`.
