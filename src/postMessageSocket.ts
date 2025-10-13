import type {
  CustomEventListener,
  EventName,
  Message,
  MessageChannel,
  SafeResult,
  SuccessResult,
} from "./types/index.ts";
import { ErrorStrings, ResultStrings } from "./types/index";

/**
 * PostMessageSocket provides secure, bidirectional communication between two window instances
 * using the postMessage API. It supports both fire-and-forget messaging and request-response patterns.
 *
 * ## Features
 * - Type-safe message channels with request/response patterns
 * - Origin validation for security
 * - Automatic async callback handling
 * - Error handling with custom error callbacks
 * - Once-listeners for one-time event handling
 * - Unique message ID generation for correlation
 * - Clean resource management with terminate()
 *
 * ## Security
 * - Validates message source window to prevent unauthorized communication
 * - Validates message origin to prevent cross-origin attacks
 * - Origin is captured at construction time and enforced for all messages
 *
 * ## Lifecycle
 * 1. Create socket instances in both windows (parent and child)
 * 2. Create message channels with callbacks on both sides
 * 3. Send messages using channel.send() or channel.sendAndWait()
 * 4. Call terminate() when done to clean up resources
 *
 * @example Basic Usage
 * ```typescript
 * // In parent window
 * const iframe = document.querySelector('iframe');
 * const parentSocket = new PostMessageSocket(window, iframe.contentWindow);
 * const channel = parentSocket.createMessageChannel("greeting", (message) => {
 *   console.log("Received:", message);
 *   return "Hello back!";
 * });
 *
 * // In iframe
 * const childSocket = new PostMessageSocket(window, window.parent);
 * const channel = childSocket.createMessageChannel("greeting", (message) => {
 *   console.log("Received:", message);
 * });
 * const response = await channel.sendAndWait("Hello!");
 * console.log(response); // "Hello back!"
 *
 * // Cleanup
 * parentSocket.terminate();
 * childSocket.terminate();
 * ```
 *
 * @example One-time Event Listener
 * ```typescript
 * socket.createMessageChannel("init", (data) => {
 *   console.log("Initialized with:", data);
 * }, { once: true });
 * ```
 */
export default class PostMessageSocket {
  /** The message counter is used to create unique message ids */
  private messageCounter = 0;
  private isTerminated = false;
  private errorCallback: (error: string) => void;
  private window: Window;
  private targetWindow: Window;
  private targetOrigin: string;
  private customEventListeners: Map<
    EventName,
    CustomEventListener<unknown, unknown>
  > = new Map();
  private onMessageFn = this.onMessage.bind(this);
  private answerHandlers: Map<string, (m: Message) => void> = new Map();

  /**
   * Creates a new PostMessageSocket for bidirectional communication between windows.
   * The target origin is captured at construction time and enforced for all messages.
   *
   * @example
   * ```typescript
   * // In parent window
   * const socket = new PostMessageSocket(
   *   window,
   *   iframe.contentWindow,
   *   (error) => console.error('Socket error:', error)
   * );
   * ```
   */
  constructor(
    window: Window,
    targetWindow: Window,
    errorCallback: (error: string) => void = (error) => console.error(error),
  ) {
    this.window = window;
    this.targetWindow = targetWindow;
    this.targetOrigin = targetWindow.origin;
    this.errorCallback = errorCallback;
    this.window.addEventListener("message", this.onMessageFn);
  }

  /**
   * Creates a message channel for typed, bidirectional communication.
   * Both windows must create a channel with the same name to communicate.
   * Callbacks can be sync or async - return value is sent back if sender used sendAndWait().
   *
   * @example Fire-and-forget messaging
   * ```typescript
   * const channel = socket.createMessageChannel("notification", (msg) => {
   *   console.log("Notification:", msg);
   * });
   * channel.send({ type: "info", text: "Hello!" });
   * ```
   *
   * @example Request-response pattern
   * ```typescript
   * // In window A
   * socket.createMessageChannel("calculate", (nums: number[]) => {
   *   return nums.reduce((a, b) => a + b, 0);
   * });
   *
   * // In window B
   * const channel = socket.createMessageChannel("calculate", () => {});
   * const sum = await channel.sendAndWait([1, 2, 3, 4]);
   * console.log(sum); // 10
   * ```
   *
   * @example One-time initialization
   * ```typescript
   * socket.createMessageChannel("ready", (data) => {
   *   console.log("Initialization complete:", data);
   * }, { once: true });
   * ```
   */
  createMessageChannel<T, U>(
    name: string,
    callback: CustomEventListener<T, U>["callback"],
    options: { once: boolean } = { once: false },
  ): MessageChannel<T, U> | null {
    if (this.isTerminated) {
      this.errorCallback(ErrorStrings.SocketIsTerminated);
      return null;
    }

    const sendPostMessage = (opts: {
      payload: T;
      waitForResponse?: boolean;
      msgId?: string;
    }): string => {
      const { payload, waitForResponse, msgId } = opts;
      // Use provided message ID for responses, or generate new ID for new messages
      const id = msgId ? msgId : this.getNextMsgId();
      this.targetWindow.postMessage(
        {
          id,
          name,
          payload,
          waitForResponse,
        },
        this.targetOrigin, // Enforces origin security
      );
      return id;
    };

    const send = (
      payload: T,
      opts?: {
        msgId?: string;
      },
    ): ResultStrings.Success => {
      const { msgId } = opts || {};
      sendPostMessage({
        payload,
        waitForResponse: false,
        msgId,
      });
      return ResultStrings.Success;
    };

    const sendAndWait = async (payload: T): Promise<SuccessResult<U>> => {
      const id = sendPostMessage({
        payload,
        waitForResponse: true,
      });
      // Wait for the response to arrive and be handled in onMessage
      const result = (await this.handleAnswerMessage(id)) as Promise<
        SuccessResult<U>
      >;
      return result;
    };

    this.customEventListeners.set(name, {
      callback,
      options,
      messageChannel: {
        send,
        sendAndWait,
      },
    } as CustomEventListener<unknown, unknown>);

    return {
      send,
      sendAndWait,
    };
  }

  /**
   * Creates a promise that resolves when a response with matching ID arrives.
   * Used for request-response pattern in sendAndWait().
   */
  private handleAnswerMessage(id: string) {
    return new Promise((resolve) => {
      const resolveMessage = async (message: Message) => {
        // Clean up the handler after receiving response
        this.answerHandlers.delete(message.id);
        resolve(message.payload);
      };
      // Register handler to be invoked by onMessage when response arrives
      this.answerHandlers.set(id, resolveMessage);
    });
  }

  /**
   * Removes a message channel listener by name.
   * After removal, messages sent to this channel will trigger an error callback.
   * Note: Once-listeners are automatically removed after first invocation.
   *
   * @example
   * ```typescript
   * const channel = socket.createMessageChannel("temp", (msg) => {
   *   console.log(msg);
   * });
   *
   * // Later, remove the listener
   * socket.removeListener("temp");
   * ```
   */
  removeListener(eventName: string) {
    this.customEventListeners.delete(eventName);
  }

  /**
   * Validates that an incoming message has the required structure.
   * Checks for presence of id, name, payload, and waitForResponse properties.
   */
  private validateMessage(message: unknown): message is Message {
    // Check if the message is valid
    if (!message || typeof message !== "object") {
      return false;
    }

    // Check if the message has the required properties
    if (
      !Object.hasOwnProperty.call(message, "name") ||
      !Object.hasOwnProperty.call(message, "payload") ||
      !Object.hasOwnProperty.call(message, "id") ||
      !Object.hasOwnProperty.call(message, "waitForResponse")
    ) {
      return false;
    }
    return true;
  }

  /**
   * Parses and validates incoming message data using a Rust-style Result type.
   * Returns [data, null] on success, [null, error] on failure.
   */
  private parseData(data: unknown): SafeResult<Message> {
    // Check if the message is valid
    if (!this.validateMessage(data)) {
      return [null, new Error(ErrorStrings.WrongMessagePayload)];
    }
    return [data, null];
  }

  /**
   * Main message handler that processes all incoming postMessage events.
   * Handles both regular messages and responses to previous sendAndWait() calls.
   */
  private async onMessage(event: MessageEvent) {
    if (this.isTerminated) {
      this.errorCallback(ErrorStrings.SocketIsTerminated);
      return;
    }
    // Security validation: Verify message source and origin
    // Silently ignore messages from other windows (expected when multiple plugins exist)
    if (event.source !== this.targetWindow) {
      // Return silently - could be other plugins or unrelated messages
      return;
    }

    // Prevent this event from bubbling to other listeners
    event.stopImmediatePropagation();

    // Validate the origin matches the expected target origin (set at construction)
    if (event.origin !== this.targetOrigin) {
      this.errorCallback(
        `${ErrorStrings.WrongMessagePayload}: Origin mismatch. Expected ${this.targetOrigin}, got ${event.origin}`,
      );
      return;
    }

    const [message, error] = this.parseData(event.data);

    if (error) {
      this.errorCallback(error.message);
      return;
    }
    const { id, waitForResponse, name, payload } = message;

    // Check if this is a response to a previous sendAndWait() call
    const isAnswer = this.answerHandlers.has(id);

    if (isAnswer) {
      // Resolve the waiting promise with the response payload
      const resolveFn = this.answerHandlers.get(id);
      if (!resolveFn) return;
      return resolveFn(message);
    }

    // This is a new incoming message, find the registered listener
    const listener = this.customEventListeners.get(name);
    if (!listener) {
      this.errorCallback(`${ErrorStrings.NoMessageChannel} ${name}`);
      return;
    }

    const {
      callback: cb,
      options: { once },
    } = listener;

    // Remove once-listeners after first invocation
    if (once) {
      this.removeListener(name);
    }

    try {
      // Execute the callback (handles both sync and async callbacks)
      const result = await cb(payload);

      // If sender used sendAndWait(), send the result back
      if (waitForResponse) {
        // Send back the result to the waiting sender
        listener.messageChannel.send(result, {
          msgId: id, // Reuse same ID so sender can correlate response
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.errorCallback(`Error in callback for "${name}": ${errorMessage}`);

      // Send error response if caller is waiting
      if (waitForResponse) {
        listener.messageChannel.send({ error: errorMessage }, { msgId: id });
      }
    }
  }

  /**
   * Generates a unique message ID for correlation between requests and responses.
   * Format: <counter>-<random>-<timestamp> (e.g., "0-abc1234-kgj3h5")
   * - Counter: Sequential per socket instance
   * - Random: Base36 random string for uniqueness
   * - Timestamp: Base36 timestamp for ordering and debugging
   */
  private getNextMsgId(): string {
    return `${this.messageCounter++}-${Math.random()
      .toString(36)
      .slice(2, 9)}-${Date.now().toString(36)}`;
  }

  /**
   * Terminates the socket connection and cleans up all resources.
   * Removes event listeners, clears message channels, and prevents further communication.
   * Always call this method when you're done using the socket to prevent memory leaks.
   */
  terminate() {
    this.isTerminated = true;
    this.window.removeEventListener("message", this.onMessageFn);
    this.customEventListeners.clear();
    this.answerHandlers.clear();
  }
}
