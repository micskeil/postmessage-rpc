import {
  CustomEventListener,
  ErrorStrings,
  EventName,
  Message,
  MessageChannel,
  ResultStrings,
  SafeResult,
  SuccessResult,
} from "./types/index";

/**
 * PostMessageSocket facilitates seamless communication between two window instances using postMessage and EventListeners.
 *
 * @example (window and iframe predefined)
 * const windowSocket = new PostMessageSocket(window, iframe.contentWindow);
 * const iframeSocket = new PostMessageSocket(iframe.contentWindow, window);
 * windowSocket.createMessageChannel("EVENT_NAME", (payload) => console.log(payload));
 * iframeSocket.createMessageChannel("EVENT_NAME", (payload) => console.log(payload));
 *
 * iframeSocket.sendMessage("EVENT_NAME", "Hello World");
 * Console will log "Hello World" in the windowSocket listener
 */
export default class PostMessageSocket {
  /** The message counter is used to create unique message ids */
  private messageCounter = 0;
  private isTerminated = false;
  private errorCallback: (error: string) => void;
  private window: Window;
  private targetWindow: Window;
  private customEventListeners: Map<
    EventName,
    CustomEventListener<unknown, unknown>
  > = new Map();
  private onMessageFn = this.onMessage.bind(this);
  private answerHandlers: Map<string, (m: Message) => void> = new Map();

  constructor(
    window: Window,
    targetWindow: Window,
    errorCallback: (error: string) => void = (error) => console.error(error),
  ) {
    this.window = window;
    this.targetWindow = targetWindow;
    this.errorCallback = errorCallback;
    this.window.addEventListener("message", this.onMessageFn);
  }

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
      const id = msgId ? msgId : this.getNextMsgId();
      this.targetWindow.postMessage(
        {
          id,
          name,
          payload,
          waitForResponse,
        },
        this.targetWindow.origin,
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

  private handleAnswerMessage(id: string) {
    return new Promise((resolve) => {
      const resolveMessage = async (message: Message) => {
        // Remove the listener from the answerHandlers map
        this.answerHandlers.delete(message.id);
        resolve(message.payload);
      };
      this.answerHandlers.set(id, resolveMessage);
    });
  }

  /**
   * Delete a listener for a custom event
   */
  removeListener(eventName: string) {
    this.customEventListeners.delete(eventName);
  }

  /**
   * Check if the message is valid, basically check if the message is an object and has the required properties
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

  private parseData(data: unknown): SafeResult<Message> {
    // Check if the message is valid
    if (!this.validateMessage(data)) {
      return [null, new Error(ErrorStrings.WrongMessagePayload)];
    }
    return [data, null];
  }

  private onMessage(event: MessageEvent) {
    event.stopImmediatePropagation();
    if (this.isTerminated) {
      this.errorCallback(ErrorStrings.SocketIsTerminated);
      return;
    }
    // If the event source is not the targetWindow window or the event origin is not the targetWindow origin, we don't want to do anything
    if (event.source !== this.targetWindow) {
      this.errorCallback(ErrorStrings.NoSourceWindow);
      return;
    }

    const [message, error] = this.parseData(event.data);

    if (error) {
      this.errorCallback(error.message);
      return;
    }
    const { id, waitForResponse, name, payload } = message;

    // Check if the message is waited as response
    const isAnswer = this.answerHandlers.has(id);

    // if the message is a response to a sent message, we want to resolve the promise
    if (isAnswer) {
      const resolveFn = this.answerHandlers.get(id);
      if (!resolveFn) return;
      return resolveFn(message);
    }

    const listener = this.customEventListeners.get(name);
    if (!listener) {
      this.errorCallback(`${ErrorStrings.NoMessageChannel} ${name}`);
      return;
    }

    const {
      callback: cb,
      options: { once },
    } = listener;

    // If the listener is a once listener, we want to remove it
    if (once) {
      this.removeListener(name);
    }

    const result = cb(payload);

    if (waitForResponse) {
      listener.messageChannel.send(result, {
        msgId: id,
      });
    }

    return result;
  }

  private getNextMsgId(): string {
    // The id is structured as: <incremental message counter>-<random string>-<timestamp>
    // Example: "0-abc1234-kgj3h5"
    return `${this.messageCounter++}-${
      Math.random().toString(36).slice(2, 9)
    }-${Date.now().toString(36)}`;
  }

  /**
   * Remove the message event listener from the window when the socket is terminated
   */
  terminate() {
    this.isTerminated = true;
    this.customEventListeners.clear();
    this.answerHandlers.clear();
  }
}
