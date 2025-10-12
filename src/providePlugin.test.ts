import providePlugin from "./providePlugin";
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

import { useFixedMessageEvent } from "../test/utils/fixEvents";

// Not using the real console.error to avoid cluttering the test output
console.error = vi.fn();

const createMessageSockets = (window: Window, iframe: Window) => {
	const { addMessageEventFix, removeMessageEventFix } = useFixedMessageEvent();
	const windowSocket = new PostMessageSocket(window, iframe);
	const iframeSocket = new PostMessageSocket(iframe, window);
	addMessageEventFix(window, iframe);
	addMessageEventFix(iframe, window);
	return { windowSocket, iframeSocket, removeMessageEventFix };
};

describe("providePlugin", () => {
	let pluginIframe: HTMLIFrameElement;
	const body: HTMLElement = document.querySelector("body")!;

	beforeAll(() => {
		vi.useFakeTimers({
			// Allow postMessage and other DOM APIs to run normally
			toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
		});
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		pluginIframe = document.createElement("iframe");
		pluginIframe.src = "";
		pluginIframe.allowFullscreen = true;
		body.appendChild(pluginIframe);

		// Mock postMessage to make it work in jsdom
		const pluginWindow = pluginIframe.contentWindow as Window;

		// Mock iframe.contentWindow.postMessage to dispatch on iframe
		const originalIframePost = pluginWindow.postMessage.bind(pluginWindow);
		pluginWindow.postMessage = function (message: any, targetOrigin: string) {
			const event = new MessageEvent("message", {
				data: message,
				origin: window.location.origin || "http://localhost",
				source: window,
			});
			pluginWindow.dispatchEvent(event);
		};

		// Mock window.postMessage to dispatch on window
		const originalWindowPost = window.postMessage.bind(window);
		window.postMessage = function (message: any, targetOrigin: string) {
			const event = new MessageEvent("message", {
				data: message,
				origin: pluginWindow.location.origin || "http://localhost",
				source: pluginWindow,
			});
			window.dispatchEvent(event);
		};
	});

	afterEach(() => {
		body.removeChild(pluginIframe);
		vi.clearAllMocks();
	});

	it("should send domReady message to parent window", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		const domReadyCb = vi.fn();
		parentSocket.createMessageChannel("domReady", domReadyCb);

		// Start providePlugin in the plugin window
		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		expect(domReadyCb).toHaveBeenCalled();

		// Clean up
		parentSocket.terminate();
	});

	it("should register methods as message channels", async () => {
		console.log("TEST START: register methods");
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const testMethod = vi.fn().mockReturnValue("method result");

		// Create parent socket FIRST to listen for domReady
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return ["testMethod"]; // Tell plugin which methods are available
		});

		// Start providePlugin in the plugin window
		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {
					testMethod,
				},
			},
			pluginWindow,
			parentWindow,
		);

		// Send init message to complete handshake
		initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: { error: vi.fn() },
		});

		vi.runAllTimers();
		await pluginPromise;

		// Now call the method from parent
		const testChannel = parentSocket.createMessageChannel("testMethod", () => {});
		const resultPromise = testChannel.sendAndWait("test payload");
		vi.runAllTimers();

		await expect(resultPromise).resolves.toBe("method result");
		expect(testMethod).toHaveBeenCalledWith("test payload");

		// Clean up
		parentSocket.terminate();
	});

	it("should automatically add error hook if not provided", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const pluginPromise = providePlugin(
			{
				parentCallbacks: ["onSave"],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		const handshakeCompleteCb = vi.fn();
		parentSocket.createMessageChannel("handshakeComplete", handshakeCompleteCb);
		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return ["testMethod"];
		});

		const initPromise = initChannel.sendAndWait({
			data: { test: "data" },
			settings: { test: "setting" },
			parentCallbacks: { onSave: vi.fn(), error: vi.fn() },
		});

		vi.runAllTimers();

		const plugin = await pluginPromise;

		expect(plugin.parentCallbacks).toHaveProperty("onSave");
		expect(plugin.parentCallbacks).toHaveProperty("error");

		// Clean up
		parentSocket.terminate();
	});

	it("should resolve with data, settings, parentCallbacks, and terminate", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const pluginPromise = providePlugin(
			{
				parentCallbacks: ["onSave", "onClose"],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("handshakeComplete", () => {});
		parentSocket.createMessageChannel("domReady", () => {});

		const onSaveHook = vi.fn();
		const onCloseHook = vi.fn();

		parentSocket.createMessageChannel("init", () => {
			return ["testMethod"];
		});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return ["testMethod"];
		});

		initChannel.sendAndWait({
			data: { userId: 123 },
			settings: { theme: "dark" },
			parentCallbacks: { onSave: onSaveHook, onClose: onCloseHook, error: vi.fn() },
		});

		vi.runAllTimers();

		const plugin = await pluginPromise;

		expect(plugin).toHaveProperty("data");
		expect(plugin).toHaveProperty("settings");
		expect(plugin).toHaveProperty("parentCallbacks");
		expect(plugin).toHaveProperty("terminate");

		expect(plugin.data).toEqual({ userId: 123 });
		expect(plugin.settings).toEqual({ theme: "dark" });
		expect(typeof plugin.terminate).toBe("function");

		// Clean up
		parentSocket.terminate();
	});

	it("should call validator if provided and resolve on success", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const validator = vi.fn();

		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {},
				validator,
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("handshakeComplete", () => {});
		parentSocket.createMessageChannel("domReady", () => {});

		parentSocket.createMessageChannel("init", () => {
			return [];
		});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
		});

		initChannel.sendAndWait({
			data: { required: "value" },
			settings: {},
			parentCallbacks: { error: vi.fn() },
		});

		vi.runAllTimers();

		await pluginPromise;

		expect(validator).toHaveBeenCalledWith({
			data: { required: "value" },
			settings: {},
		});

		// Clean up
		parentSocket.terminate();
	});

	it("should reject if validator throws an error", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const validationError = new Error("Missing required data");
		const validator = vi.fn().mockImplementation(() => {
			throw validationError;
		});

		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {},
				validator,
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("handshakeComplete", () => {});
		parentSocket.createMessageChannel("domReady", () => {});

		parentSocket.createMessageChannel("init", () => {
			return [];
		});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
		});

		initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: { error: vi.fn() },
		});

		vi.runAllTimers();

		await expect(pluginPromise).rejects.toThrow("Missing required data");
		expect(console.error).toHaveBeenCalledWith(
			"Plugin validation failed:",
			validationError,
		);

		// Clean up
		parentSocket.terminate();
	});

	it("should create hook functions that call parent hooks", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		// Create parent socket FIRST to listen for domReady
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("domReady", () => {});

		const onSaveHook = vi.fn().mockReturnValue("saved successfully");
		parentSocket.createMessageChannel("onSave", onSaveHook);
		parentSocket.createMessageChannel("error", vi.fn());

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
		});

		// Start providePlugin in the plugin window
		const pluginPromise = providePlugin(
			{
				parentCallbacks: ["onSave"],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		// Send init message to complete handshake
		initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: { onSave: onSaveHook, error: vi.fn() },
		});

		vi.runAllTimers();
		const plugin = await pluginPromise;

		// Call the hook from plugin side
		const saveResult = plugin.parentCallbacks.onSave({ content: "test content" });
		vi.runAllTimers();

		await expect(saveResult).resolves.toBe("saved successfully");
		expect(onSaveHook).toHaveBeenCalledWith({ content: "test content" });

		// Clean up
		parentSocket.terminate();
	});

	it("should have a working terminate method", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		const { addMessageEventFix } = useFixedMessageEvent();
		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		vi.runAllTimers();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		parentSocket.createMessageChannel("handshakeComplete", () => {});
		parentSocket.createMessageChannel("domReady", () => {});

		parentSocket.createMessageChannel("init", () => {
			return [];
		});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
		});

		initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: { error: vi.fn() },
		});

		vi.runAllTimers();

		const plugin = await pluginPromise;

		expect(typeof plugin.terminate).toBe("function");

		// Terminate should not throw
		expect(() => plugin.terminate()).not.toThrow();

		// Clean up
		parentSocket.terminate();
	});
});
