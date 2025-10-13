# PostMessage RPC

**A professional postMessage-based RPC library that creates and maintains secure communication between window objects**, like a web page and an iframe inside it.

This is a fork of the original Chamaileon plugin-interface, enhanced and maintained independently with TypeScript-first approach and modern tooling.

## Installation and Initialization

```bash
npm i @micskeil/postmessage-rpc
```

The package provides three functions: `initFullscreenPlugin`, `initInlinePlugin`, and `providePlugin`.

A plugin initialization consists of two parts:

- On the parent side, you call either `initFullscreenPlugin` or `initInlinePlugin`, based on the usage. The function creates an iframe and starts loading the plugin from the provided source URL.

- Inside the plugin iframe, you call the `providePlugin` function on load. This function responds to the parent side initialization and returns the interface.

## Fullscreen plugin

### Initialization
To initialize a fullscreen plugin, you have to call the `initFullscreenPlugin` function with the following parameters:

```js
initFullscreenPlugin(
	{
		data: unknown,
		settings: unknown,
		hooks: Record<string, Function>,
	},
	{
		id: string,
		src: string,
		parentElem?: HTMLElement,
		beforeInit?: Function,
		timeout?: number,
	}
);
```
**Parameters in the first object**

The parameters in the first object will be sent to the plugin directly.

- **data:** Initial data to pass to your plugin.
- **settings:** Configuration settings that modify the look and behavior of the plugin.
- **hooks:** Callback functions that the plugin can invoke to communicate back to the parent (e.g., `onSave`, `onClose`).

**Parameters in the second object**

The `initFullscreenPlugin` function creates an iframe based on the `src` provided and appends it to the `parentElem`. The second parameter object contains information for the library to create the iframe and append it to your application DOM.

- **id:** The unique identifier for the plugin container element.
- **src:** The iframe source URL as a string.
- **parentElem:** HTMLElement where the plugin iframe will be inserted. Default is `document.body`.
- **beforeInit:** Optional function that runs after the iframe is created. The container and iframe can be accessed inside this callback.

	```js
	beforeInit({ container, iframe }) {
		// your code here
	}
	```

- **timeout:** Number in milliseconds defining how long the init function should wait for a response from providePlugin before timing out.

### Interface
In the returned object you will get the following properties:
```js
{
	container: HTMLDivElement,
	src: string,
	methods: Record<string, Function>,
	showSplashScreen: Function,
	hideSplashScreen: Function,
	show: Function,
	hide: Function,
	destroy: Function,
}
```
- **container:** HTML element containing the plugin iframe
- **src:** The source URL of the plugin iframe
- **methods:** Object containing all the plugin's declared methods that can be called from the parent
- **destroy:** Function that removes the plugin iframe and cleans up resources
#### Splashscreen
If the `settings` param provided in the initialization object contains a `splashScreenUrl`, the plugin will have a separate iframe appended to the container, which you can show and hide with the provided `showSplashScreen` and `hideSplashScreen` functions.
#### Show / Hide
You can show and hide your created plugins with the provided `show` and `hide`. While using these functions, the plugin won`t be destroyed, it will keep its state while hidden.

**Animations**

The `show` can be called with the following parameters:

```js
show({ x = "-100vw", y = "0px", opacity = 0.5, scale = 1, time = 500 })
```
The `show` function provides an easy way to customize your show animation. With the provided parameters, you can set the default hidden state, described by coordinates, opacity, and scale of the plugin, along with the time of the animation. When the function is called, the plugin will move to a fullscreen view from that hidden position. The animation uses the `translate3d` css function. Likewise, the `hide` function moves the plugin back to its set hidden state.

The default hidden state is moved to the left, so the `show` function will move the plugin to view form the left. See the [content editor example](examples/content-editor-example.html) for more configuration.


##  Inline plugin
To initialize an inline plugin, call the `initInlinePlugin` function with the following parameters:

```js
initInlinePlugin(
	{
		data: unknown,
		settings: unknown,
		hooks: Record<string, Function>,
	},
	{
		src: string,
		container: HTMLElement,
		beforeInit?: Function,
		timeout?: number,
	}
)
```

**Parameters in the first object**

The parameters in the first object will be sent to the plugin directly.

- **data:** Initial data to pass to your plugin.
- **settings:** Configuration settings that modify the look and behavior of the plugin.
- **hooks:** Callback functions that the plugin can invoke to communicate back to the parent.

**Parameters in the second object**

The second object contains information for the library to create the iframe and append it to your application DOM.

- **src:** The iframe source URL as a string.
- **container:** The HTMLElement where you want the plugin iframe to be appended.
- **beforeInit:** Optional function that runs after the iframe is created. The container and iframe can be accessed inside this callback.

	```js
	beforeInit({ container, iframe }) {
		// your code here
	}
	```

- **timeout:** Number in milliseconds defining how long the init function should wait for a response from providePlugin before timing out.

### Interface
In the returned object you will get the following properties:
```js
{
	_container: HTMLElement,
	methods: Record<string, Function>,
	destroy: Function,
}
```
- **_container:** HTML element containing the plugin iframe
- **methods:** Object containing all the plugin's declared methods that can be called from the parent
- **destroy:** Function that removes all children from the container and cleans up resources

## providePlugin
When your plugin is loaded from the provided source URL, your script inside the iframe must call the `providePlugin` function to register with the parent and establish communication.

```js
providePlugin({
	hooks: Array<string>,
	methods: Record<string, Function>,
	validator?: Function,
});
```

- **hooks:** Array of hook names that the plugin accepts and can invoke (e.g., `['onSave', 'onClose', 'onError']`). Note: `'error'` hook is automatically added if not present.
- **methods:** Object containing functions that can be called from the parent to interact with the plugin.
- **validator:** Optional function that validates the received `data` and `settings`. Throws an error if validation fails.

### Interface
The providePlugin function returns a promise that resolves to an object containing:
```js
{
	data: unknown,
	settings: unknown,
	hooks: Record<string, Function>,
	terminate: Function,
}
```
- **data:** The initial data sent from the parent during initialization
- **settings:** The configuration settings sent from the parent
- **hooks:** Object containing the hook functions provided by the parent that match the accepted hook names
- **terminate:** Function to terminate communication and clean up resources

## Examples

The repository includes an interactive sticky notes demo demonstrating the plugin interface in action.

### Running the Examples

You can run the examples using the dev server:
```bash
$ npm install
$ npm run examples
```

Or manually with any static server:
```bash
$ npm run dev
```

Then open your browser to `http://localhost:8765/examples/`

### Sticky Notes Demo

**Files:** [`examples/index.html`](examples/index.html) + [`examples/plugins/note-card.html`](examples/plugins/note-card.html) + [`examples/plugins/note-editor.html`](examples/plugins/note-editor.html)

A practical example demonstrating a complete plugin-based application with both inline and fullscreen plugins.

**Features:**
- Multiple inline note card plugins displayed on a board
- Each note is an isolated iframe communicating via postMessage
- Fullscreen editor plugin for editing notes
- localStorage persistence
- CRUD operations through parent-plugin communication
- Color-coded notes with timestamps
- Real-world bidirectional communication patterns

**Communication flow:**
- **Parent → Plugin methods:** `updateNote(note)`, `getNote()`
- **Plugin → Parent callbacks:** `onEdit(noteId)`, `onDelete(noteId)`, `onSave(note)`, `onClose()`

This example demonstrates the clear separation between parent and plugin iframes - each note card runs in isolation, and the fullscreen editor provides a modal editing experience.
