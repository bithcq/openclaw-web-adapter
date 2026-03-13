import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import {
  parseWebAdapterPluginConfig,
  WEB_ADAPTER_PLUGIN_JSON_SCHEMA,
  WEB_ADAPTER_PLUGIN_UI_HINTS,
} from "./config.js";
import { WebAdapterNativeRuntime } from "./native-runtime.js";
import {
  buildWebAdapterPluginCatalogPayload,
  buildWebAdapterPluginStatusPayload,
} from "./status.js";
import type { CliCommandLike, OpenClawPluginApiLike } from "./types.js";

const PACKAGE_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): boolean {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
  return true;
}

function writeCliJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeCliLines(lines: string[]): void {
  process.stdout.write(`${lines.join("\n")}\n`);
}

function createSubcommand(parent: CliCommandLike, name: string, description: string) {
  return parent.command(name).description(description).option("--json", "Output JSON");
}

async function writePluginStateFiles(params: {
  pluginStateDir: string;
  pluginConfig: unknown;
  watcherSnapshots: ReturnType<WebAdapterNativeRuntime["getSnapshots"]>;
}): Promise<void> {
  await fs.mkdir(params.pluginStateDir, { recursive: true });
  await fs.writeFile(
    path.join(params.pluginStateDir, "catalog.json"),
    JSON.stringify(buildWebAdapterPluginCatalogPayload(), null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(params.pluginStateDir, "status.json"),
    JSON.stringify(
      buildWebAdapterPluginStatusPayload(params.pluginConfig, params.watcherSnapshots),
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(
    path.join(params.pluginStateDir, "watchers.json"),
    JSON.stringify({ watchers: params.watcherSnapshots }, null, 2),
    "utf8",
  );
}

const webAdapterPlugin = {
  id: "web-adapter",
  name: "Web Adapter",
  description: "Automatic page adaptation layer for browser-backed OpenClaw workflows.",
  configSchema: {
    parse: parseWebAdapterPluginConfig,
    uiHints: WEB_ADAPTER_PLUGIN_UI_HINTS,
    jsonSchema: WEB_ADAPTER_PLUGIN_JSON_SCHEMA,
  },
  register(api: OpenClawPluginApiLike) {
    let nativeRuntime: WebAdapterNativeRuntime | null = null;
    api.registerService({
      id: "web-adapter-runtime",
      async start(ctx) {
        const pluginStateDir = path.join(ctx.stateDir, "web-adapter");
        nativeRuntime = new WebAdapterNativeRuntime({
          packageRoot: PACKAGE_ROOT,
          stateDir: ctx.stateDir,
          logger: ctx.logger,
          onStatusChange: async (watcherSnapshots) => {
            await writePluginStateFiles({
              pluginStateDir,
              pluginConfig: api.pluginConfig,
              watcherSnapshots,
            });
          },
        });
        await nativeRuntime.start(parseWebAdapterPluginConfig(api.pluginConfig));
        await writePluginStateFiles({
          pluginStateDir,
          pluginConfig: api.pluginConfig,
          watcherSnapshots: nativeRuntime.getSnapshots(),
        });
        ctx.logger.info("[web-adapter] catalog, status, and watcher runtime exported to state dir");
      },
      async stop() {
        await nativeRuntime?.stop();
      },
    });

    api.registerHttpRoute({
      path: "/plugins/web-adapter/catalog",
      auth: "gateway",
      match: "exact",
      handler: async (_req: IncomingMessage, res: ServerResponse) =>
        writeJson(res, 200, buildWebAdapterPluginCatalogPayload()),
    });

    api.registerHttpRoute({
      path: "/plugins/web-adapter/status",
      auth: "gateway",
      match: "exact",
      handler: async (_req: IncomingMessage, res: ServerResponse) =>
        writeJson(
          res,
          200,
          buildWebAdapterPluginStatusPayload(api.pluginConfig, nativeRuntime?.getSnapshots() ?? []),
        ),
    });

    api.registerHttpRoute({
      path: "/plugins/web-adapter/watchers",
      auth: "gateway",
      match: "exact",
      handler: async (_req: IncomingMessage, res: ServerResponse) =>
        writeJson(res, 200, { watchers: nativeRuntime?.getSnapshots() ?? [] }),
    });

    api.registerCli(
      ({ program }) => {
        const root = program.command("web-adapter").description("Web Adapter plugin utilities");

        createSubcommand(root, "status", "Show Web Adapter plugin status").action(
          (options?: Record<string, unknown>) => {
            const payload = buildWebAdapterPluginStatusPayload(
              api.pluginConfig,
              nativeRuntime?.getSnapshots() ?? [],
            );
            if (options?.json) {
              writeCliJson(payload);
              return;
            }
            writeCliLines([
              "Web Adapter",
              `- enabled: ${String(payload.enabled)}`,
              `- installMode: ${payload.installMode}`,
              `- autoMatch: ${String(payload.autoMatch)}`,
              `- adapters: ${String(payload.adapterCount)}`,
              `- nativeRuntimeIntegration: ${payload.nativeRuntimeIntegration}`,
              `- watcherConfigCount: ${String(payload.watcherConfigCount)}`,
              `- watcherRunningCount: ${String(payload.watcherRunningCount)}`,
            ]);
          },
        );

        createSubcommand(root, "catalog", "List built-in Web Adapter entries").action(
          (options?: Record<string, unknown>) => {
            const payload = buildWebAdapterPluginCatalogPayload();
            if (options?.json) {
              writeCliJson(payload);
              return;
            }
            writeCliLines(
              payload.adapters.map(
                (adapter) =>
                  `- ${adapter.id} [${adapter.kind}] (${adapter.status}) reads=${adapter.capabilities.map((capability) => capability.readOps.join(",")).join(";")} actions=${adapter.capabilities.map((capability) => capability.actionOps.join(",")).join(";")}`,
              ),
            );
          },
        );

        createSubcommand(root, "watchers", "Show native watcher status").action(
          (options?: Record<string, unknown>) => {
            const payload = {
              watchers: nativeRuntime?.getSnapshots() ?? [],
            };
            if (options?.json) {
              writeCliJson(payload);
              return;
            }
            if (payload.watchers.length === 0) {
              writeCliLines(["No native watchers configured."]);
              return;
            }
            writeCliLines(
              payload.watchers.map(
                (watcher) =>
                  `- ${watcher.id} ${watcher.adapterId} state=${watcher.state} pid=${String(watcher.pid ?? "-")} restarts=${String(watcher.restartCount)} events=${watcher.pluginEventsUrl ?? "-"}`,
              ),
            );
          },
        );
      },
      { commands: ["web-adapter"] },
    );
  },
};

export default webAdapterPlugin;
