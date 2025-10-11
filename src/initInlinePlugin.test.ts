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

// Mock initUpdateHooks since it's not implemented yet
(global as any).initUpdateHooks = vi.fn(() => {
	return vi.fn((payload) => {
		return payload?.hooks ? Object.keys(payload.hooks) : [];
	});
});

describe("initInlinePlugin", () => {
	let container: HTMLDivElement;
	const body: HTMLElement = document.querySelector("body")!;

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		container = document.createElement("div");
		container.id = "inline-plugin-container";
		body.appendChild(container);

		// Reset the mock before each test
		(global as any).initUpdateHooks = vi.fn(() => {
			return vi.fn((payload) => {
				return payload?.hooks ? Object.keys(payload.hooks) : [];
			});
		});
	});

	afterEach(() => {
		if (body.contains(container)) {
			body.removeChild(container);
		}
		vi.clearAllMocks();
	});

	it("should create an iframe inside the container", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const pluginPromise = initInlinePlugin(
			{
				data: { test: "data" },
				settings: { test: "setting" },
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");
		expect(iframe).not.toBeNull();
		expect(iframe?.src).toBe("https://example.com/plugin.html");

		// Simulate plugin responding
		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});
			pluginSocket.createMessageChannel("init", () => ["method1"]);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(plugin).toHaveProperty("methods");
			expect(plugin).toHaveProperty("destroy");
			expect(plugin).toHaveProperty("_container");

			pluginSocket.terminate();
		}
	});

	it("should return methods from the plugin", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");
		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});

			const testMethodCb = vi.fn().mockReturnValue("test result");
			pluginSocket.createMessageChannel("testMethod", testMethodCb);

			pluginSocket.createMessageChannel("init", () => ["testMethod"]);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(plugin.methods).toHaveProperty("testMethod");

			const resultPromise = plugin.methods.testMethod("test payload");
			vi.runAllTimers();

			const result = await resultPromise;
			expect(result).toBe("test result");
			expect(testMethodCb).toHaveBeenCalledWith("test payload");

			pluginSocket.terminate();
		}
	});

	it("should provide a destroy method that removes iframe", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");
		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});
			pluginSocket.createMessageChannel("init", () => []);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(typeof plugin.destroy).toBe("function");
			expect(container.children.length).toBeGreaterThan(0);

			// Call destroy
			plugin.destroy();

			// Container should be empty
			expect(container.children.length).toBe(0);
			expect(container.querySelector("iframe")).toBeNull();

			pluginSocket.terminate();
		}
	});

	it("should remove all children from container on destroy", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");

		// Add additional children to test thorough cleanup
		const extraDiv = document.createElement("div");
		container.appendChild(extraDiv);

		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});
			pluginSocket.createMessageChannel("init", () => []);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(container.children.length).toBe(2); // iframe + extraDiv

			// Call destroy
			plugin.destroy();

			// All children should be removed
			expect(container.children.length).toBe(0);

			pluginSocket.terminate();
		}
	});

	it("should call beforeInit if provided", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();
		const beforeInit = vi.fn();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit,
				timeout: null,
			},
		);

		vi.runAllTimers();

		expect(beforeInit).toHaveBeenCalled();
		const callArg = beforeInit.mock.calls[0][0];
		expect(callArg).toHaveProperty("container");
		expect(callArg).toHaveProperty("iframe");
	});

	it("should expose _container property with the container reference", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");
		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});
			pluginSocket.createMessageChannel("init", () => []);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(plugin._container).toBe(container);

			pluginSocket.terminate();
		}
	});

	it("should respect timeout setting", async () => {
		const pluginPromise = initInlinePlugin(
			{
				data: {},
				settings: {},
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: 1000,
			},
		);

		// Don't simulate plugin response - let it timeout
		vi.advanceTimersByTime(1000);

		await expect(pluginPromise).rejects.toThrow(
			"Plugin initialization failed with timeout!",
		);
	});

	it("should pass data and settings to plugin", async () => {
		const { addMessageEventFix } = useFixedMessageEvent();

		const testData = { userId: 123, name: "Test User" };
		const testSettings = { theme: "dark", lang: "en" };

		const pluginPromise = initInlinePlugin(
			{
				data: testData,
				settings: testSettings,
				hooks: {},
			},
			{
				src: "https://example.com/plugin.html",
				container,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const iframe = container.querySelector("iframe");
		if (iframe?.contentWindow) {
			addMessageEventFix(window, iframe.contentWindow);
			addMessageEventFix(iframe.contentWindow, window);

			const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
			pluginSocket.createMessageChannel("handshakeComplete", () => {});

			const initCb = vi.fn().mockReturnValue([]);
			pluginSocket.createMessageChannel("init", initCb);

			const domReadyChannel = pluginSocket.createMessageChannel(
				"domReady",
				() => {},
			);
			domReadyChannel.send({});

			vi.runAllTimers();

			await pluginPromise;

			expect(initCb).toHaveBeenCalledWith({
				data: testData,
				settings: testSettings,
				hooks: [],
			});

			pluginSocket.terminate();
		}
	});
});
