import { createInitPlugin } from "./initPlugin";
import type {
  PluginConfig,
  FullscreenPluginOptions,
  FullscreenPlugin,
} from "./types/index";

let currentZIndex = 0;

/**
 * Initializes a fullscreen plugin with custom animations and optional splash screen.
 *
 * Use this function when you want to display a plugin as a modal dialog that covers
 * the entire viewport. The plugin supports smooth animations and optional splash screens.
 *
 * ## When to Use Fullscreen Plugins
 *
 * - Modal dialogs and forms
 * - Full-page editors
 * - Lightbox galleries
 * - Wizards and step-by-step processes
 * - Plugins that need exclusive focus
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { initFullscreenPlugin } from '@micskeil/postmessage-rpc';
 *
 * // Initialize the fullscreen plugin
 * const plugin = await initFullscreenPlugin(
 *   {
 *     data: {
 *       documentId: 'doc-123',
 *       content: 'Initial content...'
 *     },
 *     settings: {
 *       theme: 'dark',
 *       splashScreenUrl: 'https://example.com/splash.html'
 *     },
 *     hooks: {
 *       onSave: async (data) => {
 *         console.log('Saved:', data);
 *         await updateDocument(data);
 *       },
 *       onClose: async () => {
 *         console.log('Plugin closed');
 *       }
 *     }
 *   },
 *   {
 *     id: 'document-editor',
 *     src: 'https://example.com/editor-plugin.html',
 *     parentElem: document.body,
 *     timeout: 5000
 *   }
 * );
 *
 * // Show the plugin with animation
 * plugin.show({
 *   x: '0px',      // Start x position
 *   y: '100vh',    // Start y position (from bottom)
 *   opacity: 0.5,  // Start opacity
 *   time: 300      // Animation duration in ms
 * });
 *
 * // Hide when done
 * await plugin.hide();
 *
 * // Cleanup
 * await plugin.destroy();
 * ```
 *
 * ## Animation Options
 *
 * The `show()` method supports custom animation parameters:
 *
 * ```typescript
 * plugin.show({
 *   x: '-100vw',   // Slide from left (default)
 *   y: '0px',      // Slide from top
 *   opacity: 0.5,  // Fade from 50% opacity
 *   scale: 0.95,   // Scale from 95%
 *   time: 500      // Animation duration (ms)
 * });
 * ```
 *
 * ## Splash Screen
 *
 * You can show a loading/splash screen while the plugin loads:
 *
 * ```typescript
 * // Show splash screen while loading
 * plugin.showSplashScreen();
 *
 * // Plugin loads...
 *
 * // Hide splash when ready
 * plugin.hideSplashScreen();
 * ```
 *
 * Enable splash screen via settings:
 * ```typescript
 * const plugin = await initFullscreenPlugin(
 *   {
 *     settings: {
 *       splashScreenUrl: 'https://example.com/splash.html'
 *     }
 *   },
 *   options
 * );
 * ```
 *
 * @param config - Plugin configuration object
 * @param config.data - Initial data passed to the plugin
 * @param config.settings - Configuration settings for the plugin
 * @param config.settings.splashScreenUrl - Optional URL of splash screen iframe
 * @param config.hooks - Parent callback functions
 *
 * @param options - Fullscreen-specific initialization options
 * @param options.id - Unique identifier for the plugin container element
 * @param options.src - URL of the plugin HTML/JavaScript to load
 * @param options.parentElem - Parent DOM element to attach to (default: document.body)
 * @param options.beforeInit - Optional callback invoked after iframe creation
 * @param options.timeout - Optional timeout in milliseconds
 *
 * @returns Promise resolving to fullscreen plugin interface with methods, animations, and splash screen functions
 * @throws {Error} If plugin fails to initialize within the timeout period
 *
 * @see {@link initInlinePlugin} for embedded inline plugins
 * @see {@link providePlugin} for plugin-side registration
 * @see FullscreenPlugin
 *
 * @example
 * ```typescript
 * // Example: Document editor with animations
 * const editor = await initFullscreenPlugin(
 *   {
 *     data: { docId: '123' },
 *     hooks: {
 *       onSave: (doc) => saveDocument(doc)
 *     }
 *   },
 *   {
 *     id: 'editor-modal',
 *     src: 'https://editor.example.com/plugin.html'
 *   }
 * );
 *
 * // Show from bottom with slide animation
 * editor.show({ y: '100vh', time: 400 });
 *
 * // Later...
 * await editor.hide();
 * await editor.destroy();
 * ```
 */
export default async function initFullscreenPlugin(
  { data, settings, hooks = {} }: PluginConfig,
  { id, src, parentElem, beforeInit, timeout }: FullscreenPluginOptions,
): Promise<FullscreenPlugin> {
  let container: HTMLDivElement | null = document.createElement("div");
  container.id = id;
  container.style.position = "fixed";
  container.style.display = "flex";
  container.style.top = "0";
  container.style.left = "0";
  container.style.zIndex = "0";
  // Hide to the top
  let defaultAnimationTime = 500;
  let hiddenPosition = "translate3d(-100vw, 0px, 0px) scale(1)";
  let hiddenOpacity = "0";
  container.style.transform = hiddenPosition;
  container.style.opacity = hiddenOpacity;
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.border = "0";
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.transition = "transform 0s";

  const parent = parentElem || document.body;
  parent.appendChild(container);

  let splashScreen: HTMLIFrameElement | undefined;
  function showSplashScreen(): Promise<void> | void {
    if (
      !settings ||
      typeof settings !== "object" ||
      !("splashScreenUrl" in settings) ||
      !settings.splashScreenUrl
    )
      return;
    return new Promise<void>((resolve) => {
      if (!container) return resolve();
      splashScreen = document.createElement("iframe");
      splashScreen.src = (
        settings as { splashScreenUrl: string }
      ).splashScreenUrl;

      splashScreen.style.position = "absolute";
      splashScreen.style.top = "0";
      splashScreen.style.left = "0";
      splashScreen.style.width = "100%";
      splashScreen.style.height = "100%";
      splashScreen.style.opacity = "1";
      splashScreen.style.border = "0";
      splashScreen.style.margin = "0";
      splashScreen.style.padding = "0";
      splashScreen.style.transition = "opacity 0.5s";
      container.appendChild(splashScreen);
      splashScreen.addEventListener("load", () => resolve(), { once: true });
    });
  }

  function hideSplashScreen() {
    if (!splashScreen) {
      return;
    }
    splashScreen.style.opacity = "0";
    setTimeout(() => {
      if (splashScreen) {
        splashScreen.remove();
      }
    }, 500);
  }

  let isVisible = false;
  function show({
    x = "-100vw",
    y = "0px",
    opacity = 0.5,
    scale = 1,
    time = defaultAnimationTime,
  } = {}): void {
    if (isVisible || !container) return;
    if (isNaN(time)) {
      throw new Error("Animation time must be a number!");
    }
    defaultAnimationTime = time;
    hiddenPosition = `translate3d(${x}, ${y}, 0px) scale(${scale})`;
    hiddenOpacity = opacity.toString();
    currentZIndex++;
    container.style.zIndex = currentZIndex.toString();
    container.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      if (!container) return;
      container.style.transition = "transform 0s";
      container.style.transform = `translate3d(${x}, ${y}, 0px) scale(${scale})`;
      container.style.opacity = opacity.toString();
      container.style.display = "block";

      window.requestAnimationFrame(() => {
        if (!container) return;
        container.style.transition = `all ${time}ms`;
        container.style.transform = "translate3d(0px, 0px, 0px) scale(1)";
        container.style.opacity = "1";
        isVisible = true;
      });
    });
  }

  function hide(): Promise<void> | void {
    if (!isVisible || !container) return;
    return new Promise<void>((resolve) => {
      if (!container) return resolve();
      container.style.overflow = "hidden";
      container.style.transition = `transform ${defaultAnimationTime / 1000}s`;
      container.style.opacity = hiddenOpacity;
      container.style.transform = hiddenPosition;
      isVisible = false;
      if (hiddenOpacity === "0") {
        container.style.display = "none";
      }
      const transitionEnded = (e: TransitionEvent) => {
        if (e.propertyName !== "opacity" && e.propertyName !== "transform")
          return;
        resolve();
      };
      container.addEventListener("transitionend", transitionEnded, {
        once: true,
      });
    });
  }

  async function destroy(): Promise<void> {
    await hide();
    if (container) {
      container.remove();
      container = null;
    }
  }

  if (!beforeInit || typeof beforeInit !== "function") {
    beforeInit = function ({ iframe }) {
      iframe.style.width = "100%";
      iframe.style.height = "100%";
    };
  }

  const { methods } = await createInitPlugin(
    { data, settings, hooks },
    { container, src, beforeInit, timeout },
  );

  if (!container) {
    throw new Error("Container was destroyed during initialization");
  }

  return {
    container,
    src,
    methods,
    showSplashScreen,
    hideSplashScreen,
    show,
    hide,
    destroy,
  };
}
