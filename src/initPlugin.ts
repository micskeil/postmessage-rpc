import PostMessageSocket from "./postMessageSocket";
import type {
  Method,
  PluginConfig,
  WindowConfig,
  IframeOptions,
  InitializedPlugin,
} from "./types/index";

/**
 * Creates an iframe element and initializes a plugin within it.
 * This is a high-level convenience function that handles DOM creation and delegates
 * to initPlugin for the actual communication setup.
 *
 * @param config - Plugin configuration
 * @param config.data - Initial data to pass to the plugin
 * @param config.settings - Plugin-specific settings
 * @param config.hooks - Callback functions the parent provides to the plugin
 *
 * @param options - Iframe creation options
 * @param options.container - DOM element where the iframe will be appended
 * @param options.src - URL of the plugin to load in the iframe
 * @param options.beforeInit - Optional callback invoked before appending iframe to DOM
 * @param options.timeout - Optional timeout in milliseconds for plugin initialization
 *
 * @returns Promise that resolves with the plugin interface containing methods and terminate function
 * @see InitializedPlugin
 *
 * @example
 * ```typescript
 * const plugin = await createInitPlugin(
 *   {
 *     data: { userId: 123 },
 *     settings: { theme: 'dark' },
 *     hooks: {
 *       onSave: async (content) => console.log('Saved:', content),
 *       onClose: async () => console.log('Closed')
 *     }
 *   },
 *   {
 *     container: document.getElementById('plugin-container'),
 *     src: 'https://example.com/plugin.html',
 *     timeout: 5000,
 *     beforeInit: ({ iframe }) => {
 *       iframe.style.borderRadius = '8px';
 *     }
 *   }
 * );
 *
 * // Call plugin methods
 * await plugin.methods.getData();
 *
 * // Cleanup
 * plugin.terminate();
 * ```
 */
export function createInitPlugin(
  { data, settings, hooks = {} }: PluginConfig,
  { container, src, beforeInit, timeout }: IframeOptions,
): Promise<InitializedPlugin> {
  const pluginIframe = document.createElement("iframe");

  // Set up the basic styles for the iframe
  pluginIframe.src = src;
  pluginIframe.allowFullscreen = true;
  pluginIframe.style.width = "100%";
  pluginIframe.style.height = "100%";
  pluginIframe.style.border = "0";
  pluginIframe.style.margin = "0";
  pluginIframe.style.padding = "0";

  if (typeof beforeInit === "function") {
    beforeInit({ container, iframe: pluginIframe });
  }

  container.appendChild(pluginIframe);

  // FIX: Ensure contentWindow is available before initializing
  // In some cases, contentWindow may not be immediately available after appendChild
  const contentWindow = pluginIframe.contentWindow;

  if (!contentWindow) {
    // If contentWindow is still not available, it's a critical error
    container.removeChild(pluginIframe);
    return Promise.reject(new Error("Failed to access iframe contentWindow"));
  }

  return initPlugin(
    { data, settings, hooks },
    {
      currentWindow: window,
      targetWindow: contentWindow,
      timeout,
      container,
    },
  );
}

/**
 * Initializes a plugin by establishing PostMessageSocket communication between two windows.
 * This is the core initialization function that handles the handshake protocol, method proxying,
 * and lifecycle management.
 *
 * ## Initialization Protocol
 * 1. Creates PostMessageSocket between parent and plugin windows
 * 2. Waits for plugin to send "domReady" signal
 * 3. Registers parent callback channels (so plugin can call them immediately)
 * 4. Sends "init" message with data, settings, and callback names
 * 5. Receives list of method names from plugin
 * 6. Creates async wrapper functions for each method
 * 7. Returns interface with methods and terminate function
 *
 * ## Timeout Behavior
 * If timeout is provided and plugin doesn't respond in time:
 * - Terminates the PostMessageSocket
 * - Removes container from DOM (if container exists and has remove method)
 * - Rejects promise with timeout error
 *
 * ## Method Proxying
 * Each method returned by the plugin is wrapped as an async function that:
 * - Creates a message channel for that method
 * - Sends the payload via PostMessageSocket
 * - Waits for and returns the response
 *
 * ## Special Methods
 * - `updateParentCallbacks`: Intercepts and processes callback updates before sending to plugin
 *
 * @param config - Plugin initialization configuration
 * @param config.data - Initial data to pass to the plugin
 * @param config.settings - Plugin-specific settings
 * @param config.hooks - Map of callback names to callback functions
 *
 * @param windowConfig - Window communication configuration
 * @param windowConfig.currentWindow - The parent window that will communicate with the plugin
 * @param windowConfig.targetWindow - The plugin's window (usually iframe.contentWindow)
 * @param windowConfig.timeout - Optional timeout in milliseconds (null = no timeout)
 * @param windowConfig.container - Optional container element to remove on timeout
 *
 * @returns Promise resolving to plugin interface with methods and terminate function
 * @throws {Error} If initialization times out
 *
 * @example
 * ```typescript
 * const iframe = document.createElement('iframe');
 * iframe.src = 'https://plugin.example.com';
 * document.body.appendChild(iframe);
 *
 * const plugin = await initPlugin(
 *   {
 *     data: { userId: 123, document: {...} },
 *     settings: { theme: 'dark', locale: 'en-US' },
 *     hooks: {
 *       onSave: async (content) => {
 *         await saveToBackend(content);
 *       },
 *       onClose: async () => {
 *         console.log('Plugin closed');
 *       }
 *     }
 *   },
 *   {
 *     currentWindow: window,
 *     targetWindow: iframe.contentWindow,
 *     timeout: 5000,
 *     container: iframe
 *   }
 * );
 *
 * // Call plugin methods
 * const data = await plugin.methods.getData();
 * await plugin.methods.updateContent({ text: 'Hello' });
 *
 * // Cleanup
 * plugin.terminate();
 * ```
 */
export function initPlugin(
  { data, settings, hooks = {} }: PluginConfig,
  { currentWindow, targetWindow, timeout, container }: WindowConfig,
): Promise<InitializedPlugin> {
  const messageSocket = new PostMessageSocket(currentWindow, targetWindow);

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Cleanup helper function to ensure all resources are properly released.
     * Clears timeout, terminates socket, and optionally removes container.
     */
    function cleanup(error?: Error) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      messageSocket.terminate();
      if (error && container?.parentNode) {
        container.remove();
      }
    }

    // Set up listener for domReady message from plugin
    messageSocket.createMessageChannel("domReady", onDomReady, { once: true });

    if (timeout) {
      timeoutId = setTimeout(() => {
        cleanup();
        if (container?.parentNode) {
          container.remove();
        }
        reject(
          new Error(
            `Plugin initialization failed with timeout! You can try to increase the timeout value in the plugin settings. Current value is ${timeout}ms.`,
          ),
        );
      }, timeout);
    }

    /**
     * Handles the domReady signal from the plugin.
     * Sends initialization data and creates method proxies.
     */
    async function onDomReady() {
      try {
        // CRITICAL: Register parent callbacks BEFORE sending init
        // This ensures they're ready when plugin tries to call them
        Object.entries(hooks).forEach(
          ([callbackName, callbackFn]) => {
            messageSocket.createMessageChannel(callbackName, callbackFn);
          },
        );

        // Send init data to plugin and wait for method list response
        const initChannel = messageSocket.createMessageChannel<
          { data: unknown; settings: unknown; hooks: string[] },
          string[]
        >("init", () => [] as string[]);

        if (!initChannel) {
          cleanup();
          reject(new Error("Failed to create init channel"));
          return;
        }

        const answer = await initChannel.sendAndWait({
          data,
          settings,
          hooks: Object.keys(hooks),
        });

        // Handle the case where answer is ResultStrings.Success instead of actual data
        if (typeof answer === "string") {
          cleanup();
          reject(new Error("Plugin did not return method list"));
          return;
        }

        const methods: Record<string, Method> = {};

        // Create async wrapper for each plugin method
        answer.forEach((type: string) => {
          methods[type] = async (payload: unknown) => {
            // Create a channel for each method call
            const methodChannel = messageSocket.createMessageChannel<
              unknown,
              unknown
            >(type, () => {});

            if (!methodChannel) {
              throw new Error(
                `Failed to create message channel for method: ${type}`,
              );
            }

            return await methodChannel.sendAndWait(payload);
          };
        });

        // Clear timeout on successful initialization
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        resolve({
          methods,
          terminate: messageSocket.terminate.bind(messageSocket),
        });
      } catch (error) {
        // Ensure cleanup on any error
        cleanup(error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    }
  });
}
