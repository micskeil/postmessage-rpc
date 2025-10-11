import PostMessageSocket from "./postMessageSocket";

/**
 * Type definition for hook methods.
 * Hooks are async functions provided by the parent that the plugin can call.
 */
type HookMethod = (payload: unknown) => Promise<unknown>;

/**
 * Options for updating hooks
 */
interface UpdateHooksOptions {
  /** Map of hook names to hook callback functions */
  hooks?: Record<string, HookMethod>;
  /** If true, removes all existing hooks before adding new ones. If false, merges with existing hooks. */
  resetHooks?: boolean;
}

/**
 * Initializes the hook update system for a plugin.
 * This function manages the lifecycle of hooks (callbacks provided by the parent).
 *
 * ## Hook Management
 * - **Merge mode** (resetHooks: false): New hooks are added to existing ones
 * - **Reset mode** (resetHooks: true): All existing hooks are removed before adding new ones
 * - **Null hooks**: Setting a hook to null removes it
 *
 * ## Usage
 * This function is used internally by initPlugin to manage hook updates during the plugin lifecycle.
 *
 * @param messageSocket - The PostMessageSocket instance for communication
 * @returns A function that processes hook updates and returns the list of active hook names
 *
 * @example
 * ```typescript
 * const updateHooks = initUpdateHooks(messageSocket);
 *
 * // Initial hooks
 * updateHooks({
 *   hooks: {
 *     onSave: async (data) => { ... },
 *     onClose: async () => { ... }
 *   }
 * });
 *
 * // Add new hook (merge mode)
 * updateHooks({
 *   hooks: {
 *     onError: async (error) => { ... }
 *   },
 *   resetHooks: false
 * });
 *
 * // Replace all hooks (reset mode)
 * updateHooks({
 *   hooks: {
 *     onSave: async (data) => { ... }
 *   },
 *   resetHooks: true
 * });
 *
 * // Remove a specific hook
 * updateHooks({
 *   hooks: {
 *     onError: null
 *   }
 * });
 * ```
 */
export default function initUpdateHooks(
  messageSocket: PostMessageSocket,
): (options?: UpdateHooksOptions) => string[] {
  // Store the current registered hooks from the parent
  let hooksFromParent: Record<string, HookMethod | null> = {};

  // Create error hook for handling errors in hook execution
  messageSocket.createMessageChannel("error", (payload: unknown) => {
    console.warn("Hook error:", payload);
  });

  /**
   * Updates the hooks based on the provided options.
   * Returns the list of active (non-null, function) hook names.
   */
  return function updateHooks(options?: UpdateHooksOptions): string[] {
    if (!options) {
      return Object.keys(hooksFromParent).filter(
        (hook) =>
          typeof hooksFromParent[hook] === "function" &&
          hooksFromParent[hook] !== null,
      );
    }

    const { hooks = {}, resetHooks = false } = options;

    // Reset mode: Remove all existing hooks before adding new ones
    if (resetHooks) {
      Object.keys(hooksFromParent).forEach((hook) => {
        messageSocket.removeListener(hook);
      });
      hooksFromParent = { ...hooks };
    } else {
      // Merge mode: Add new hooks to existing ones
      hooksFromParent = { ...hooksFromParent, ...hooks };
    }

    // Register/update message channels for each hook
    Object.entries(hooksFromParent).forEach(([hookName, hookCallback]) => {
      // If hook is null or not a function, remove it
      if (typeof hookCallback !== "function" || hookCallback === null) {
        messageSocket.removeListener(hookName);
        delete hooksFromParent[hookName];
        return;
      }

      // Create or update the message channel for this hook
      messageSocket.createMessageChannel(hookName, (payload: unknown) =>
        hookCallback(payload),
      );
    });

    // Return list of active hook names (functions only, exclude nulls)
    return Object.keys(hooksFromParent).filter(
      (hook) =>
        typeof hooksFromParent[hook] === "function" &&
        hooksFromParent[hook] !== null,
    );
  };
}
