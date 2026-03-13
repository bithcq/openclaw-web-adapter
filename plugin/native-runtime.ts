import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import process from "node:process";
import {
  SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS,
  type WebAdapterPluginConfig,
  type WebAdapterWatcherConfig,
} from "./config.js";
import type { PluginLoggerLike } from "./types.js";

export type WebAdapterNativeWatcherState =
  | "disabled"
  | "idle"
  | "starting"
  | "running"
  | "restarting"
  | "stopped"
  | "error";

export type WebAdapterNativeWatcherSnapshot = {
  id: string;
  adapterId: string;
  enabled: boolean;
  state: WebAdapterNativeWatcherState;
  cdpUrl?: string;
  pluginEventsUrl?: string;
  listenPort?: number;
  pid?: number;
  restartCount: number;
  lastError?: string;
  lastExitCode?: number | null;
  lastExitSignal?: NodeJS.Signals | null;
  startedAt?: number;
  runtimeModel: "plugin-supervised-child-process";
};

type SpawnedProcessLike = ChildProcess &
  EventEmitter & {
    stdout: NodeJS.ReadableStream | null;
    stderr: NodeJS.ReadableStream | null;
  };

type SpawnImpl = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: ["ignore", "pipe", "pipe"];
  },
) => SpawnedProcessLike;

type ManagedWatcher = {
  config: WebAdapterWatcherConfig;
  snapshot: WebAdapterNativeWatcherSnapshot;
  child?: SpawnedProcessLike;
  restartTimer?: NodeJS.Timeout;
};

type ResolvedWatcherSpec = {
  runnerPath: string;
  args: string[];
  cdpUrl: string;
  pluginEventsUrl: string;
  listenPort: number;
};

function createSnapshot(
  watcher: WebAdapterWatcherConfig,
  state: WebAdapterNativeWatcherState,
): WebAdapterNativeWatcherSnapshot {
  return {
    id: watcher.id,
    adapterId: watcher.adapterId,
    enabled: watcher.enabled,
    state,
    restartCount: 0,
    runtimeModel: "plugin-supervised-child-process",
  };
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function joinUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function defaultPluginEventsPath(adapterId: string): string | undefined {
  if (adapterId === "1688.com/chat") {
    return "/plugins/ali1688/events";
  }
  return undefined;
}

function resolvePathFromRoot(rootDir: string, value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.join(rootDir, value);
}

function splitLines(chunk: string): string[] {
  return chunk
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

export class WebAdapterNativeRuntime {
  private readonly watchers = new Map<string, ManagedWatcher>();
  private stopping = false;

  constructor(
    private readonly params: {
      packageRoot: string;
      stateDir: string;
      logger: PluginLoggerLike;
      spawnImpl?: SpawnImpl;
      onStatusChange?: (snapshots: WebAdapterNativeWatcherSnapshot[]) => void | Promise<void>;
    },
  ) {}

  private get spawnImpl(): SpawnImpl {
    return this.params.spawnImpl ?? (spawn as SpawnImpl);
  }

  getSnapshots(): WebAdapterNativeWatcherSnapshot[] {
    return [...this.watchers.values()].map((entry) => ({ ...entry.snapshot }));
  }

  private async notifyChange(): Promise<void> {
    try {
      await this.params.onStatusChange?.(this.getSnapshots());
    } catch (error) {
      this.params.logger.error(`[web-adapter] failed to persist watcher status: ${String(error)}`);
    }
  }

  private resolveWatcherSpec(
    pluginConfig: WebAdapterPluginConfig,
    watcher: WebAdapterWatcherConfig,
    index: number,
  ): ResolvedWatcherSpec {
    if (!SUPPORTED_NATIVE_WATCHER_ADAPTER_IDS.includes(watcher.adapterId as "1688.com/chat")) {
      throw new Error(`unsupported_native_watcher_adapter:${watcher.adapterId}`);
    }

    const pluginEventsUrl =
      watcher.pluginEventsUrl && isAbsoluteHttpUrl(watcher.pluginEventsUrl)
        ? watcher.pluginEventsUrl
        : joinUrl(
            pluginConfig.gatewayBaseUrl,
            watcher.pluginEventsPath ??
              watcher.pluginEventsUrl ??
              defaultPluginEventsPath(watcher.adapterId) ??
              "",
          );

    if (!pluginEventsUrl) {
      throw new Error(`missing_plugin_events_path:${watcher.id}`);
    }

    const listenPort = watcher.listenPort ?? 18888 + index;
    const cdpUrl = watcher.cdpUrl ?? pluginConfig.browserRelayBaseUrl;
    const downloadDir =
      watcher.downloadDir ??
      path.join(this.params.stateDir, "web-adapter", "watchers", watcher.id, "downloads");
    const selectorsPath = resolvePathFromRoot(this.params.packageRoot, watcher.selectorsPath);
    const runnerPath = path.join(
      this.params.packageRoot,
      "src",
      "adapters",
      "1688.com",
      "chat",
      "runner.ts",
    );

    const args = [
      "--import",
      "jiti/register",
      runnerPath,
      "--cdp-url",
      cdpUrl,
      "--plugin-events-url",
      pluginEventsUrl,
      "--listen-port",
      String(listenPort),
      "--poll-ms",
      String(watcher.pollMs ?? 2_000),
      "--send-confirm-timeout-ms",
      String(watcher.sendConfirmTimeoutMs ?? 8_000),
      "--outbound-retry-attempts",
      String(watcher.outboundRetryAttempts ?? 2),
      "--download-dir",
      downloadDir,
    ];
    if (watcher.pluginAuthToken) {
      args.push("--plugin-auth-token", watcher.pluginAuthToken);
    }
    if (selectorsPath) {
      args.push("--selectors", selectorsPath);
    }

    return {
      runnerPath,
      args,
      cdpUrl,
      pluginEventsUrl,
      listenPort,
    };
  }

  private bindLogs(child: SpawnedProcessLike, watcherId: string): void {
    const onStdout = (chunk: Buffer | string) => {
      for (const line of splitLines(String(chunk))) {
        this.params.logger.info(`[web-adapter:${watcherId}] ${line}`);
      }
    };
    const onStderr = (chunk: Buffer | string) => {
      for (const line of splitLines(String(chunk))) {
        this.params.logger.warn(`[web-adapter:${watcherId}] ${line}`);
      }
    };
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
  }

  private scheduleRestart(
    pluginConfig: WebAdapterPluginConfig,
    entry: ManagedWatcher,
    index: number,
  ): void {
    if (this.stopping || !entry.config.enabled) {
      return;
    }
    entry.snapshot.state = "restarting";
    entry.snapshot.restartCount += 1;
    void this.notifyChange();
    const delayMs = Math.min(5_000, 1_000 * entry.snapshot.restartCount);
    entry.restartTimer = setTimeout(() => {
      entry.restartTimer = undefined;
      void this.startWatcher(pluginConfig, entry, index);
    }, delayMs);
  }

  private async startWatcher(
    pluginConfig: WebAdapterPluginConfig,
    entry: ManagedWatcher,
    index: number,
  ): Promise<void> {
    if (this.stopping || !entry.config.enabled) {
      return;
    }
    clearTimeout(entry.restartTimer);
    entry.restartTimer = undefined;

    entry.snapshot.state = "starting";
    entry.snapshot.lastError = undefined;
    await this.notifyChange();

    try {
      const spec = this.resolveWatcherSpec(pluginConfig, entry.config, index);
      const child = this.spawnImpl(process.execPath, spec.args, {
        cwd: this.params.packageRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      entry.child = child;
      entry.snapshot.state = "running";
      entry.snapshot.pid = child.pid;
      entry.snapshot.cdpUrl = spec.cdpUrl;
      entry.snapshot.pluginEventsUrl = spec.pluginEventsUrl;
      entry.snapshot.listenPort = spec.listenPort;
      entry.snapshot.startedAt = Date.now();
      this.bindLogs(child, entry.config.id);
      let settled = false;
      child.once("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        entry.snapshot.lastError = String(error);
        entry.snapshot.state = "error";
        void this.notifyChange();
        this.scheduleRestart(pluginConfig, entry, index);
      });
      child.once("exit", (code, signal) => {
        if (settled) {
          return;
        }
        settled = true;
        entry.child = undefined;
        entry.snapshot.pid = undefined;
        entry.snapshot.lastExitCode = code;
        entry.snapshot.lastExitSignal = signal;
        if (this.stopping || !entry.config.enabled) {
          entry.snapshot.state = "stopped";
          void this.notifyChange();
          return;
        }
        entry.snapshot.lastError =
          code === 0 && !signal
            ? undefined
            : `watcher_exited:${String(code ?? signal ?? "unknown")}`;
        this.scheduleRestart(pluginConfig, entry, index);
      });
      await this.notifyChange();
    } catch (error) {
      entry.snapshot.state = "error";
      entry.snapshot.lastError = String(error);
      await this.notifyChange();
    }
  }

  async start(pluginConfig: WebAdapterPluginConfig): Promise<void> {
    if (this.watchers.size > 0) {
      await this.stop();
    }
    this.stopping = false;
    this.watchers.clear();

    const watchers = pluginConfig.watchers.map((watcher) => ({
      config: watcher,
      snapshot: createSnapshot(watcher, watcher.enabled ? "idle" : "disabled"),
    }));

    for (const watcher of watchers) {
      this.watchers.set(watcher.config.id, watcher);
    }
    await this.notifyChange();

    if (!pluginConfig.enabled || pluginConfig.installMode !== "native") {
      return;
    }

    await Promise.all(
      watchers.map(async (entry, index) => {
        if (!entry.config.enabled) {
          return;
        }
        await this.startWatcher(pluginConfig, entry, index);
      }),
    );
  }

  async stop(): Promise<void> {
    this.stopping = true;
    await Promise.all(
      [...this.watchers.values()].map(async (entry) => {
        clearTimeout(entry.restartTimer);
        entry.restartTimer = undefined;
        if (entry.child && entry.child.exitCode === null && !entry.child.killed) {
          entry.child.kill("SIGTERM");
        }
        entry.snapshot.state = "stopped";
        entry.snapshot.pid = undefined;
      }),
    );
    await this.notifyChange();
  }
}
