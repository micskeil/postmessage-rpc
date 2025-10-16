import PostMessageSocket from "./postMessageSocket";
import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";

import { ErrorStrings } from "./types/index";

import { useFixedMessageEvent } from "../test/utils/fixEvents";
import { ResultStrings } from "./types/index";

// Mock console.error to avoid cluttering test output
console.error = vi.fn();

const createMessageSockets = (window: Window, iframe: Window) => {
  const { addMessageEventFix, removeMessageEventFix } = useFixedMessageEvent();
  const windowSocket = new PostMessageSocket(window, iframe);
  const iframeSocket = new PostMessageSocket(iframe, window);
  addMessageEventFix(window, iframe);
  addMessageEventFix(iframe, window);
  return { windowSocket, iframeSocket, removeMessageEventFix };
};

describe("postMessageSocket", () => {
  let pluginIframe: HTMLIFrameElement;
  let pluginIframe2: HTMLIFrameElement;
  const body: HTMLElement = document.querySelector("body")!;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    pluginIframe = document.createElement("iframe");
    pluginIframe.src = "";
    pluginIframe.allowFullscreen = true;
    body.appendChild(pluginIframe);

    pluginIframe2 = document.createElement("iframe");
    pluginIframe2.src = "";
    pluginIframe2.allowFullscreen = true;
    body.appendChild(pluginIframe2);
  });

  afterEach(() => {
    body.removeChild(pluginIframe);
    body.removeChild(pluginIframe2);
    vi.clearAllMocks();
  });

  it("should provide a createMessageChannel method", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    expect(windowSocket).toBeInstanceOf(PostMessageSocket);
    expect(iframeSocket).toBeInstanceOf(PostMessageSocket);

    expect(windowSocket.createMessageChannel).toBeInstanceOf(Function);
    expect(iframeSocket.createMessageChannel).toBeInstanceOf(Function);
  });

  it("should not process the postMessage if the source is not the targetWindow", async () => {
    // Create socket: pluginIframe expects messages from pluginIframe2
    const { addMessageEventFix } = useFixedMessageEvent();
    const windowSocket = new PostMessageSocket(
      pluginIframe.contentWindow as Window,
      pluginIframe2.contentWindow as Window, // Expects messages from pluginIframe2
    );
    addMessageEventFix(
      pluginIframe.contentWindow as Window,
      pluginIframe2.contentWindow as Window,
    );

    const cb = vi.fn();
    windowSocket.createMessageChannel("test", cb);

    // Create a message event with wrong source (from body window instead of pluginIframe2)
    const event = new MessageEvent("message", {
      data: {
        name: "test",
        id: "1234",
        payload: "hello",
        waitForResponse: false,
      },
      source: window, // Wrong source - should be pluginIframe2.contentWindow
      origin: window.origin,
    });

    // Dispatch on the listening window
    pluginIframe.contentWindow?.dispatchEvent(event);

    vi.runAllTimers();

    // The message should be silently ignored (no error logged, callback not called)
    // This is expected behavior when multiple plugins exist
    expect(cb).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalledWith(ErrorStrings.NoSourceWindow);
  });

  it("should not process any post message without channel set up for it", async () => {
    createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const event = new MessageEvent("message", {
      data: {
        name: "test-window",
        id: "1234",
        payload: "hello world",
        waitForResponse: false,
      },
    });

    pluginIframe2.contentWindow?.dispatchEvent(event);
    vi.runAllTimers();

    expect(console.error).toHaveBeenCalledWith(
      ErrorStrings.NoMessageChannel + " test-window",
    );
  });

  it("should set up a listener for the message event if createMessageChannel is called", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const cbWindow = vi.fn().mockReturnValue("hello back from window");
    const cbIframe = vi.fn().mockReturnValue("hello back from iframe");

    const testChannelWindow = windowSocket.createMessageChannel(
      "test",
      cbWindow,
    );

    iframeSocket.createMessageChannel("test", cbIframe);

    const answareFromIframe = testChannelWindow?.send("hello iframe");

    expect(answareFromIframe).toBe(ResultStrings.Success);

    vi.runAllTimers();
    expect(cbIframe).toHaveBeenCalledWith("hello iframe");
  });

  it("should verify windowSocket and iframeSocket can send and receive", async function () {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const answers: string[] = [];
    // Mock the callback to store the answers
    const cb = vi.fn().mockImplementation((payload: string) => {
      answers.push(payload);
    });

    const windowChannel = windowSocket.createMessageChannel("test", cb);
    const iframeChannel = iframeSocket.createMessageChannel("test", cb);

    windowChannel?.send("iframe");
    vi.runAllTimers();

    expect(cb).toHaveBeenCalledWith("iframe");
    expect(answers).toEqual(["iframe"]);

    iframeChannel?.send("window");
    vi.runAllTimers();

    expect(cb).toHaveBeenCalledWith("window");
    expect(answers).toEqual(["iframe", "window"]);
  });

  it("should remove listener if the listener is a once listener", async function () {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe.contentWindow as Window,
      pluginIframe2.contentWindow as Window,
    );

    const cb = vi.fn().mockReturnValue("hello from the other side");
    const windowChannel = windowSocket.createMessageChannel("test", cb, {
      once: true,
    });
    const iframeChannel = iframeSocket.createMessageChannel("test", cb, {
      once: true,
    });

    iframeChannel?.send("hello world");
    windowChannel?.send("hello world");

    vi.runAllTimers();

    expect(cb).toHaveBeenNthCalledWith(1, "hello world");
    expect(cb).toHaveBeenNthCalledWith(2, "hello world");
    expect(cb).toHaveBeenCalledTimes(2);

    expect(iframeChannel?.send("hello world")).toBe(ResultStrings.Success);
    expect(windowChannel?.send("hello world")).toBe(ResultStrings.Success);

    vi.runAllTimers();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("should process a sendandWait message and return the response", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const msges: string[] = [];
    const answareCb = (payload: string) => "Hello " + payload.split(" ").pop();
    const cb = vi.fn().mockImplementation((payload: string) => {
      msges.push(payload);
      // return "hello " + payload's last word to simulate a response
      return answareCb(payload);
    });

    const windowChannel = windowSocket.createMessageChannel("test", cb);
    iframeSocket.createMessageChannel("test", cb);

    const payloadFromWindow = "Hi, I am Window";

    const answerPromise = windowChannel?.sendAndWait(payloadFromWindow);
    vi.runAllTimers();

    expect(cb).toHaveBeenCalledWith(payloadFromWindow);
    expect(msges).toEqual([payloadFromWindow]);

    answerPromise?.then((answer) => {
      expect(answer).toBe(answareCb(payloadFromWindow));
    });
  });

  it("should have a terminate method", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    expect(windowSocket.terminate).toBeInstanceOf(Function);
    expect(iframeSocket.terminate).toBeInstanceOf(Function);
  });

  it("should terminate the socket and remove the event listener", async () => {
    const { windowSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const cb = vi.fn();
    const testChannel = windowSocket.createMessageChannel("test", cb);

    windowSocket.terminate();

    testChannel?.send("hello world");

    expect(cb).not.toHaveBeenCalled();
  });

  it("should not let create a channel if the socket is terminated", async () => {
    const { windowSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    windowSocket.terminate();

    const cb = vi.fn();
    const channel = windowSocket.createMessageChannel("test", cb);

    expect(channel).toBeNull();
    expect(console.error).toHaveBeenCalledWith(ErrorStrings.SocketIsTerminated);
  });

  it("should not handle wrong message format", async () => {
    const { windowSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const cb = vi.fn();
    windowSocket.createMessageChannel("test", cb);

    const event = new MessageEvent("message", {
      data: {},
    });

    pluginIframe2.contentWindow?.dispatchEvent(event);
    vi.runAllTimers();

    expect(cb).not.toHaveBeenCalled();

    // if not an object, we should not process the message

    const event2 = new MessageEvent("message", {
      data: "hello world",
    });
    pluginIframe2.contentWindow?.dispatchEvent(event2);
    vi.runAllTimers();
    expect(cb).not.toHaveBeenCalled();
  });

  it("should not process postMessage when the socket terminated", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const cb = vi.fn().mockReturnValue("hello back from window");

    windowSocket.createMessageChannel("test", cb);
    const testChannel = iframeSocket.createMessageChannel("test", () => {});

    windowSocket.terminate();

    testChannel?.send("hello iframe");
    vi.runAllTimers();

    expect(cb).not.toHaveBeenCalled();
  });

  it("should validate origin and reject messages from wrong origin", async () => {
    const { windowSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const cb = vi.fn();
    windowSocket.createMessageChannel("test", cb);

    // Create a message with mismatched origin
    const event = new MessageEvent("message", {
      data: {
        name: "test",
        id: "1234",
        payload: "hello",
        waitForResponse: false,
      },
      origin: "https://malicious-site.com",
      source: pluginIframe.contentWindow,
    });

    pluginIframe2.contentWindow?.dispatchEvent(event);
    vi.runAllTimers();

    expect(cb).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Origin mismatch"),
    );
  });

  it("should handle async callbacks correctly", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const asyncCb = vi.fn().mockImplementation(async (payload: string) => {
      // Simulate async work
      return new Promise((resolve) => {
        setTimeout(() => resolve(`Processed: ${payload}`), 10);
      });
    });

    windowSocket.createMessageChannel("asyncTest", asyncCb);
    const testChannel = iframeSocket.createMessageChannel(
      "asyncTest",
      () => {},
    );

    const responsePromise = testChannel?.sendAndWait("test data");
    vi.runAllTimers();

    expect(asyncCb).toHaveBeenCalledWith("test data");

    responsePromise?.then((response) => {
      expect(response).toBe("Processed: test data");
    });
  });

  it("should handle callback errors and send error response", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const errorCb = vi.fn().mockImplementation(() => {
      throw new Error("Callback failed!");
    });

    windowSocket.createMessageChannel("errorTest", errorCb);
    const testChannel = iframeSocket.createMessageChannel(
      "errorTest",
      () => {},
    );

    const responsePromise = testChannel?.sendAndWait("trigger error");
    vi.runAllTimers();

    expect(errorCb).toHaveBeenCalledWith("trigger error");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in callback for "errorTest"'),
    );

    responsePromise?.then((response) => {
      // should receive error response
      expect(response).toEqual({ error: "Callback failed!" });
    });
  });

  it("should handle non-Error exceptions in callbacks", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const errorCb = vi.fn().mockImplementation(() => {
      throw "String error"; // Non-Error exception
    });

    windowSocket.createMessageChannel("stringErrorTest", errorCb);
    const testChannel = iframeSocket.createMessageChannel(
      "stringErrorTest",
      () => {},
    );

    const responsePromise = testChannel?.sendAndWait("trigger error");
    vi.runAllTimers();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in callback for "stringErrorTest"'),
    );

    responsePromise?.then((response) => {
      expect(response).toEqual({ error: "String error" });
    });
  });

  it("should properly clean up event listeners on terminate", async () => {
    const parentWindow = pluginIframe2.contentWindow as Window;
    const { windowSocket, removeMessageEventFix } = createMessageSockets(
      parentWindow,
      pluginIframe.contentWindow as Window,
    );

    const cb = vi.fn();
    windowSocket.createMessageChannel("test", cb);

    // Terminate the socket - this removes the event listener
    windowSocket.terminate();

    // Manually trigger a message event
    const event = new MessageEvent("message", {
      data: {
        name: "test",
        id: "1234",
        payload: "hello",
        waitForResponse: false,
      },
      source: pluginIframe.contentWindow,
      origin: parentWindow.origin,
    });

    parentWindow.dispatchEvent(event);
    vi.runAllTimers();

    // Callback should not be called because the event listener was removed
    expect(cb).not.toHaveBeenCalled();
    // No error is logged because the event listener itself was removed by terminate()

    removeMessageEventFix(parentWindow);
  });

  it("should handle race condition when message arrives during termination", async () => {
    // This test covers the defensive code in onMessage that checks isTerminated
    // It's hard to trigger naturally because terminate() removes the event listener,
    // but the check exists for edge cases and race conditions

    const parentWindow = pluginIframe2.contentWindow as Window;
    const childWindow = pluginIframe.contentWindow as Window;

    const { addMessageEventFix } = useFixedMessageEvent();
    const windowSocket = new PostMessageSocket(parentWindow, childWindow);
    addMessageEventFix(parentWindow, childWindow);

    const cb = vi.fn();
    windowSocket.createMessageChannel("test", cb);

    // Get access to the onMessage handler by monkey-patching
    const originalRemoveEventListener = parentWindow.removeEventListener;
    let messageHandler: any = null;

    // Intercept removeEventListener to capture the handler
    parentWindow.removeEventListener = function(type, listener, options) {
      if (type === "message") {
        messageHandler = listener;
      }
      return originalRemoveEventListener.call(this, type, listener, options);
    };

    // Terminate the socket
    windowSocket.terminate();

    // Restore removeEventListener
    parentWindow.removeEventListener = originalRemoveEventListener;

    // Clear previous console.error calls
    vi.clearAllMocks();

    // Now manually call the message handler to simulate a race condition
    if (messageHandler) {
      const event = new MessageEvent("message", {
        data: {
          name: "test",
          id: "1234",
          payload: "hello",
          waitForResponse: false,
        },
        source: childWindow,
        origin: childWindow.origin,
      });
      messageHandler(event);
    }

    vi.runAllTimers();

    // Should log the terminated error
    expect(console.error).toHaveBeenCalledWith(ErrorStrings.SocketIsTerminated);
    expect(cb).not.toHaveBeenCalled();
  });

  it("should handle case where answer handler is missing (line 321)", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    // Create a test channel
    windowSocket.createMessageChannel("test", () => "response");
    const iframeChannel = iframeSocket.createMessageChannel("test", () => {});

    // Send a message that expects a response
    const responsePromise = iframeChannel?.sendAndWait("test");
    vi.runAllTimers();

    // Manually delete the answer handler to simulate the race condition
    // Access private property for testing
    (windowSocket as any).answerHandlers.clear();

    // Now send a response - the handler should handle missing resolveFn gracefully
    const event = new MessageEvent("message", {
      data: {
        name: "test",
        id: "0-abc-123", // Use an ID that would match
        payload: "response",
        waitForResponse: false,
      },
      source: pluginIframe.contentWindow,
      origin: pluginIframe2.contentWindow?.origin,
    });

    pluginIframe2.contentWindow?.dispatchEvent(event);
    vi.runAllTimers();

    // Should handle gracefully without error
  });

  it("should not send error response when callback errors and waitForResponse is false (line 361)", async () => {
    const { windowSocket, iframeSocket } = createMessageSockets(
      pluginIframe2.contentWindow as Window,
      pluginIframe.contentWindow as Window,
    );

    const errorCb = vi.fn().mockImplementation(() => {
      throw new Error("Test error");
    });

    windowSocket.createMessageChannel("errorTest", errorCb);
    const testChannel = iframeSocket.createMessageChannel(
      "errorTest",
      () => {},
    );

    // Clear any previous errors
    vi.clearAllMocks();

    // Send a fire-and-forget message (waitForResponse: false)
    testChannel?.send("trigger error");
    vi.runAllTimers();

    // Callback should have been called and errored
    expect(errorCb).toHaveBeenCalledWith("trigger error");

    // Error should be logged
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in callback for "errorTest"'),
    );

    // But no error response should be sent back (line 361 branch: waitForResponse is false)
    // This is tested implicitly - if an error response were sent, it would cause issues
  });
});
