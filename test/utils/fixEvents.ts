// workaround for https://github.com/jsdom/jsdom/issues/2745

export const useFixedMessageEvent = () => {
	const messageEventFixFunction = (self: Window, partner: Window) => {
		return (event: MessageEvent) => {
			// if no origin exists, replace it with the right targetWindow
			if (!event.origin || event.origin === "" || event.origin === null) {
				event.stopImmediatePropagation();
				const eventWithOrigin = new MessageEvent("message", {
					data: event.data,
					origin: partner.origin,
					source: partner,
				});
				// send the event to the window with the right origin
				self.dispatchEvent(eventWithOrigin);
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
