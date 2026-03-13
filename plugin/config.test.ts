import { describe, expect, it } from "vitest";
import {
  parseWebAdapterPluginConfig,
  SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS,
  WEB_ADAPTER_PLUGIN_JSON_SCHEMA,
} from "./config.js";

describe("web adapter plugin config", () => {
  it("parses watcher definitions with defaults", () => {
    const parsed = parseWebAdapterPluginConfig({
      installMode: "native",
      watchers: [
        {
          adapterId: "1688.com/chat",
          pluginEventsPath: "/plugins/ali1688/events",
          listenPort: "18890",
        },
      ],
    });

    expect(parsed.installMode).toBe("native");
    expect(parsed.watchers).toEqual([
      {
        id: "1688.com-chat-1",
        adapterId: "1688.com/chat",
        enabled: true,
        pluginEventsPath: "/plugins/ali1688/events",
        pluginEventsUrl: undefined,
        pluginAuthToken: undefined,
        cdpUrl: undefined,
        listenPort: 18890,
        pollMs: undefined,
        selectorsPath: undefined,
        downloadDir: undefined,
        sendConfirmTimeoutMs: undefined,
        outboundRetryAttempts: undefined,
      },
    ]);
  });

  it("drops invalid watcher entries", () => {
    const parsed = parseWebAdapterPluginConfig({
      watchers: [{ id: "bad-entry" }, "nope", null],
    });

    expect(parsed.watchers).toEqual([]);
  });

  it("drops non-positive watcher integers so runtime defaults still work", () => {
    const parsed = parseWebAdapterPluginConfig({
      watchers: [
        {
          adapterId: "1688.com/chat",
          listenPort: 0,
          pollMs: "0",
          sendConfirmTimeoutMs: -1,
          outboundRetryAttempts: "0",
        },
      ],
    });

    expect(parsed.watchers).toEqual([
      expect.objectContaining({
        adapterId: "1688.com/chat",
        listenPort: undefined,
        pollMs: undefined,
        sendConfirmTimeoutMs: undefined,
        outboundRetryAttempts: undefined,
      }),
    ]);
  });

  it("publishes native watcher schema constraints", () => {
    const watcherSchema = WEB_ADAPTER_PLUGIN_JSON_SCHEMA.properties.watchers.items;

    expect(watcherSchema.required).toEqual(["adapterId"]);
    expect(watcherSchema.properties.adapterId).toEqual({
      type: "string",
      enum: [...SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS],
    });
    expect(watcherSchema.properties.listenPort).toEqual({ type: "integer", minimum: 1 });
    expect(watcherSchema.properties.pollMs).toEqual({ type: "integer", minimum: 1 });
    expect(watcherSchema.properties.sendConfirmTimeoutMs).toEqual({
      type: "integer",
      minimum: 1,
    });
    expect(watcherSchema.properties.outboundRetryAttempts).toEqual({
      type: "integer",
      minimum: 1,
    });
  });
});
