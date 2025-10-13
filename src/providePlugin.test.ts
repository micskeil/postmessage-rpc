import { providePlugin } from "./providePlugin.ts";
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
	const { addMessageEventFix, removeMessageEventFix } = useFixedMessageEvent();

	// Track all created sockets for cleanup
	const createdSockets = new Set<PostMessageSocket>();

	beforeAll(() => {});

	afterAll(() => {});

	beforeEach(() => {
		vi.useFakeTimers();

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
		// Clear all pending timers BEFORE cleanup
		vi.clearAllTimers();

		// Clean up all sockets FIRST
		createdSockets.forEach((socket) => {
			try {
				socket.terminate();
			} catch (e) {
				// Ignore errors during cleanup
			}
		});
		createdSockets.clear();

		// Remove event fixes BEFORE removing iframe
		if (pluginIframe.contentWindow) {
			removeMessageEventFix(pluginIframe.contentWindow);
		}
		removeMessageEventFix(window);

		// Now remove iframe from DOM
		if (pluginIframe.parentNode) {
			body.removeChild(pluginIframe);
		}

		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it("should send domReady message to parent window", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

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

		await vi.advanceTimersByTimeAsync(10);

		expect(domReadyCb).toHaveBeenCalled();
	});

	it("should register methods as message channels", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const testMethod = vi.fn().mockReturnValue("method result");

		// Create parent socket FIRST to listen for domReady
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		// Create init channel ONCE with callback that returns method list
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

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callback channels FIRST (before sending init)
		const errorCallback = vi.fn();
		parentSocket.createMessageChannel("error", errorCallback);

		// Send init message to complete handshake
		const initPromise = initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: ["error"], // Array of callback names!
		});

		await vi.advanceTimersByTimeAsync(100);

		const methodList = await initPromise;
		const plugin = await pluginPromise;

		// Now call the method from parent
		const testChannel = parentSocket.createMessageChannel("testMethod", () => {});
		const resultPromise = testChannel.sendAndWait("test payload");
		await vi.advanceTimersByTimeAsync(10);

		await expect(resultPromise).resolves.toBe("method result");
		expect(testMethod).toHaveBeenCalledWith("test payload");
	});

	it("should automatically add error hook if not provided", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return ["testMethod"];
		});

		const pluginPromise = providePlugin(
			{
				parentCallbacks: ["onSave"],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks
		const onSaveCallback = vi.fn();
		const errorCallback = vi.fn();
		parentSocket.createMessageChannel("onSave", onSaveCallback);
		parentSocket.createMessageChannel("error", errorCallback);

		const initPromise = initChannel.sendAndWait({
			data: { test: "data" },
			settings: { test: "setting" },
			parentCallbacks: ["onSave", "error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;

		const plugin = await pluginPromise;

		expect(plugin.parentCallbacks).toHaveProperty("onSave");
		expect(plugin.parentCallbacks).toHaveProperty("error");
	});

	it("should resolve with data, settings, parentCallbacks, and terminate", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		const onSaveHook = vi.fn();
		const onCloseHook = vi.fn();

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return ["testMethod"];
		});

		const pluginPromise = providePlugin(
			{
				parentCallbacks: ["onSave", "onClose"],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks
		parentSocket.createMessageChannel("onSave", onSaveHook);
		parentSocket.createMessageChannel("onClose", onCloseHook);
		parentSocket.createMessageChannel("error", vi.fn());

		const initPromise = initChannel.sendAndWait({
			data: { userId: 123 },
			settings: { theme: "dark" },
			parentCallbacks: ["onSave", "onClose", "error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;

		const plugin = await pluginPromise;

		expect(plugin).toHaveProperty("data");
		expect(plugin).toHaveProperty("settings");
		expect(plugin).toHaveProperty("parentCallbacks");
		expect(plugin).toHaveProperty("terminate");

		expect(plugin.data).toEqual({ userId: 123 });
		expect(plugin.settings).toEqual({ theme: "dark" });
		expect(typeof plugin.terminate).toBe("function");
	});

	it("should call validator if provided and resolve on success", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const validator = vi.fn();

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
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

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks
		parentSocket.createMessageChannel("error", vi.fn());

		const initPromise = initChannel.sendAndWait({
			data: { required: "value" },
			settings: {},
			parentCallbacks: ["error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;

		await pluginPromise;

		expect(validator).toHaveBeenCalledWith({
			data: { required: "value" },
			settings: {},
		});
	});

	it("should reject if validator throws an error", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		const validationError = new Error("Missing required data");
		const validator = vi.fn().mockImplementation(() => {
			throw validationError;
		});

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
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

		// Attach a catch handler to prevent unhandled rejection warning
		// The test will still verify the rejection below
		pluginPromise.catch(() => {});

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks
		parentSocket.createMessageChannel("error", vi.fn());

		const initPromise = initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: ["error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;

		await expect(pluginPromise).rejects.toThrow("Missing required data");
		expect(console.error).toHaveBeenCalledWith(
			"Plugin validation failed:",
			validationError,
		);
	});

	it("should create hook functions that call parent hooks", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		// Create parent socket FIRST to listen for domReady
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

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

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks - Note: error hook already registered above
		// parentSocket.createMessageChannel("error", vi.fn()); // Already registered

		// Send init message to complete handshake
		const initPromise = initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: ["onSave", "error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;
		const plugin = await pluginPromise;

		// Call the hook from plugin side
		const saveResult = plugin.parentCallbacks.onSave({ content: "test content" });
		await vi.advanceTimersByTimeAsync(10);

		await expect(saveResult).resolves.toBe("saved successfully");
		expect(onSaveHook).toHaveBeenCalledWith({ content: "test content" });
	});

	it("should have a working terminate method", async () => {
		const parentWindow = window;
		const pluginWindow = pluginIframe.contentWindow as Window;

		addMessageEventFix(parentWindow, pluginWindow);
		addMessageEventFix(pluginWindow, parentWindow);

		// Send init message from parent
		const parentSocket = new PostMessageSocket(parentWindow, pluginWindow);
		createdSockets.add(parentSocket);

		parentSocket.createMessageChannel("domReady", () => {});

		const initChannel = parentSocket.createMessageChannel("init", () => {
			return [];
		});

		const pluginPromise = providePlugin(
			{
				parentCallbacks: [],
				methods: {},
			},
			pluginWindow,
			parentWindow,
		);

		// Advance timers to allow plugin to set up channels
		await vi.advanceTimersByTimeAsync(10);

		// Register parent callbacks
		parentSocket.createMessageChannel("error", vi.fn());

		const initPromise = initChannel.sendAndWait({
			data: {},
			settings: {},
			parentCallbacks: ["error"], // Array of names!
		});

		await vi.advanceTimersByTimeAsync(100);

		await initPromise;

		const plugin = await pluginPromise;

		expect(typeof plugin.terminate).toBe("function");

		// Terminate should not throw
		expect(() => plugin.terminate()).not.toThrow();
	});
});
