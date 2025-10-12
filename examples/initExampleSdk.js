import { initFullscreenPlugin, initInlinePlugin } from "../dist/pluginInterface.js";

export default function initExampleSdk({ settings: { splashScreenUrl } = {} }) {
	function initInlineAdPlugin({ data, settings, parentCallbacks }, { container, beforeInit, timeout }) {
		const src = "./plugins/inline-ad.html";
		// we could define the beforeInit here to set the dimensions from the settings object
		return initInlinePlugin({ data, settings, parentCallbacks }, { container, src, beforeInit, timeout });
	}


	function initContentEditorPlugin({ data, settings, parentCallbacks }) {
		const src = "./plugins/content-editor.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, parentCallbacks }, { id: "content-editor", src });
	}


	function initPuppetMasterPlugin({ data, settings, parentCallbacks }) {
		const src = "./plugins/puppet-master.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, parentCallbacks }, { id: "puppet-master", src });
	}


	function initSyncMonitorPlugin({ data, settings, parentCallbacks }) {
		const src = "./plugins/sync-monitor.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, parentCallbacks }, { id: "sync-monitor", src });
	}


	function initColorEchoPlugin({ data, settings, parentCallbacks }) {
		const src = "./plugins/color-echo.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, parentCallbacks }, { id: "color-echo", src });
	}

	return {
		initInlineAdPlugin,
		initContentEditorPlugin,
		initPuppetMasterPlugin,
		initSyncMonitorPlugin,
		initColorEchoPlugin,
	};
}
