import initInlinePlugin from "./initInlinePlugin";
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

describe("initInlinePlugin", () => {
	let container: HTMLDivElement;
	const body: HTMLElement = document.querySelector("body")!;
	const { addMessageEventFix, removeMessageEventFix } = useFixedMessageEvent();

	// Track all created iframes and sockets for cleanup
	const createdIframes = new Set<HTMLIFrameElement>();
	const createdSockets = new Set<PostMessageSocket>();

	/**
	 * Helper to apply event fixes and postMessage mocks for iframe communication
	 */
	function applyEventFixes(iframe: HTMLIFrameElement) {
		// Apply event fixes in both directions
		addMessageEventFix(window, iframe.contentWindow as Window);
		addMessageEventFix(iframe.contentWindow as Window, window);
	}

	/**
	 * Helper function to simulate a plugin responding to initialization.
	 * This sets up the necessary message channels on the plugin side.
	 * Event fixes should be applied before calling this function.
	 */
	function setupPluginResponse(
		pluginWindow: Window,
		parentWindow: Window,
		options: {
			methods?: string[];
			methodImplementations?: Record<string, (payload: unknown) => unknown>;
			onInit?: (payload: unknown) => void;
		} = {},
	) {
		const pluginSocket = new PostMessageSocket(pluginWindow, parentWindow);
		createdSockets.add(pluginSocket);

		// Set up domReady channel
		const domReadyChannel = pluginSocket.createMessageChannel(
			"domReady",
			() => {},
		);

		// Set up handshakeComplete listener
		pluginSocket.createMessageChannel("handshakeComplete", () => {}, {
			once: true,
		});

		// Set up init listener
		pluginSocket.createMessageChannel("init", (payload) => {
			if (options.onInit) {
				options.onInit(payload);
			}
			return options.methods || [];
		});

		// Set up method implementations
		if (options.methodImplementations) {
			Object.entries(options.methodImplementations).forEach(([name, impl]) => {
				pluginSocket.createMessageChannel(name, impl);
			});
		}

		return {
			pluginSocket,
			sendDomReady: () => {
				domReadyChannel?.send({});
			},
		};
	}

	beforeAll(() => {});

	afterAll(() => {});

	beforeEach(() => {
		vi.useFakeTimers();
		container = document.createElement("div");
		container.id = "inline-plugin-container";
		body.appendChild(container);
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

		// IMPORTANT: Remove event fixes BEFORE removing iframes
		// This ensures the contentWindow is still accessible
		createdIframes.forEach((iframe) => {
			if (iframe.contentWindow) {
				removeMessageEventFix(iframe.contentWindow);
			}
		});

		// Also remove the window fix so next test can add a fresh one
		removeMessageEventFix(window);

		// Now remove iframes from DOM
		createdIframes.forEach((iframe) => {
			if (iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
		});
		createdIframes.clear();

		if (body.contains(container)) {
			body.removeChild(container);
		}

		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it("should create an iframe inside the container", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: { test: "data" },
				settings: { test: "setting" },
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		expect(iframe).not.toBeNull();
		expect(iframe.src).toBe("https://example.com/plugin.html");

		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{ methods: ["method1"] },
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(plugin).toHaveProperty("methods");
		expect(plugin).toHaveProperty("destroy");
		expect(plugin).toHaveProperty("_container");

		plugin.destroy();
	});

	it("should return methods from the plugin", async () => {
		const testMethodCb = vi.fn().mockReturnValue("test result");

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{
				methods: ["testMethod"],
				methodImplementations: {
					testMethod: testMethodCb,
				},
			},
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(plugin.methods).toHaveProperty("testMethod");

		const resultPromise = plugin.methods.testMethod("test payload");
		await vi.advanceTimersByTimeAsync(10);

		const result = await resultPromise;
		expect(result).toBe("test result");
		expect(testMethodCb).toHaveBeenCalledWith("test payload");

		plugin.destroy();
	});

	it("should provide a destroy method that removes iframe", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{ methods: [] },
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(typeof plugin.destroy).toBe("function");
		expect(container.children.length).toBeGreaterThan(0);

		// Call destroy
		plugin.destroy();

		// Container should be empty
		expect(container.children.length).toBe(0);
		expect(container.querySelector("iframe")).toBeNull();
	});

	it("should remove all children from container on destroy", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;

		// Add additional children to test thorough cleanup
		const extraDiv = document.createElement("div");
		container.appendChild(extraDiv);

		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{ methods: [] },
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(container.children.length).toBe(2); // iframe + extraDiv

		// Call destroy
		plugin.destroy();

		// All children should be removed
		expect(container.children.length).toBe(0);
	});

	it("should call beforeInit if provided", async () => {
		const beforeInit = vi.fn();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit,
			},
		);

		expect(beforeInit).toHaveBeenCalled();
		const callArg = beforeInit.mock.calls[0][0];
		expect(callArg).toHaveProperty("container");
		expect(callArg).toHaveProperty("iframe");

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{ methods: [] },
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;
		plugin.destroy();
	});

	it("should expose _container property with the container reference", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{ methods: [] },
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(plugin._container).toBe(container);

		plugin.destroy();
	});

	it("should respect timeout setting", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				timeout: 1000,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		// Don't simulate plugin response - let it timeout
		vi.advanceTimersByTime(1000);

		await expect(pluginPromise).rejects.toThrow(
			"Plugin initialization failed with timeout!",
		);
	});

	it("should pass data and settings to plugin", async () => {
		const testData = { userId: 123, name: "Test User" };
		const testSettings = { theme: "dark", lang: "en" };

		const initCb = vi.fn();

		const pluginPromise = initInlinePlugin(
			{
				data: testData,
				settings: testSettings,
				parentCallbacks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
			},
		);

		const iframe = container.querySelector("iframe") as HTMLIFrameElement;
		createdIframes.add(iframe);
		applyEventFixes(iframe);

		const { sendDomReady } = setupPluginResponse(
			iframe.contentWindow as Window,
			window,
			{
				methods: [],
				onInit: initCb,
			},
		);

		sendDomReady();
		await vi.advanceTimersByTimeAsync(100);

		const plugin = await pluginPromise;

		expect(initCb).toHaveBeenCalledWith({
			data: testData,
			settings: testSettings,
			parentCallbacks: [],
		});

		plugin.destroy();
	});
});
