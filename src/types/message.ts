import { ResultStrings, SuccessResult } from "./result";

/**
 * @module Message types for PostMessageSocket communication
 */

/**
 * String identifier for message channel names
 */
export type EventName = string;

/**
 * Internal message structure passed via postMessage
 */
export interface Message {
  /** The event/channel name */
  name: EventName;
  /** Unique identifier for message correlation */
  id: string;
  /** The actual data being sent */
  payload: unknown;
  /** Whether the sender expects a response */
  waitForResponse: boolean;
}

/**
 * Typed bidirectional communication channel for sending messages between windows
 */
export interface MessageChannel<T, U> {
  /** Send a message without waiting for answer, success result only means we sent the message */
  send(payload: T, opts?: { msgId?: string }): ResultStrings.Success;
  /** Send a message and wait for a response */
  sendAndWait(payload: T): Promise<SuccessResult<U>>;
}
