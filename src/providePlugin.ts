import PostMessageSocket from "./postMessageSocket";
import type { Method, Methods, ProvidedPlugin } from "./types/index";

/**
 * Provides a plugin to the target window using postMessage.
 * This function is called from within the plugin iframe to register with the parent.
 *
 * @param options - Plugin configuration options
 * @param options.hooks - Array of parent callback names that this plugin accepts
 * @param options.methods - Map of method names to implementations
 * @param options.validator - Optional function to validate received data and settings
 * @param currentWindow - The plugin's window (defaults to window)
 * @param targetWindow - The parent window (defaults to window.parent)
 * @returns Promise resolving to plugin interface with data, settings, hooks, and terminate
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
