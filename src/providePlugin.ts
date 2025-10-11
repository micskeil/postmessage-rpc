import PostMessageSocket from "./postMessageSocket";

type Method = (payload: unknown) => Promise<unknown> | unknown | void;
interface Methods {
	[name: string]: Method;
}

interface Plugin {
	data: unknown;
	settings: unknown;
	hooks: Record<string, Method>;
	terminate: () => void;
}

/**
 * Provides a plugin to the target window using postMessage.
 */
export default function providePlugin(
	options?: {
		hooks?: string[];
		methods?: Methods;
		validator?: (args: { data?: unknown; settings?: unknown }) => void;
	},
	currentWindow: Window = window,
	targetWindow: Window = window.parent,
): Promise<Plugin> {
	// Create a new PostMessageSocket instance for the current window and target window
	const { hooks = [], methods = {}, validator } = options || {};
	const messageSocket = new PostMessageSocket(currentWindow, targetWindow);

	if (!hooks.includes("error")) {
		hooks.push("error");
	}

	// Create a messageChannel for each method to allow communication
	Object.entries(methods).forEach(([name, cb]) => {
		messageSocket.createMessageChannel(name, cb);
	});

	return new Promise((resolve, reject) => {
		async function onInit(options?: {
			data: unknown;
			settings: unknown;
			hooks: Record<string, Method>;
		}) {
			const { data, settings, hooks = {} } = options || {};

			//  Initialize the hooks with the provided functions
			const hookFunctions = Object.entries(hooks).reduce(
				(acc: Record<string, Method>, [hook, cb]) => {
					const messageChannel = messageSocket.createMessageChannel(
						hook,
						cb,
					);
					acc[hook] = messageChannel.sendAndWait;
					return acc;
				},
				{},
			);

			try {
				if (validator) {
					validator({ data, settings });
				}

				const terminate = () => {
					messageSocket.terminate();
				};

				resolve({
					data,
					settings,
					hooks: hookFunctions,
					terminate,
				});
			} catch (error: unknown) {
				console.error("Plugin validation failed:", error);
				// If the validator throws an error, we reject the promise
				reject(error);
				messageSocket.terminate();
			}
		}
		messageSocket.createMessageChannel("init", onInit, { once: true });
		readyChannel.sendAndWait({});
	});
}
