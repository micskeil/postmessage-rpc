import PostMessageSocket from "./postMessageSocket";

/**
 * Type definition for parent callback methods.
 * Parent callbacks are async functions provided by the parent that the plugin can call.
 */
type ParentCallbackMethod = (payload: unknown) => Promise<unknown>;

/**
 * Options for updating parent callbacks
 */
interface UpdateParentCallbacksOptions {
  /** Map of callback names to callback functions */
  parentCallbacks?: Record<string, ParentCallbackMethod>;
  /** If true, removes all existing callbacks before adding new ones. If false, merges with existing callbacks. */
  resetParentCallbacks?: boolean;
}

/**
 * Initializes the parent callback update system for a plugin.
 * This function manages the lifecycle of parent callbacks (callbacks provided by the parent).
 *
 * ## Callback Management
 * - **Merge mode** (resetParentCallbacks: false): New callbacks are added to existing ones
 * - **Reset mode** (resetParentCallbacks: true): All existing callbacks are removed before adding new ones
 * - **Null callbacks**: Setting a callback to null removes it
 *
 * ## Usage
 * This function is used internally by initPlugin to manage callback updates during the plugin lifecycle.
 *
 * @param messageSocket - The PostMessageSocket instance for communication
 * @returns A function that processes callback updates and returns the list of active callback names
 *
 * @example
 * ```typescript
 * const updateParentCallbacks = initUpdateParentCallbacks(messageSocket);
 *
 * // Initial callbacks
 * updateParentCallbacks({
 *   parentCallbacks: {
 *     onSave: async (data) => { ... },
 *     onClose: async () => { ... }
 *   }
 * });
 *
 * // Add new callback (merge mode)
 * updateParentCallbacks({
 *   parentCallbacks: {
 *     onError: async (error) => { ... }
 *   },
 *   resetParentCallbacks: false
 * });
 *
 * // Replace all callbacks (reset mode)
 * updateParentCallbacks({
 *   parentCallbacks: {
 *     onSave: async (data) => { ... }
 *   },
 *   resetParentCallbacks: true
 * });
 *
 * // Remove a specific callback
 * updateParentCallbacks({
 *   parentCallbacks: {
 *     onError: null
 *   }
 * });
 * ```
 */
export default function initUpdateParentCallbacks(
  messageSocket: PostMessageSocket,
): (options?: UpdateParentCallbacksOptions) => string[] {
  // Store the current registered callbacks from the parent
  let parentCallbacksFromParent: Record<string, ParentCallbackMethod | null> = {};

  // Create error callback for handling errors in callback execution
  messageSocket.createMessageChannel("error", (payload: unknown) => {
    console.warn("Parent callback error:", payload);
  });

  /**
   * Updates the parent callbacks based on the provided options.
   * Returns the list of active (non-null, function) callback names.
   */
  return function updateParentCallbacks(options?: UpdateParentCallbacksOptions): string[] {
    if (!options) {
      return Object.keys(parentCallbacksFromParent).filter(
        (callback) =>
          typeof parentCallbacksFromParent[callback] === "function" &&
          parentCallbacksFromParent[callback] !== null,
      );
    }

    const { parentCallbacks = {}, resetParentCallbacks = false } = options;

    // Reset mode: Remove all existing callbacks before adding new ones
    if (resetParentCallbacks) {
      Object.keys(parentCallbacksFromParent).forEach((callback) => {
        messageSocket.removeListener(callback);
      });
      parentCallbacksFromParent = { ...parentCallbacks };
    } else {
      // Merge mode: Add new callbacks to existing ones
      parentCallbacksFromParent = { ...parentCallbacksFromParent, ...parentCallbacks };
    }

    // Register/update message channels for each callback
    Object.entries(parentCallbacksFromParent).forEach(([callbackName, callbackFunction]) => {
      // If callback is null or not a function, remove it
      if (typeof callbackFunction !== "function" || callbackFunction === null) {
        messageSocket.removeListener(callbackName);
        delete parentCallbacksFromParent[callbackName];
        return;
      }

      // Create or update the message channel for this callback
      messageSocket.createMessageChannel(callbackName, (payload: unknown) =>
        callbackFunction(payload),
      );
    });

    // Return list of active callback names (functions only, exclude nulls)
    return Object.keys(parentCallbacksFromParent).filter(
      (callback) =>
        typeof parentCallbacksFromParent[callback] === "function" &&
        parentCallbacksFromParent[callback] !== null,
    );
  };
}
