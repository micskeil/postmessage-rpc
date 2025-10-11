/**
 * @module Type definitions for @chamaileon-sdk/plugin-interface
 *
 * This module exports all type definitions used throughout the plugin interface library.
 * Types are organized into separate files for better maintainability:
 * - result.ts: Result and error types
 * - message.ts: Message and channel types
 * - listener.ts: Event listener types
 * - plugin.ts: Plugin configuration and lifecycle types
 */

// Result types
export {
  SafeResult,
  ResultStrings,
  SuccessResult,
  ErrorStrings,
} from "./result";

// Message types
export {
  EventName,
  Message,
  MessageChannel,
} from "./message";

// Listener types
export {
  ListenerOptions,
  CustomEventListener,
} from "./listener";

// Plugin types
export {
  Method,
  Methods,
  PluginConfig,
  WindowConfig,
  IframeOptions,
  InitializedPlugin,
  ProvidedPlugin,
  FullscreenPluginOptions,
  AnimationOptions,
  FullscreenPlugin,
  InlinePluginOptions,
  InlinePlugin,
} from "./plugin";
