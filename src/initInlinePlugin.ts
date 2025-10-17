import { createInitPlugin } from "./initPlugin";

import type {
  PluginConfig,
  InlinePluginOptions,
  InlinePlugin,
} from "./types/index";

/**
 * Initializes an inline plugin embedded within a specified DOM container.
 *
 * Use this function when you want to embed a plugin directly into your page layout
 * (e.g., as a widget, card, or component). The plugin iframe will be sized to fit
 * the container and remain visible at all times.
 *
 * ## When to Use Inline Plugins
 *
 * - Multiple plugins on the same page (e.g., widget dashboard)
 * - Plugins that are part of the normal page flow
 * - Plugins that need to be resized based on container
 * - Persistent plugins that shouldn't be hidden/shown
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { initInlinePlugin } from '@micskeil/postmessage-rpc';
 *
 * // Create a container for the plugin
 * const container = document.getElementById('my-plugin-container');
 *
 * // Initialize the inline plugin
 * const plugin = await initInlinePlugin(
 *   {
 *     data: {
 *       noteId: '123',
 *       title: 'My Note'
 *     },
 *     settings: {
 *       theme: 'light',
 *       editable: true
 *     },
 *     hooks: {
 *       onUpdate: async (note) => {
 *         console.log('Note updated:', note);
 *         await saveToBackend(note);
 *       },
 *       onDelete: async () => {
 *         console.log('Note deleted');
 *         await deleteFromBackend(noteId);
 *       }
 *     }
 *   },
 *   {
 *     src: 'https://plugin.example.com/note-widget.html',
 *     container: container,
 *     timeout: 5000
 *   }
 * );
 *
 * // Call plugin methods
 * await plugin.methods.setReadOnly(true);
 *
 * // Get plugin data
 * const data = await plugin.methods.getData();
 *
 * // Cleanup when plugin is no longer needed
 * plugin.destroy();
 * ```
 *
 * ## Differences from Fullscreen Plugins
 *
 * | Feature | Inline | Fullscreen |
 * |---------|--------|-----------|
 * | Display | Embedded in container | Fullscreen overlay |
 * | Animation | None (always visible) | Show/hide animations |
 * | Layout | Respects container size | Fills viewport |
 * | Use Case | Widgets, cards | Modals, editors |
 * | Multiple | Can have many | Usually one active |
 *
 * @param config - Plugin configuration object
 * @param config.data - Initial data passed to the plugin (any type)
 * @param config.settings - Configuration settings for the plugin
 * @param config.hooks - Parent callback functions (async functions the plugin can invoke)
 *
 * @param options - Inline-specific initialization options
 * @param options.src - URL of the plugin HTML/JavaScript to load
 * @param options.container - DOM element where the plugin iframe will be inserted
 * @param options.beforeInit - Optional callback invoked after iframe creation but before DOM insertion
 * @param options.timeout - Optional timeout in milliseconds (default: 30000, no timeout if 0)
 *
 * @returns Promise resolving to inline plugin interface with methods and destroy function
 * @throws {Error} If plugin fails to initialize within the timeout period
 *
 * @see {@link initFullscreenPlugin} for fullscreen modal plugins
 * @see {@link providePlugin} for plugin-side registration
 * @see InlinePlugin
 *
 * @example
 * ```typescript
 * // Multiple inline plugins example
 * const noteIds = ['1', '2', '3'];
 *
 * for (const noteId of noteIds) {
 *   const container = document.getElementById(`note-${noteId}`);
 *   const plugin = await initInlinePlugin(
 *     {
 *       data: { noteId },
 *       hooks: {
 *         onSave: (data) => saveNote(data)
 *       }
 *     },
 *     {
 *       src: 'https://example.com/note-plugin.html',
 *       container
 *     }
 *   );
 * }
 * ```
 */
export default async function initInlinePlugin(
  { data, settings, hooks = {} }: PluginConfig,
  { src, container, beforeInit, timeout }: InlinePluginOptions,
): Promise<InlinePlugin> {
  const { methods, terminate } = await createInitPlugin(
    {
      data,
      settings,
      hooks,
    },
    {
      container,
      src,
      timeout,
      beforeInit,
    },
  );

  function destroy(): void {
    // Terminate the PostMessageSocket first to clean up event listeners
    terminate();

    // Then remove all DOM children from the container
    while (container.firstChild) {
      container.firstChild.remove();
    }
  }

  return {
    container,
    methods,
    destroy,
  };
}
