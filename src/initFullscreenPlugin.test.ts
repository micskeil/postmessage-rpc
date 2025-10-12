import initFullscreenPlugin from "./initFullscreenPlugin";
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

// Helper to simulate plugin initialization
const simulatePluginResponse = (iframe: HTMLIFrameElement) => {
	const { addMessageEventFix } = useFixedMessageEvent();
	if (iframe?.contentWindow) {
		addMessageEventFix(window, iframe.contentWindow);
		addMessageEventFix(iframe.contentWindow, window);

		const pluginSocket = new PostMessageSocket(iframe.contentWindow, window);
		pluginSocket.createMessageChannel("handshakeComplete", () => {});
		pluginSocket.createMessageChannel("init", () => []);

		const domReadyChannel = pluginSocket.createMessageChannel("domReady", () => {});
		domReadyChannel.send({});

		return pluginSocket;
	}
	return null;
};

describe("initFullscreenPlugin", () => {
	const body: HTMLElement = document.querySelector("body")!;

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		// Reset the mock before each test
		(global as any).initUpdateHooks = vi.fn(() => {
			return vi.fn((payload) => {
				return payload?.hooks ? Object.keys(payload.hooks) : [];
			});
		});
	});

	afterEach(() => {
		// Clean up any leftover containers
		const containers = document.querySelectorAll('[id^="test-plugin-"]');
		containers.forEach((container) => container.remove());
		vi.clearAllMocks();
	});

	it("should create a fullscreen container with correct styles", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-1",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-1");
		expect(container).not.toBeNull();
		expect(container?.style.position).toBe("fixed");
		expect(container?.style.display).toBe("flex");
		expect(container?.style.width).toBe("100%");
		expect(container?.style.height).toBe("100%");
		expect(container?.style.top).toBe("0px");
		expect(container?.style.left).toBe("0px");

		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();
			const plugin = await pluginPromise;
			socket?.terminate();
		}
	});

	it("should start hidden with default animation position", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-2",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-2");
		expect(container?.style.transform).toBe("translate3d(-100vw, 0px, 0px) scale(1)");
		expect(container?.style.opacity).toBe("0");

		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();
			await pluginPromise;
			socket?.terminate();
		}
	});

	it("should return methods, show, hide, destroy, and splash screen methods", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-3",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-3");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			expect(plugin).toHaveProperty("methods");
			expect(plugin).toHaveProperty("show");
			expect(plugin).toHaveProperty("hide");
			expect(plugin).toHaveProperty("destroy");
			expect(plugin).toHaveProperty("showSplashScreen");
			expect(plugin).toHaveProperty("hideSplashScreen");
			expect(plugin).toHaveProperty("_container");
			expect(plugin).toHaveProperty("_src");

			expect(typeof plugin.show).toBe("function");
			expect(typeof plugin.hide).toBe("function");
			expect(typeof plugin.destroy).toBe("function");

			socket?.terminate();
		}
	});

	it("should show the plugin with animation", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-4",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-4");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Initially hidden
			expect(container?.style.opacity).toBe("0");

			// Show the plugin
			plugin.show();

			// Run animation frames
			vi.runAllTimers();

			// should update display
			expect(container?.style.display).toBe("block");

			socket?.terminate();
		}
	});

	it("should not show if already visible", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-5",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-5");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show once
			plugin.show();
			vi.runAllTimers();

			const firstDisplay = container?.style.display;

			// Try to show again - should return early
			const result = plugin.show();
			vi.runAllTimers();

			expect(result).toBeUndefined();
			expect(container?.style.display).toBe(firstDisplay);

			socket?.terminate();
		}
	});

	it("should hide the plugin with animation", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-6",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-6");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show first
			plugin.show();
			vi.runAllTimers();

			// Then hide
			plugin.hide();
			vi.runAllTimers();

			// should have hidden styles
			expect(container?.style.transform).toBe("translate3d(-100vw, 0px, 0px) scale(1)");

			socket?.terminate();
		}
	});

	it("should not hide if already hidden", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-7",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-7");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Plugin starts hidden
			const result = plugin.hide();

			expect(result).toBeUndefined();

			socket?.terminate();
		}
	});

	it("should accept custom animation parameters for show", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-8",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-8");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show with custom params
			plugin.show({ x: "100vw", y: "100vh", opacity: 0.3, scale: 0.5, time: 1000 });

			vi.runAllTimers();

			// should update with custom values
			expect(container?.style.display).toBe("block");

			socket?.terminate();
		}
	});

	it("should throw error if animation time is not a number", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-9",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-9");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Try to show with invalid time
			expect(() => {
				plugin.show({ time: "invalid" as any });
			}).toThrow("Animation time must be a number!");

			socket?.terminate();
		}
	});

	it("should destroy the plugin and remove container", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-10",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-10");
		expect(container).not.toBeNull();

		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Destroy the plugin
			await plugin.destroy();
			vi.runAllTimers();

			// Container should be removed
			expect(document.getElementById("test-plugin-10")).toBeNull();

			socket?.terminate();
		}
	});

	it("should increment zIndex on each show", async () => {
		const plugin1Promise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-11a",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		const plugin2Promise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-11b",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container1 = document.getElementById("test-plugin-11a");
		const container2 = document.getElementById("test-plugin-11b");

		const iframe1 = container1?.querySelector("iframe");
		const iframe2 = container2?.querySelector("iframe");

		if (iframe1?.contentWindow && iframe2?.contentWindow) {
			const socket1 = simulatePluginResponse(iframe1);
			const socket2 = simulatePluginResponse(iframe2);
			vi.runAllTimers();

			const plugin1 = await plugin1Promise;
			const plugin2 = await plugin2Promise;

			const initialZ1 = parseInt(container1?.style.zIndex || "0");
			const initialZ2 = parseInt(container2?.style.zIndex || "0");

			// Show both
			plugin1.show();
			vi.runAllTimers();

			const z1AfterShow = parseInt(container1?.style.zIndex || "0");

			plugin2.show();
			vi.runAllTimers();

			const z2AfterShow = parseInt(container2?.style.zIndex || "0");

			// z-index should be incremented
			expect(z2AfterShow).toBeGreaterThan(z1AfterShow);

			socket1?.terminate();
			socket2?.terminate();
		}
	});

	it("should create splash screen if splashScreenUrl is provided", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: { splashScreenUrl: "https://example.com/splash.html" },
				parentCallbacks: {},
			},
			{
				id: "test-plugin-12",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-12");
		const iframe = container?.querySelector("iframe");

		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show splash screen
			const splashPromise = plugin.showSplashScreen();

			vi.runAllTimers();

			// Check if splash iframe was created
			const splashIframes = container?.querySelectorAll("iframe");
			// should have main iframe + splash iframe
			expect(splashIframes?.length).toBeGreaterThan(1);

			socket?.terminate();
		}
	});

	it("should not create splash screen if splashScreenUrl is not provided", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-13",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-13");
		const iframe = container?.querySelector("iframe");

		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show splash screen (should return undefined)
			const result = plugin.showSplashScreen();

			expect(result).toBeUndefined();

			socket?.terminate();
		}
	});

	it("should hide splash screen", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: { splashScreenUrl: "https://example.com/splash.html" },
				parentCallbacks: {},
			},
			{
				id: "test-plugin-14",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-14");
		const iframe = container?.querySelector("iframe");

		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show splash screen
			plugin.showSplashScreen();
			vi.runAllTimers();

			// Hide splash screen
			plugin.hideSplashScreen();

			// should set opacity to 0
			const splashIframes = container?.querySelectorAll("iframe");
			if (splashIframes && splashIframes.length > 1) {
				const splashIframe = splashIframes[1];
				expect(splashIframe.style.opacity).toBe("0");
			}

			socket?.terminate();
		}
	});

	it("should not throw if hideSplashScreen called without splash screen", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-15",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-15");
		const iframe = container?.querySelector("iframe");

		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// should not throw
			expect(() => plugin.hideSplashScreen()).not.toThrow();

			socket?.terminate();
		}
	});

	it("should use parentElem or default to body", async () => {
		const customParent = document.createElement("div");
		customParent.id = "custom-parent";
		body.appendChild(customParent);

		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-16",
				src: "https://example.com/plugin.html",
				parentElem: customParent,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-16");
		expect(container?.parentElement).toBe(customParent);

		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();
			await pluginPromise;
			socket?.terminate();
		}

		customParent.remove();
	});

	it("should call beforeInit if provided", async () => {
		const beforeInit = vi.fn();

		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-17",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit,
				timeout: null,
			},
		);

		vi.runAllTimers();

		expect(beforeInit).toHaveBeenCalled();

		const container = document.getElementById("test-plugin-17");
		const iframe = container?.querySelector("iframe");
		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();
			await pluginPromise;
			socket?.terminate();
		}
	});

	it("should set display to none on hide if opacity is 0", async () => {
		const pluginPromise = initFullscreenPlugin(
			{
				data: {},
				settings: {},
				parentCallbacks: {},
			},
			{
				id: "test-plugin-18",
				src: "https://example.com/plugin.html",
				parentElem: body,
				beforeInit: null,
				timeout: null,
			},
		);

		vi.runAllTimers();

		const container = document.getElementById("test-plugin-18");
		const iframe = container?.querySelector("iframe");

		if (iframe?.contentWindow) {
			const socket = simulatePluginResponse(iframe);
			vi.runAllTimers();

			const plugin = await pluginPromise;

			// Show first
			plugin.show({ opacity: 0 });
			vi.runAllTimers();

			// Then hide
			plugin.hide();
			vi.runAllTimers();

			// should set display to none since hiddenOpacity is 0
			expect(container?.style.display).toBe("none");

			socket?.terminate();
		}
	});
});
