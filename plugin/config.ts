export type WebAdapterPluginInstallMode = "companion" | "native";
export const SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS = ["1688.com/chat"] as const;

export type WebAdapterWatcherConfig = {
  id: string;
  adapterId: string;
  enabled: boolean;
  pluginEventsPath?: string;
  pluginEventsUrl?: string;
  pluginAuthToken?: string;
  cdpUrl?: string;
  listenPort?: number;
  pollMs?: number;
  selectorsPath?: string;
  downloadDir?: string;
  sendConfirmTimeoutMs?: number;
  outboundRetryAttempts?: number;
};

export type WebAdapterPluginConfig = {
  enabled: boolean;
  installMode: WebAdapterPluginInstallMode;
  browserRelayBaseUrl: string;
  gatewayBaseUrl: string;
  autoMatch: boolean;
  watchers: WebAdapterWatcherConfig[];
};

const WATCHER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["adapterId"],
  properties: {
    id: { type: "string" },
    adapterId: { type: "string", enum: [...SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS] },
    enabled: { type: "boolean" },
    pluginEventsPath: { type: "string" },
    pluginEventsUrl: { type: "string" },
    pluginAuthToken: { type: "string" },
    cdpUrl: { type: "string" },
    listenPort: { type: "integer", minimum: 1 },
    pollMs: { type: "integer", minimum: 1 },
    selectorsPath: { type: "string" },
    downloadDir: { type: "string" },
    sendConfirmTimeoutMs: { type: "integer", minimum: 1 },
    outboundRetryAttempts: { type: "integer", minimum: 1 },
  },
} as const;

export const WEB_ADAPTER_PLUGIN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    installMode: { type: "string", enum: ["companion", "native"] },
    browserRelayBaseUrl: { type: "string" },
    gatewayBaseUrl: { type: "string" },
    autoMatch: { type: "boolean" },
    watchers: {
      type: "array",
      items: WATCHER_JSON_SCHEMA,
    },
  },
} as const;

export const WEB_ADAPTER_PLUGIN_UI_HINTS = {
  enabled: { label: "Enabled" },
  installMode: {
    label: "Install Mode",
    help: "Use companion for current sidecar flows and native for future tighter OpenClaw integration.",
  },
  browserRelayBaseUrl: {
    label: "Browser Relay Base URL",
    advanced: true,
    placeholder: "http://127.0.0.1:18792",
  },
  gatewayBaseUrl: {
    label: "Gateway Base URL",
    advanced: true,
    placeholder: "http://127.0.0.1:18789",
  },
  autoMatch: { label: "Auto Match Supported Pages" },
  watchers: {
    label: "Native Watchers",
    help: "Configure browser-backed watcher processes that OpenClaw should supervise. Currently only 1688.com/chat is supported in native watcher mode.",
    advanced: true,
  },
} as const;

function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalPositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

function normalizeWatcherId(adapterId: string, index: number): string {
  const normalized = adapterId
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized ? `${normalized}-${index + 1}` : `watcher-${index + 1}`;
}

function parseWatchers(value: unknown): WebAdapterWatcherConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const raw = entry as Record<string, unknown>;
    const adapterId = trimOptionalString(raw.adapterId);
    if (!adapterId) {
      return [];
    }
    return [
      {
        id: trimOptionalString(raw.id) ?? normalizeWatcherId(adapterId, index),
        adapterId,
        enabled: raw.enabled !== false,
        pluginEventsPath: trimOptionalString(raw.pluginEventsPath),
        pluginEventsUrl: trimOptionalString(raw.pluginEventsUrl),
        pluginAuthToken: trimOptionalString(raw.pluginAuthToken),
        cdpUrl: trimOptionalString(raw.cdpUrl),
        listenPort: parseOptionalPositiveInteger(raw.listenPort),
        pollMs: parseOptionalPositiveInteger(raw.pollMs),
        selectorsPath: trimOptionalString(raw.selectorsPath),
        downloadDir: trimOptionalString(raw.downloadDir),
        sendConfirmTimeoutMs: parseOptionalPositiveInteger(raw.sendConfirmTimeoutMs),
        outboundRetryAttempts: parseOptionalPositiveInteger(raw.outboundRetryAttempts),
      },
    ];
  });
}

export function parseWebAdapterPluginConfig(value: unknown): WebAdapterPluginConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const installMode = raw.installMode === "native" ? "native" : "companion";

  return {
    enabled: raw.enabled !== false,
    installMode,
    browserRelayBaseUrl:
      typeof raw.browserRelayBaseUrl === "string" && raw.browserRelayBaseUrl.trim()
        ? raw.browserRelayBaseUrl.trim()
        : "http://127.0.0.1:18792",
    gatewayBaseUrl:
      typeof raw.gatewayBaseUrl === "string" && raw.gatewayBaseUrl.trim()
        ? raw.gatewayBaseUrl.trim()
        : "http://127.0.0.1:18789",
    autoMatch: raw.autoMatch !== false,
    watchers: parseWatchers(raw.watchers),
  };
}
