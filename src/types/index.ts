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
export type {
  SafeResult,
  SuccessResult,
} from "./result.ts";
export {
  ResultStrings,
  ErrorStrings,
} from "./result.ts";

// Message types
export type {
  EventName,
  Message,
  MessageChannel,
} from "./message.ts";

// Listener types
export type {
  ListenerOptions,
  CustomEventListener,
} from "./listener.ts";

// Plugin types
export type {
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
} from "./plugin.ts";
