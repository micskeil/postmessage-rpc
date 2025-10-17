/**
 * @module @micskeil/postmessage-rpc
 *
 * A professional postMessage-based RPC library for secure window-to-window communication.
 *
 * ## Overview
 *
 * This library provides a TypeScript-first approach to establishing secure, bidirectional
 * communication between window objects (parent pages and iframes) using the postMessage API.
 *
 * ## Core Concepts
 *
 * ### 1. Parent Side (Main Application)
 * Initialize a plugin using either {@link initFullscreenPlugin} or {@link initInlinePlugin}:
 * ```typescript
 * import { initInlinePlugin } from '@micskeil/postmessage-rpc';
 *
 * const plugin = await initInlinePlugin(
 *   {
 *     data: { userId: 123 },           // Pass data to plugin
 *     settings: { theme: 'dark' },     // Plugin-specific settings
 *     hooks: {                         // Parent callbacks
 *       onSave: async (data) => {
 *         console.log('Plugin saved:', data);
 *       }
 *     }
 *   },
 *   {
 *     src: 'https://plugin.example.com',
 *     container: document.getElementById('plugin-container'),
 *     timeout: 5000
 *   }
 * );
 *
 * // Call plugin methods
 * const result = await plugin.methods.getData();
 *
 * // Cleanup when done
 * plugin.destroy();
 * ```
 *
 * ### 2. Plugin Side (Plugin Iframe)
 * Register the plugin using {@link providePlugin}:
 * ```typescript
 * import { providePlugin } from '@micskeil/postmessage-rpc';
 *
 * const { data, settings, hooks } = await providePlugin({
 *   hooks: ['onSave', 'onClose'],      // Callbacks from parent
 *   methods: {                         // Methods parent can call
 *     getData: async () => {
 *       return { status: 'ok', data: myData };
 *     }
 *   },
 *   validator: ({ data, settings }) => {
 *     if (!data.userId) throw new Error('User ID is required');
 *   }
 * });
 *
 * // Use parent data and settings
 * console.log('Initialized with user:', data.userId);
 *
 * // Call parent hooks
 * await hooks.onSave({ content: 'Updated content' });
 * ```
 *
 * ## Key Features
 *
 * - **Secure by Default**: Message validation and origin checking prevent XSS attacks
 * - **Type-Safe**: Full TypeScript support with comprehensive type definitions
 * - **Bidirectional**: Request-response patterns, fire-and-forget, and event callbacks
 * - **Promise-based**: Async/await support for all communications
 * - **Multiple Modes**: Inline plugins (embedded) or fullscreen plugins (modal-style)
 * - **Lifecycle Management**: Proper cleanup and resource management
 *
 * ## Use Cases
 *
 * - Email editors with preview plugins
 * - Content management systems with widget plugins
 * - Dashboard applications with analytics plugins
 * - Design tools with component libraries
 * - Micro-frontend architectures
 * - Third-party integrations in sandboxed iframes
 *
 * ## Architecture
 *
 * The library is built on {@link PostMessageSocket}, which handles all the low-level
 * postMessage communication, message validation, and request-response patterns.
 *
 * ### High-level Flow
 *
 * 1. **Parent calls init function** → Creates iframe and establishes communication
 * 2. **Parent sends init message** → Passes data, settings, and hook names
 * 3. **Plugin calls providePlugin** → Registers methods and awaits parent initialization
 * 4. **Bidirectional communication** → Parent and plugin exchange messages
 * 5. **Cleanup** → Call destroy() to clean up resources
 *
 * @see {@link initFullscreenPlugin} for fullscreen modal-style plugins
 * @see {@link initInlinePlugin} for embedded inline plugins
 * @see {@link providePlugin} for plugin registration
 */

import initFullscreenPlugin from "./initFullscreenPlugin";
import initInlinePlugin from "./initInlinePlugin";
import { providePlugin } from "./providePlugin";

export { initFullscreenPlugin, initInlinePlugin, providePlugin };
