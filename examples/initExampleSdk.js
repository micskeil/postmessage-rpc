import initFullscreenPlugin from "../src/initFullscreenPlugin.ts";
import initInlinePlugin from "../src/initInlinePlugin.ts";

export default function initExampleSdk({ settings: { splashScreenUrl } = {} }) {
	function initInlineAdPlugin({ data, settings, hooks }, { container, beforeInit, timeout }) {
		const src = "./plugins/inline-ad.html";
		// we could define the beforeInit here to set the dimensions from the settings object
		return initInlinePlugin({ data, settings, hooks }, { container, src, beforeInit, timeout });
	}

	 
	function initContentEditorPlugin({ data, settings, hooks }) {
		const src = "./plugins/content-editor.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, hooks }, { id: "content-editor", src });
	}

	 
	function initPuppetMasterPlugin({ data, settings, hooks }) {
		const src = "./plugins/puppet-master.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, hooks }, { id: "puppet-master", src });
	}

	 
	function initSyncMonitorPlugin({ data, settings, hooks }) {
		const src = "./plugins/sync-monitor.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, hooks }, { id: "sync-monitor", src });
	}

	 
	function initColorEchoPlugin({ data, settings, hooks }) {
		const src = "./plugins/color-echo.html";
		return initFullscreenPlugin({ data, settings: { ...settings, splashScreenUrl }, hooks }, { id: "color-echo", src });
	}

	return {
		initInlineAdPlugin,
		initContentEditorPlugin,
		initPuppetMasterPlugin,
		initSyncMonitorPlugin,
		initColorEchoPlugin,
	};
}
