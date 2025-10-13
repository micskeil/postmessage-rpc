import { initFullscreenPlugin, initInlinePlugin } from "../src/main.ts";
import type {
  PluginConfig,
  FullscreenPlugin,
  InlinePlugin,
  InlinePluginOptions,
} from "../src/types/index.ts";

interface ExampleSettings {
  splashScreenUrl?: string;
}

interface InitExampleSdkOptions {
  settings?: ExampleSettings;
}

interface InlineAdPluginOptions {
  container: HTMLElement;
  beforeInit?: InlinePluginOptions["beforeInit"];
  timeout?: number;
}

export default function initExampleSdk({
  settings: { splashScreenUrl } = {},
}: InitExampleSdkOptions = {}) {
  function initInlineAdPlugin(
    { data, settings, parentCallbacks }: PluginConfig,
    { container, beforeInit, timeout }: InlineAdPluginOptions,
  ): Promise<InlinePlugin> {
    const src = "./plugins/inline-ad.html";
    // we could define the beforeInit here to set the dimensions from the settings object
    return initInlinePlugin(
      { data, settings, parentCallbacks },
      { container, src, beforeInit, timeout },
    );
  }

  function initContentEditorPlugin({
    data,
    settings,
    parentCallbacks,
  }: PluginConfig): Promise<FullscreenPlugin> {
    const src = "./plugins/content-editor.html";
    return initFullscreenPlugin(
      { data, settings: { ...settings, splashScreenUrl }, parentCallbacks },
      { id: "content-editor", src },
    );
  }

  function initPuppetMasterPlugin({
    data,
    settings,
    parentCallbacks,
  }: PluginConfig): Promise<FullscreenPlugin> {
    const src = "./plugins/puppet-master.html";
    return initFullscreenPlugin(
      { data, settings: { ...settings, splashScreenUrl }, parentCallbacks },
      { id: "puppet-master", src },
    );
  }

  function initSyncMonitorPlugin({
    data,
    settings,
    parentCallbacks,
  }: PluginConfig): Promise<FullscreenPlugin> {
    const src = "./plugins/sync-monitor.html";
    return initFullscreenPlugin(
      { data, settings: { ...settings, splashScreenUrl }, parentCallbacks },
      { id: "sync-monitor", src },
    );
  }

  function initColorEchoPlugin({
    data,
    settings,
    parentCallbacks,
  }: PluginConfig): Promise<FullscreenPlugin> {
    const src = "./plugins/color-echo.html";
    return initFullscreenPlugin(
      { data, settings: { ...settings, splashScreenUrl }, parentCallbacks },
      { id: "color-echo", src },
    );
  }

  return {
    initInlineAdPlugin,
    initContentEditorPlugin,
    initPuppetMasterPlugin,
    initSyncMonitorPlugin,
    initColorEchoPlugin,
  };
}
