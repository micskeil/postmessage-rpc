// workaround for https://github.com/jsdom/jsdom/issues/2745
export const useFixedMessageEvent = () => {
  const messageEventFixFunction = (self: Window, partner: Window) => {
    return (event: MessageEvent) => {
      // if no source exists, replace it with partner
      if (!event.origin || event.origin === "" || event.origin === "null") {
        event.stopImmediatePropagation();
        event = new MessageEvent("message", {
          data: event.data,
          source: partner,
          origin: partner.origin,
        });
        // send the event to the window with the right origin
        self.dispatchEvent(event);
      }
    };
  };

  let cb: (event: MessageEvent) => void;
  const addMessageEventFix = (self: Window, partner: Window) => {
    cb = messageEventFixFunction(self, partner);
    self.addEventListener("message", cb, true);
  };

  const removeMessageEventFix = (self: Window) => {
    self.removeEventListener("message", cb, true);
  };
  return { addMessageEventFix, removeMessageEventFix };
};
