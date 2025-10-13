import { createInitPlugin } from "./initPlugin";

import type {
  PluginConfig,
  InlinePluginOptions,
  InlinePlugin,
} from "./types/index.ts";

/**
 * Initializes an inline plugin within a specified container.
 *
 * @param config - Plugin configuration with data, settings, and parentCallbacks
 * @param options - Inline-specific options
 * @returns Promise resolving to inline plugin interface
 * @see InlinePlugin
 */
export default async function initInlinePlugin(
  { data, settings, parentCallbacks = {} }: PluginConfig,
  { src, container, beforeInit, timeout }: InlinePluginOptions,
): Promise<InlinePlugin> {
  const { methods, terminate } = await createInitPlugin(
    {
      data,
      settings,
      parentCallbacks,
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
    _container: container,
    methods,
    destroy,
  };
}
