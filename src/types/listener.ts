import { MessageChannel } from "./message.ts";

/**
 * @module Event listener types for message channel callbacks
 */

/**
 * Options that can be passed to CustomEventListener
 */
export interface ListenerOptions {
  /** Whether the listener should be automatically removed after first invocation */
  once: boolean;
}

/**
 * Internal representation of a message channel listener with callback and options
 */
export interface CustomEventListener<T, U> {
  /** Function to be called when a message is received */
  callback: (payload: T) => U;
  /** Configuration options for the listener */
  options: ListenerOptions;
  /** Reference to the message channel for sending responses */
  messageChannel: MessageChannel<T, U>;
}
