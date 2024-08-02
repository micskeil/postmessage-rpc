import PostMessageSocket from "./postMessageSocket";
import {
	describe,
	expect,
	it,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
	vi,
} from "vitest";
import { useFixedMessageEvent } from "../test/utils/fixEvents";

const createMessageSockets = (window: Window, iframe: Window) => {
	const { addMessageEventFix } = useFixedMessageEvent();
	const windowSocket = new PostMessageSocket(window, iframe);
	const iframeSocket = new PostMessageSocket(iframe, window);
	addMessageEventFix(window, iframe);
	addMessageEventFix(iframe, window);
	return { windowSocket, iframeSocket };
};

describe("set up postMessageSocket environments", () => {
	let pluginIframe: HTMLIFrameElement;
	let pluginIframe2: HTMLIFrameElement;
	let body: HTMLElement = document.querySelector("body")!;

	beforeAll(() => {
		// vi.useFakeTimers();
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
		vi.clearAllMocks();
	});

	afterAll(() => {});

	// The difference betwen Message and Request is that the Request expects a response from the other window object
	it("should verify windowSocket and iframeSocket can send and receive MESSAGES", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			window,
			pluginIframe.contentWindow as Window,
		);
		const cb = vi.fn();
		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		await iframeSocket.sendMessage("test-window", "hello world");
		await windowSocket.sendMessage("test-iframe", "hello world");

		windowSocket.terminate();
		expect(cb).toHaveBeenNthCalledWith(2, "hello world");
	});

	it("should verify windowSocket and iframeSocket can send and receive REQUEST", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			pluginIframe.contentWindow as Window,
			pluginIframe2.contentWindow as Window,
		);

		const cb = vi.fn().mockReturnValue("hello from the other side");
		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		const responseFromWindow = await iframeSocket.sendMessage(
			"test-window",
			"hello world",
			true,
		);
		const responseFromIframe = await windowSocket.sendMessage(
			"test-iframe",
			"hello world",
			true,
		);

		windowSocket.terminate();
		expect(cb).toHaveBeenNthCalledWith(2, "hello world");
		expect(responseFromWindow).toBe("hello from the other side");
		expect(responseFromIframe).toBe("hello from the other side");
	});

	it("should send Success response to the partner window object when MESSAGE sent", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			pluginIframe.contentWindow as Window,
			pluginIframe2.contentWindow as Window,
		);

		const cb = vi.fn().mockReturnValue("hello from the other side");
		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		const responseFromWindow = await iframeSocket.sendMessage(
			"test-window",
			"hello world",
			// the last argument is to indicate if the message is a request or not
			false,
		);

		const responseFromIframe = await windowSocket.sendMessage(
			"test-iframe",
			"hello world",
			// the last argument is to indicate if the message is a request or not
			false,
		);

		windowSocket.terminate();
		expect(responseFromWindow).toBe("Success");
		expect(responseFromIframe).toBe("Success");
	});

	it("should return error if no custom event listener is found", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			pluginIframe.contentWindow as Window,
			pluginIframe2.contentWindow as Window,
		);

		const cb = vi.fn().mockReturnValue("hello from the other side");
		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		await expect(
			iframeSocket.sendMessage(
				"test-window-error",
				"hello world",
				// the last argument is to indicate if the message is a request or not
				false,
			),
		).rejects.toThrowError(
			"No listener found for the message type: test-window-error",
		);

		windowSocket.terminate();
	});

	it("should remove listener if the listener is a once listener", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			pluginIframe.contentWindow as Window,
			pluginIframe2.contentWindow as Window,
		);

		const cb = vi.fn().mockReturnValue("hello from the other side");
		windowSocket.addListener("test-window", cb, { once: true });
		iframeSocket.addListener("test-iframe", cb, { once: true });

		await iframeSocket.sendMessage("test-window", "hello world", false);
		await windowSocket.sendMessage("test-iframe", "hello world", false);

		windowSocket.terminate();
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it("should not do anything if the event source is not the target window", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			window,
			pluginIframe.contentWindow as Window,
		);

		const cb = vi.fn().mockReturnValue("hello from the other side");
		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		const event = new MessageEvent("message", {
			data: JSON.stringify({
				type: "message",
				event: "test-window",
				id: "1234",
				payload: "hello world",
			}),
			// a different window object
			source: { ...window },
		});

		window.dispatchEvent(event);

		windowSocket.terminate();
		expect(cb).not.toHaveBeenCalled();
	});

	it("should not do anything if the event origin is not the target window", async function () {
		const { windowSocket, iframeSocket } = createMessageSockets(
			window,
			pluginIframe.contentWindow as Window,
		);
		const cb = vi.fn().mockReturnValue("hello from the other side");

		windowSocket.addListener("test-window", cb);
		iframeSocket.addListener("test-iframe", cb);

		const event = new MessageEvent("message", {
			data: JSON.stringify({
				type: "message",
				event: "test-window",
				id: "1234",
				payload: "hello world",
			}),
			// a different window object
			origin: "http://other-example:3000",
		});

		window.dispatchEvent(event);

		windowSocket.terminate();
		expect(cb).not.toHaveBeenCalled();
	});
});
