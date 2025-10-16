// workaround for https://github.com/jsdom/jsdom/issues/2745
export const useFixedMessageEvent = () => {
  // Store callbacks per window to properly clean up multiple event listeners
  const callbacks = new Map<Window, (event: MessageEvent) => void>();

  const messageEventFixFunction = (self: Window, partner: Window) => {
    return (event: MessageEvent) => {
      // if the event has no origin or source, it is likely from jsdom
      // if no source exists, replace it with partner
      // Use a default origin for jsdom since partner.origin might also be empty
      if (!event.origin || event.origin === "" || event.origin === "null") {
        event.stopImmediatePropagation();

        // Use a fixed origin to prevent infinite loops when partner.origin is also empty
        const fixedOrigin =
          partner.origin && partner.origin !== "" && partner.origin !== "null"
            ? partner.origin
            : "http://localhost";

        const fixedEvent = new MessageEvent("message", {
          data: event.data,
          source: partner,
          origin: fixedOrigin,
        });
        // send the event to the window with the right origin
        self.dispatchEvent(fixedEvent);
      }
    };
  };

  const addMessageEventFix = (self: Window, partner: Window) => {
    // Don't add if already exists
    if (callbacks.has(self)) {
      return;
    }

    const cb = messageEventFixFunction(self, partner);
    callbacks.set(self, cb);
    self.addEventListener("message", cb, true);
  };

  const removeMessageEventFix = (self: Window) => {
    const cb = callbacks.get(self);
    if (cb) {
      self.removeEventListener("message", cb, true);
      callbacks.delete(self);
    }
  };

  return { addMessageEventFix, removeMessageEventFix };
};
