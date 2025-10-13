/**
 * @module Plugin-related types for initialization and communication
 */

/**
 * Type definition for plugin methods and parent callback functions.
 * Can be sync or async, can return a value or void.
 */
export type Method = (payload: unknown) => Promise<unknown> | unknown | void;

/**
 * Map of method names to their implementations
 */
export interface Methods {
  [name: string]: Method;
}

/**
 * Configuration for initializing a plugin from the parent side
 */
export interface PluginConfig {
  /** Initial data to pass to the plugin */
  data: unknown;
  /** Plugin settings and configuration */
  settings: unknown;
  /** Map of callback names to functions that the parent provides to the plugin */
  parentCallbacks: Record<string, Method>;
}

/**
 * Configuration for window communication setup
 */
export interface WindowConfig {
  /** The parent window that will communicate with the plugin */
  currentWindow: Window;
  /** The plugin's window (usually iframe.contentWindow) */
  targetWindow: Window;
  /** Optional timeout in milliseconds for plugin initialization */
  timeout?: number;
  /** Optional container element to remove on timeout */
  container?: HTMLElement;
}

/**
 * Options for creating and initializing an iframe-based plugin
 */
export interface IframeOptions {
  /** DOM element where the iframe will be appended */
  container: HTMLElement;
  /** URL of the plugin to load in the iframe */
  src: string;
  /** Optional callback invoked before appending iframe to DOM */
  beforeInit?: (context: {
    container: HTMLElement;
    iframe: HTMLIFrameElement;
  }) => void;
  /** Optional timeout in milliseconds for plugin initialization */
  timeout?: number;
}

/**
 * The interface returned by initPlugin, representing an initialized plugin from parent side
 */
export interface InitializedPlugin {
  /** Map of method names to async method implementations that call into the plugin */
  methods: Record<string, Method>;
  /** Function to terminate the plugin communication and cleanup resources */
  terminate: () => void;
}

/**
 * The interface returned by providePlugin, representing a plugin from the plugin side
 */
export interface ProvidedPlugin {
  /** Initial data received from the parent */
  data: unknown;
  /** Settings received from the parent */
  settings: unknown;
  /** Map of callback names to functions that call back to the parent */
  parentCallbacks: Record<string, Method>;
  /** Function to terminate the plugin communication and cleanup resources */
  terminate: () => void;
}

/**
 * Options for fullscreen plugin initialization
 */
export interface FullscreenPluginOptions {
  /** Unique identifier for the plugin container */
  id: string;
  /** URL of the plugin to load */
  src: string;
  /** Parent element where the plugin container will be appended (defaults to document.body) */
  parentElem?: HTMLElement;
  /** Optional callback invoked before initializing the plugin iframe */
  beforeInit?: (context: {
    container: HTMLElement;
    iframe: HTMLIFrameElement;
  }) => void;
  /** Optional timeout in milliseconds for plugin initialization */
  timeout?: number;
}

/**
 * Animation options for showing/hiding fullscreen plugins
 */
export interface AnimationOptions {
  /** Starting X position (e.g., "-100vw", "0px") */
  x?: string;
  /** Starting Y position (e.g., "0px", "100vh") */
  y?: string;
  /** Starting opacity (0-1) */
  opacity?: number;
  /** Starting scale (0-1+) */
  scale?: number;
  /** Animation duration in milliseconds */
  time?: number;
}

/**
 * The interface returned by initFullscreenPlugin
 */
export interface FullscreenPlugin {
  /** Internal reference to the container element (for debugging) */
  _container: HTMLDivElement;
  /** Internal reference to the plugin source URL (for debugging) */
  _src: string;
  /** Map of method names to async method implementations */
  methods: Record<string, Method>;
  /** Show the splash screen if configured */
  showSplashScreen: () => Promise<void> | void;
  /** Hide the splash screen */
  hideSplashScreen: () => void;
  /** Show the plugin with animation */
  show: (options?: AnimationOptions) => void;
  /** Hide the plugin with animation */
  hide: () => Promise<void> | void;
  /** Hide and remove the plugin from DOM */
  destroy: () => Promise<void>;
}

/**
 * Options for inline plugin initialization
 */
export interface InlinePluginOptions {
  /** URL of the plugin to load */
  src: string;
  /** Container element where the plugin iframe will be appended */
  container: HTMLElement;
  /** Optional callback invoked before initializing the plugin iframe */
  beforeInit?: (context: {
    container: HTMLElement;
    iframe: HTMLIFrameElement;
  }) => void;
  /** Optional timeout in milliseconds for plugin initialization */
  timeout?: number;
}

/**
 * The interface returned by initInlinePlugin
 */
export interface InlinePlugin {
  /** Internal reference to the container element (for debugging) */
  _container: HTMLElement;
  /** Map of method names to async method implementations */
  methods: Record<string, Method>;
  /** Remove all children from the container */
  destroy: () => void;
}
