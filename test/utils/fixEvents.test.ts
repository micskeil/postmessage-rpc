import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { useFixedMessageEvent } from "./fixEvents";

describe("fixEvents", () => {
  let dom: JSDOM;
  let parentWindow: Window;
  let childWindow: Window;

  beforeEach(() => {
    // Create parent window
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost",
    });
    parentWindow = dom.window as unknown as Window;

    // Create child window (simulating an iframe)
    const iframe = parentWindow.document.createElement("iframe");
    parentWindow.document.body.appendChild(iframe);
    childWindow = iframe.contentWindow as Window;
  });

  describe("useFixedMessageEvent", () => {
    it("should return addMessageEventFix and removeMessageEventFix functions", () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      expect(addMessageEventFix).toBeTypeOf("function");
      expect(removeMessageEventFix).toBeTypeOf("function");
    });

    it("should fix MessageEvent with empty origin", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      addMessageEventFix(parentWindow, childWindow);

      // Listen for the fixed event
      const eventPromise = new Promise<MessageEvent>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          resolve(event);
        });
      });

      // Dispatch event with empty origin (simulating jsdom bug)
      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);

      const event = await eventPromise;
      expect(event.origin).toBe("http://localhost");
      expect(event.source).toBe(childWindow);
      expect(event.data).toEqual({ test: "data" });
      removeMessageEventFix(parentWindow);
    });

    it("should not modify MessageEvent with valid origin", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      addMessageEventFix(parentWindow, childWindow);

      let eventCount = 0;

      // Listen for events
      const eventPromise = new Promise<void>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          eventCount++;

          expect(event.origin).toBe("http://example.com");
          expect(event.data).toEqual({ test: "data" });

          // Wait a bit to ensure no duplicate events
          setTimeout(() => {
            expect(eventCount).toBe(1);
            removeMessageEventFix(parentWindow);
            resolve();
          }, 10);
        });
      });

      // Dispatch event with valid origin
      const validEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "http://example.com",
        source: childWindow,
      });

      parentWindow.dispatchEvent(validEvent);
      await eventPromise;
    });

    it("should not add duplicate listeners for same window", () => {
      const { addMessageEventFix } = useFixedMessageEvent();

      const spy = vi.spyOn(parentWindow, "addEventListener");

      addMessageEventFix(parentWindow, childWindow);
      addMessageEventFix(parentWindow, childWindow);
      addMessageEventFix(parentWindow, childWindow);

      // Should only be called once
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should properly remove event listener", () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      const addSpy = vi.spyOn(parentWindow, "addEventListener");
      const removeSpy = vi.spyOn(parentWindow, "removeEventListener");

      addMessageEventFix(parentWindow, childWindow);
      expect(addSpy).toHaveBeenCalledTimes(1);

      removeMessageEventFix(parentWindow);
      expect(removeSpy).toHaveBeenCalledTimes(1);

      // Verify the same callback reference was used
      const addedCallback = addSpy.mock.calls[0][1];
      const removedCallback = removeSpy.mock.calls[0][1];
      expect(addedCallback).toBe(removedCallback);
    });

    it("should handle null origin", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      addMessageEventFix(parentWindow, childWindow);

      const eventPromise = new Promise<MessageEvent>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          resolve(event);
        });
      });

      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "null",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);

      const event = await eventPromise;
      expect(event.origin).toBe("http://localhost");
      expect(event.source).toBe(childWindow);
      removeMessageEventFix(parentWindow);
    });

    it("should use partner origin when available", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      // Create a partner window with a specific origin
      const partnerDom = new JSDOM(
        "<!DOCTYPE html><html><body></body></html>",
        {
          url: "http://partner-origin.com",
        },
      );
      const partnerWindow = partnerDom.window as unknown as Window;

      addMessageEventFix(parentWindow, partnerWindow);

      const eventPromise = new Promise<MessageEvent>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          resolve(event);
        });
      });

      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);

      const event = await eventPromise;
      expect(event.origin).toBe("http://partner-origin.com");
      expect(event.source).toBe(partnerWindow);
      removeMessageEventFix(parentWindow);
    });

    it("should use capture phase", () => {
      const { addMessageEventFix } = useFixedMessageEvent();

      const spy = vi.spyOn(parentWindow, "addEventListener");

      addMessageEventFix(parentWindow, childWindow);

      expect(spy).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
        true, // capture phase
      );
    });

    it("should stop immediate propagation of broken events", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      let originalEventReceived = false;
      let fixedEventReceived = false;

      // Add a listener BEFORE the fix (in capture phase)
      parentWindow.addEventListener(
        "message",
        (event: MessageEvent) => {
          if (event.origin === "") {
            originalEventReceived = true;
          }
        },
        true,
      );

      addMessageEventFix(parentWindow, childWindow);

      // Add a listener AFTER the fix
      const eventPromise = new Promise<void>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          if (event.origin === "http://localhost") {
            fixedEventReceived = true;
          }

          // Check after a short delay
          setTimeout(() => {
            // The listener added before the fix should receive the broken event
            expect(originalEventReceived).toBe(true);
            // The listener added after should receive the fixed event
            expect(fixedEventReceived).toBe(true);
            removeMessageEventFix(parentWindow);
            resolve();
          }, 10);
        });
      });

      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);
      await eventPromise;
    });

    it("should handle removeMessageEventFix when no listener exists", () => {
      const { removeMessageEventFix } = useFixedMessageEvent();

      // Should not throw
      expect(() => removeMessageEventFix(parentWindow)).not.toThrow();
    });

    it("should allow re-adding listener after removal", () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      const spy = vi.spyOn(parentWindow, "addEventListener");

      addMessageEventFix(parentWindow, childWindow);
      expect(spy).toHaveBeenCalledTimes(1);

      removeMessageEventFix(parentWindow);

      addMessageEventFix(parentWindow, childWindow);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Bug: Multiple partner windows", () => {
    it("BUG: should update partner window when called again, but doesn't", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      // Create two different partner windows
      const partner1Dom = new JSDOM(
        "<!DOCTYPE html><html><body></body></html>",
        {
          url: "http://partner1.com",
        },
      );
      const partner1Window = partner1Dom.window as unknown as Window;

      const partner2Dom = new JSDOM(
        "<!DOCTYPE html><html><body></body></html>",
        {
          url: "http://partner2.com",
        },
      );
      const partner2Window = partner2Dom.window as unknown as Window;

      // Add fix with partner1
      addMessageEventFix(parentWindow, partner1Window);

      // Try to add fix with partner2 (this will be ignored - BUG)
      addMessageEventFix(parentWindow, partner2Window);

      const eventPromise = new Promise<MessageEvent>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          resolve(event);
        });
      });

      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);

      const event = await eventPromise;
      // This will fail because the partner is still partner1, not partner2
      // Expected: http://partner2.com
      // Actual: http://partner1.com
      expect(event.origin).toBe("http://partner1.com"); // This passes, showing the bug
      expect(event.origin).not.toBe("http://partner2.com"); // Should be partner2 but isn't
      removeMessageEventFix(parentWindow);
    });
  });

  describe("Bug: No partner validation", () => {
    it("BUG: should validate partner is not null, but doesn't", () => {
      const { addMessageEventFix } = useFixedMessageEvent();

      // This should validate partner but doesn't
      expect(() => {
        addMessageEventFix(parentWindow, null as any);
      }).not.toThrow(); // Currently doesn't throw (no validation at registration time)

      // Note: When event is dispatched, it will crash inside the listener with:
      // TypeError: Cannot read properties of null (reading 'origin')
      // But this error is silently swallowed by jsdom's event system
    });

    it("BUG: should validate partner is not undefined, but doesn't", () => {
      const { addMessageEventFix } = useFixedMessageEvent();

      expect(() => {
        addMessageEventFix(parentWindow, undefined as any);
      }).not.toThrow(); // Currently doesn't throw (no validation at registration time)

      // Note: When event is dispatched, it will crash inside the listener with:
      // TypeError: Cannot read properties of undefined (reading 'origin')
      // But this error is silently swallowed by jsdom's event system
    });

    it("BUG: crashes when null partner receives empty origin event", async () => {
      const { addMessageEventFix } = useFixedMessageEvent();

      // Mock console.error to suppress expected error output
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Add fix with null partner (no validation)
      addMessageEventFix(parentWindow, null as any);

      // Track if listener was called
      let listenerCalled = false;
      parentWindow.addEventListener("message", () => {
        listenerCalled = true;
      });

      const brokenEvent = new MessageEvent("message", {
        data: { test: "data" },
        origin: "",
        source: null,
      });

      // Dispatch event - this causes crash inside the fix listener
      // The error is silently caught by jsdom, so we won't see it
      parentWindow.dispatchEvent(brokenEvent);

      // The listener won't be called because the fix listener crashes first
      await new Promise((resolve) => setTimeout(resolve, 10));

      // This demonstrates the bug: the crash prevents other listeners from receiving the event
      expect(listenerCalled).toBe(false);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple windows with different partners", () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      const dom2 = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "http://localhost",
      });
      const window2 = dom2.window as unknown as Window;

      const partner1Dom = new JSDOM(
        "<!DOCTYPE html><html><body></body></html>",
        {
          url: "http://partner1.com",
        },
      );
      const partner1 = partner1Dom.window as unknown as Window;

      const partner2Dom = new JSDOM(
        "<!DOCTYPE html><html><body></body></html>",
        {
          url: "http://partner2.com",
        },
      );
      const partner2 = partner2Dom.window as unknown as Window;

      // Add different partners for different windows
      addMessageEventFix(parentWindow, partner1);
      addMessageEventFix(window2, partner2);

      const spy1 = vi.fn();
      const spy2 = vi.fn();

      parentWindow.addEventListener("message", spy1);
      window2.addEventListener("message", spy2);

      // Dispatch to both windows
      parentWindow.dispatchEvent(
        new MessageEvent("message", {
          data: "test1",
          origin: "",
          source: null,
        }),
      );

      window2.dispatchEvent(
        new MessageEvent("message", {
          data: "test2",
          origin: "",
          source: null,
        }),
      );

      // Both should receive fixed events
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();

      removeMessageEventFix(parentWindow);
      removeMessageEventFix(window2);
    });

    it("should handle events with complex data payloads", async () => {
      const { addMessageEventFix, removeMessageEventFix } =
        useFixedMessageEvent();

      addMessageEventFix(parentWindow, childWindow);

      const complexData = {
        nested: {
          object: {
            with: ["arrays", "and", "strings"],
          },
        },
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      };

      const eventPromise = new Promise<MessageEvent>((resolve) => {
        parentWindow.addEventListener("message", (event: MessageEvent) => {
          resolve(event);
        });
      });

      const brokenEvent = new MessageEvent("message", {
        data: complexData,
        origin: "",
        source: null,
      });

      parentWindow.dispatchEvent(brokenEvent);

      const event = await eventPromise;
      expect(event.data).toEqual(complexData);
      removeMessageEventFix(parentWindow);
    });
  });

  describe("Isolation between useFixedMessageEvent instances", () => {
    it("should maintain separate callback maps for different instances", () => {
      const instance1 = useFixedMessageEvent();
      const instance2 = useFixedMessageEvent();

      const dom2 = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "http://localhost",
      });
      const window2 = dom2.window as unknown as Window;

      // Add fix using instance1
      instance1.addMessageEventFix(parentWindow, childWindow);

      // Try to remove using instance2 (should not work - different callback map)
      instance2.removeMessageEventFix(parentWindow);

      // Listener should still be active
      const spy = vi.fn();
      parentWindow.addEventListener("message", spy);

      parentWindow.dispatchEvent(
        new MessageEvent("message", {
          data: "test",
          origin: "",
          source: null,
        }),
      );

      expect(spy).toHaveBeenCalled();

      // Clean up with correct instance
      instance1.removeMessageEventFix(parentWindow);
    });
  });
});
