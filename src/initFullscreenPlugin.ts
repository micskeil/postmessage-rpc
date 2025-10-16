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
 * @param config - Plugin configuration with data, settings, and hooks
 * @param options - Fullscreen-specific options
 * @returns Promise resolving to fullscreen plugin interface
 * @see FullscreenPlugin
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
    src: src,
    methods,
    showSplashScreen,
    hideSplashScreen,
    show,
    hide,
    destroy,
  };
}
