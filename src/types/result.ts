/**
 * @module Result types for handling success and error cases
 */

/**
 * Rust-style Result type for safe error handling.
 * Returns either [data, null] on success or [null, error] on failure.
 */
export type SafeResult<T> =
  | [T, null] // Represents a successful result with data and no error
  | [null, Error]; // Represents a failed result with no data and an error

/**
 * Enum for successful result string constants
 */
export enum ResultStrings {
  Success = "Success",
}

/**
 * Represents a successful result with either typed data or a success message
 */
export type SuccessResult<T> = T | ResultStrings.Success;

/**
 * Enum for all error message string constants used throughout the library
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
