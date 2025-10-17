import PostMessageSocket from "./postMessageSocket";
import type { Method, Methods, ProvidedPlugin } from "./types/index";

/**
 * Registers a plugin with the parent window using postMessage RPC communication.
 *
 * Call this function from within your plugin iframe to establish two-way communication
 * with the parent window. This is the plugin-side counterpart to {@link initFullscreenPlugin}
 * and {@link initInlinePlugin}.
 *
 * ## Plugin Registration Flow
 *
 * 1. Plugin iframe loads and calls providePlugin()
 * 2. Plugin signals readiness via "domReady" message
 * 3. Parent sends "init" message with data, settings, and callback names
 * 4. Plugin receives initialization data and resolves the promise
 * 5. Plugin can now call parent hooks and handle parent method calls
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { providePlugin } from '@micskeil/postmessage-rpc';
 *
 * // Register the plugin with the parent
 * const { data, settings, hooks, terminate } = await providePlugin({
 *   // Callbacks from parent that this plugin can invoke
 *   hooks: ['onSave', 'onClose', 'onError'],
 *
 *   // Methods that the parent can call
 *   methods: {
 *     getData: async () => {
 *       // Return plugin data to parent
 *       return { content: document.body.innerHTML };
 *     },
 *
 *     setContent: async (content) => {
 *       // Update plugin from parent call
 *       document.body.innerHTML = content;
 *       return { success: true };
 *     },
 *
 *     close: async () => {
 *       // Clean up when parent requests close
 *       terminate();
 *       return { success: true };
 *     }
 *   },
 *
 *   // Validate initialization data
 *   validator: ({ data, settings }) => {
 *     if (!data.userId) {
 *       throw new Error('userId is required');
 *     }
 *     if (!settings.theme) {
 *       throw new Error('theme setting is required');
 *     }
 *   }
 * });
 *
 * // Now you can use the parent-provided data and hooks
 * console.log('Plugin initialized for user:', data.userId);
 * console.log('Theme:', settings.theme);
 *
 * // Call parent hooks
 * document.getElementById('save-btn').addEventListener('click', async () => {
 *   await hooks.onSave({ content: getEditorContent() });
 * });
 *
 * document.getElementById('close-btn').addEventListener('click', async () => {
 *   await hooks.onClose();
 * });
 * ```
 *
 * ## Complete Example: Simple Note Editor Plugin
 *
 * ```typescript
 * const { data, settings, hooks } = await providePlugin({
 *   hooks: ['onSave', 'onClose'],
 *   methods: {
 *     // Get current note content
 *     getNote: async () => ({
 *       content: document.getElementById('editor').value,
 *       id: data.noteId
 *     }),
 *
 *     // Set note content
 *     setNote: async (note) => {
 *       document.getElementById('editor').value = note.content;
 *       return { success: true };
 *     },
 *
 *     // Apply theme
 *     setTheme: async (theme) => {
 *       document.body.className = `theme-${theme}`;
 *       return { success: true };
 *     }
 *   },
 *   validator: ({ data }) => {
 *     if (!data.noteId) throw new Error('noteId required');
 *   }
 * });
 *
 * // Apply initial theme
 * await hooks.onInit?.(settings.theme);
 *
 * // Wire up buttons
 * document.getElementById('save').onclick = async () => {
 *   const note = await hooks.onSave({
 *     content: document.getElementById('editor').value
 *   });
 * };
 * ```
 *
 * ## Error Handling
 *
 * The library automatically adds an "error" hook if not present. Use it to report errors:
 *
 * ```typescript
 * const { hooks } = await providePlugin({
 *   hooks: ['onError'], // Explicitly list if needed
 *   methods: {
 *     riskyOperation: async () => {
 *       try {
 *         return doSomethingRisky();
 *       } catch (error) {
 *         // Report error to parent
 *         await hooks.onError({
 *           message: error.message,
 *           code: 'RISKY_OP_FAILED'
 *         });
 *         return { success: false };
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @param options - Plugin configuration options
 * @param options.hooks - Array of parent callback names that this plugin accepts and can invoke
 * @param options.methods - Map of method names to async functions the parent can call
 * @param options.validator - Optional function to validate received data and settings from parent
 *
 * @param currentWindow - The plugin's window object (defaults to window)
 * @param targetWindow - The parent window object (defaults to window.parent)
 *
 * @returns Promise resolving to plugin interface containing:
 *   - `data`: Initial data sent by parent
 *   - `settings`: Configuration settings sent by parent
 *   - `hooks`: Functions to invoke parent callbacks
 *   - `terminate`: Function to cleanup and close communication
 *
 * @throws {Error} If validator function throws or if initialization fails
 *
 * @see {@link initFullscreenPlugin} for parent-side fullscreen plugin initialization
 * @see {@link initInlinePlugin} for parent-side inline plugin initialization
 * @see ProvidedPlugin
 */
export function providePlugin(
  options?: {
    hooks?: string[];
    methods?: Methods;
    validator?: (args: { data?: unknown; settings?: unknown }) => void;
  },
  currentWindow: Window = window,
  targetWindow: Window = window.parent,
): Promise<ProvidedPlugin> {
  // Create a new PostMessageSocket instance for the current window and target window
  const { hooks = [], methods = {}, validator } = options || {};
  const messageSocket = new PostMessageSocket(currentWindow, targetWindow);

  if (!hooks.includes("error")) {
    hooks.push("error");
  }

  // Create a messageChannel for each method to allow communication
  Object.entries(methods).forEach(([name, cb]) => {
    messageSocket.createMessageChannel(name, cb);
  });

  return new Promise((resolve, reject) => {
    function onInit(options?: {
      data: unknown;
      settings: unknown;
      hooks: string[];
    }) {
      const { data, settings, hooks = [] } = options || {};

      //  Initialize the parent callbacks with the provided functions
      // Parent sends an array of callback names, and we create channels for each
      const parentCallbackFunctions = hooks.reduce(
        (acc: Record<string, Method>, callbackName: string) => {
          // Create a message channel for this callback name
          // The parent has the actual callback implementation
          const messageChannel = messageSocket.createMessageChannel(
            callbackName,
            () => {}, // Dummy callback - not used on plugin side
          );
          // Plugin calls sendAndWait to invoke parent's callback
          if (messageChannel) {
            acc[callbackName] = messageChannel.sendAndWait;
          }
          return acc;
        },
        {},
      );

      try {
        if (validator) {
          validator({ data, settings });
        }

        const terminate = () => {
          messageSocket.terminate();
        };

        resolve({
          data,
          settings,
          hooks: parentCallbackFunctions,
          terminate,
        });

        // IMPORTANT: Return the list of method names to the parent
        // so it can create wrapper functions for each method
        return Object.keys(methods);
      } catch (error: unknown) {
        console.error("Plugin validation failed:", error);
        // If the validator throws an error, we reject the promise
        reject(error);
        messageSocket.terminate();
      }
    }
    messageSocket.createMessageChannel("init", onInit, { once: true });
    // Signal to parent that plugin is ready
    const readyChannel = messageSocket.createMessageChannel(
      "domReady",
      () => {},
    );
    if (readyChannel) {
      readyChannel.send({});
    }
  });
}
