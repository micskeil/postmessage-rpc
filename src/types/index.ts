/**
 * @module Type definitions for @micskeil/postmessage-rpc
 *
 * This module exports all type definitions used throughout the postmessage-rpc library.
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
} from "./result";
export {
  ResultStrings,
  ErrorStrings,
} from "./result";

// Message types
export type {
  EventName,
  Message,
  MessageChannel,
} from "./message";

// Listener types
export type {
  ListenerOptions,
  CustomEventListener,
} from "./listener";

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
} from "./plugin";
