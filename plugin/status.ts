import { getBuiltInWebAdapterCatalog } from "../src/catalog.js";
import { parseWebAdapterPluginConfig } from "./config.js";
import type { WebAdapterNativeWatcherSnapshot } from "./native-runtime.js";

export function buildWebAdapterPluginCatalogPayload() {
  const adapters = getBuiltInWebAdapterCatalog();
  return {
    adapters,
    adapterCount: adapters.length,
  };
}

export function buildWebAdapterPluginStatusPayload(
  pluginConfig: unknown,
  watcherSnapshots: WebAdapterNativeWatcherSnapshot[] = [],
) {
  const config = parseWebAdapterPluginConfig(pluginConfig);
  const catalog = getBuiltInWebAdapterCatalog();
  const activeWatchers = watcherSnapshots.filter((watcher) => watcher.state === "running");

  return {
    pluginId: "web-adapter",
    enabled: config.enabled,
    installMode: config.installMode,
    browserRelayBaseUrl: config.browserRelayBaseUrl,
    gatewayBaseUrl: config.gatewayBaseUrl,
    autoMatch: config.autoMatch,
    packagedInstall: true,
    nativeRuntimeIntegration:
      config.installMode === "native" ? "plugin-supervised-watchers" : "package-only",
    nativeRuntimeModel:
      config.installMode === "native" ? "plugin-supervised-child-process" : "none",
    adapterCount: catalog.length,
    adapters: catalog,
    watcherConfigCount: config.watchers.length,
    watcherRunningCount: activeWatchers.length,
    watchers: watcherSnapshots,
  };
}
