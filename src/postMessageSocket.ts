type ListenerOptions = {
	once: boolean;
};

type CustomEventListener<T, U> = {
	callback: (payload: T) => U;
	options: ListenerOptions;
};

type Message = {
	type: "message";
	event: string;
	id: string;
	payload: unknown;
	waitForResponse: boolean;
};

type MessageResponse = {
	type: "response";
	event: string;
	id: string;
	payload?: unknown;
	error?: string;
};

type EventName = string;

/**
 * PostMessageSocket is a class that allows
 * for easy communication between two windowSocket
 * instances using the postMessage appliedEventListeners
 * @example
 * const windowSocket = new PostMessageSocket(window, iframe);
 * const iframeSocket = new PostMessageSocket(iframe, window);
 * windowSocket.addListener("EVENT_NAME", (payload) => console.log(payload));
 * iframeSocket.sendMessage("EVENT_NAME", "Hello World");
 * // Console will log "Hello World"
 */
export default class PostMessageSocket {
	private messageCounter = 0;
	private self: Window;
	private partner: Window;
	private customEventListeners: Map<
		EventName,
		CustomEventListener<any, any>
	> = new Map();

	private outStandingRequestListeners: Map<
		string,
		(r: MessageResponse) => void
	> = new Map();

	private onMessageFn = this.onMessage.bind(this);

	constructor(self: Window, partner: Window) {
		this.self = self;
		this.partner = partner;

		// Add a message handler to the windowSocket
		this.self.addEventListener("message", this.onMessageFn);
	}

	addListener<T, U>(
		eventName: string,
		callback: CustomEventListener<T, U>["callback"],
		options: { once: boolean } = { once: false },
	) {
		this.customEventListeners.set(eventName, { callback, options });
	}

	removeListener(eventName: string) {
		this.customEventListeners.delete(eventName);
	}

	sendMessage<T>(event: string, payload: T, waitForResponse = false) {
		const id = this.getNextMsgId();
		this.partner.postMessage(
			JSON.stringify({
				type: "message",
				event,
				payload,
				id,
				waitForResponse,
			}),
			"*",
		);
		// we need to wait for the response, even for a message waitforResponse = false
		// we need a "success" response to confirm that the message was sent
		return this.waitForResponse(id);
	}

	private waitForResponse(id: string) {
		return new Promise((resolve, reject) => {
			const listener = (response: MessageResponse) => {
				//  Find the listener that corresponds to the message id
				this.outStandingRequestListeners.delete(response.id);
				if ("error" in response) {
					reject(new Error(response.error));
				}
				resolve(response.payload);
			};
			this.outStandingRequestListeners.set(id, listener);
		});
	}

	private parseMessage(event: MessageEvent): Message | MessageResponse {
		return JSON.parse(event.data);
	}

	private onMessage(event: MessageEvent) {
		// If the event source is not the partner window, we don't want to do anything
		if (event.source !== this.partner) return;
		// If the event origin is not the partner window, we don't want to do anything
		if (event.origin !== this.partner.origin) return;
		event.stopImmediatePropagation();
		const message = this.parseMessage(event);
		if (message.type === "response") {
			return this.outStandingRequestListeners.get(message.id)?.(message);
		}
		return this.sendResponse(message);
	}

	async sendResponse(message: Message) {
		const listener = this.customEventListeners.get(message.event);
		const response: MessageResponse = {
			...message,
			type: "response",
		};

		if (!listener) {
			response.error = `No listener found for the message type: ${message.event}`;
			return this.partner.postMessage(JSON.stringify(response), "*");
		}

		// If the listener is a once listener, we want to remove it
		if (listener.options.once) {
			this.removeListener(message.event);
		}

		if (message.waitForResponse) {
			response.payload = await listener.callback(message.payload);
			return this.partner.postMessage(JSON.stringify(response), "*");
		} else {
			response.payload = "Success";
			this.partner.postMessage(JSON.stringify(response), "*");
		}
		await listener.callback(message.payload);
	}

	private getNextMsgId(): string {
		const id = `${this.messageCounter++}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
		return id;
	}

	// Remove the message event listener from the window when the socket is terminated
	terminate() {
		this.self.removeEventListener("message", this.onMessageFn);
	}
}
