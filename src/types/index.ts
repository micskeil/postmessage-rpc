export type SafeResult<T> =
  | [T, null] // Represents a successful result with data and no error
  | [null, Error]; // Represents a failed result with no data and an erro>r

export enum ResultStrings {
  Success = "Success",
}
export type SuccessResult<T> = T | ResultStrings.Success; // Represents a successful result with data or a success message

/**
 * @module postMessageSocket related types
 */

export enum ErrorStrings {
  SocketIsTerminated = "Socket is terminated",
  NoTargetWindow = "No target window",
  NoSourceWindow = "The source window is not the target window",
  NoMessageChannel = "No message channel:",
  NoEventListener = "No event listener",
  NoEventName = "No event name",
  NoMessageId = "No message id",
  NoMessagePayload = "No message payload",
  WrongMessagePayload = "Wrong message payload format",
  NoMessageResponse = "No message response",
  NoMessageWaitForResponse = "No message wait for response",
}

/**
 * Options can be passed to the CustomEventListener
 */
export interface ListenerOptions {
  once: boolean;
}
/**
 * CustomEventListener is a type that represents a listener for a custom event.
 */
export interface CustomEventListener<T, U> {
  callback: (payload: T) => U;
  options: ListenerOptions;
  messageChannel: MessageChannel<T, U>;
}

export type EventName = string;

/**
 * Message can be sent to a @MessageChannel
 */
export interface Message {
  /** The event name */
  name: EventName;
  id: string;
  payload: unknown;
  waitForResponse: boolean;
}

export interface MessageChannel<T, U> {
  /** Send a message without waiting for answer, success result only means we sent the message */
  send(payload: T, opts?: { msgId?: string }): ResultStrings.Success;
  /** Send a message and wait for a response */
  sendAndWait(payload: T): Promise<SuccessResult<U>>;
}

/**
 * InitPlugin related types
 */
