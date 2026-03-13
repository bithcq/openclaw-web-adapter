import http from "node:http";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createAli1688ChatAdapter } from "./adapter.js";
import { materializeAli1688ChatMessageAttachments } from "./attachments.js";
import { DEFAULT_ALI1688_CHAT_SELECTORS } from "./selectors.js";
import type { Ali1688ChatPageSnapshot, Ali1688ChatSelectorConfig } from "./types.js";
import { connectBrowserContext, ensureAttachedPage, readJsonFile } from "../../../core/browser.js";
import { buildTargetContext, pickTarget } from "../../../core/target.js";
import { WebAdapterRegistry } from "../../../registry.js";
import {
  performWithBestAdapter,
  resolveAdapterForTarget,
} from "../../../runtime/adapter-runtime.js";
import { WebAdapterHealthState } from "../../../runtime/health-state.js";
import { readWebAdapterRequestBody, writeJson } from "../../../runtime/http.js";
import { WebAdapterOutboundQueue } from "../../../runtime/outbound-queue.js";
import { createWebAdapterPluginEventPoster } from "../../../runtime/plugin-events.js";
import { createWebAdapterPoller } from "../../../runtime/poller.js";

type SidecarConfig = {
  cdpUrl: string;
  pluginEventsUrl: string;
  pluginAuthToken: string;
  listenPort: number;
  pollMs: number;
  sendConfirmTimeoutMs: number;
  outboundRetryAttempts: number;
  downloadDir: string;
  selectorsPath?: string;
};

type OutboundRequest = {
  conversationId: string;
  customerId?: string;
  customerName?: string;
  text: string;
  idempotencyKey: string;
};

export function parseOutboundRequestPayload(body: string): OutboundRequest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const request = parsed as Record<string, unknown>;
  if (
    typeof request.conversationId !== "string" ||
    !request.conversationId.trim() ||
    typeof request.text !== "string" ||
    !request.text.trim() ||
    typeof request.idempotencyKey !== "string" ||
    !request.idempotencyKey.trim()
  ) {
    return null;
  }
  return {
    conversationId: request.conversationId,
    customerId:
      typeof request.customerId === "string" && request.customerId.trim()
        ? request.customerId
        : undefined,
    customerName: typeof request.customerName === "string" ? request.customerName : undefined,
    text: request.text,
    idempotencyKey: request.idempotencyKey,
  };
}

function parseArgs(argv: string[]): SidecarConfig {
  const map = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key?.startsWith("--") && value) {
      map.set(key.slice(2), value);
    }
  }
  return {
    cdpUrl: map.get("cdp-url") ?? process.env.ALI1688_CDP_URL ?? "http://127.0.0.1:18792",
    pluginEventsUrl:
      map.get("plugin-events-url") ??
      process.env.ALI1688_PLUGIN_EVENTS_URL ??
      "http://127.0.0.1:18789/plugins/ali1688/events",
    pluginAuthToken: map.get("plugin-auth-token") ?? process.env.ALI1688_PLUGIN_AUTH_TOKEN ?? "",
    listenPort: Number(map.get("listen-port") ?? process.env.ALI1688_SIDECAR_PORT ?? 18888),
    pollMs: Number(map.get("poll-ms") ?? process.env.ALI1688_POLL_MS ?? 2_000),
    sendConfirmTimeoutMs: Number(
      map.get("send-confirm-timeout-ms") ?? process.env.ALI1688_SEND_CONFIRM_TIMEOUT_MS ?? 8_000,
    ),
    outboundRetryAttempts: Number(
      map.get("outbound-retry-attempts") ?? process.env.ALI1688_OUTBOUND_RETRY_ATTEMPTS ?? 2,
    ),
    downloadDir:
      map.get("download-dir") ?? process.env.ALI1688_DOWNLOAD_DIR ?? "/tmp/openclaw-ali1688-media",
    selectorsPath: map.get("selectors") ?? process.env.ALI1688_SELECTORS_PATH,
  };
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const selectors = await readJsonFile<Ali1688ChatSelectorConfig>(
    config.selectorsPath,
    DEFAULT_ALI1688_CHAT_SELECTORS,
  );
  const context = await connectBrowserContext(config.cdpUrl);
  const registry = new WebAdapterRegistry();
  registry.register(createAli1688ChatAdapter(selectors));

  const seenInbound = new Set<string>();
  const attachmentCache = new Map<string, { localPath: string; mimeType?: string }>();
  const health = new WebAdapterHealthState();
  const postPluginEvent = createWebAdapterPluginEventPoster({
    pluginEventsUrl: config.pluginEventsUrl,
    pluginAuthToken: config.pluginAuthToken,
  });
  const outboundQueue = new WebAdapterOutboundQueue<OutboundRequest, Record<string, unknown>>({
    timeoutMs: config.sendConfirmTimeoutMs * Math.max(config.outboundRetryAttempts, 1) + 5_000,
    execute: async (request) => {
      const target = pickTarget(context, selectors);
      if (!target) {
        throw new Error("no_1688_target_page");
      }

      await ensureAttachedPage(target.page);
      const targetContext = await buildTargetContext(target);
      const selectResult = await performWithBestAdapter(registry, targetContext, {
        action: "select_conversation",
        args: {
          conversationId: request.conversationId,
        },
      });
      if (!selectResult.ok) {
        throw new Error(selectResult.error ?? `conversation_not_found:${request.conversationId}`);
      }

      await target.frame.waitForTimeout(300);
      const result = await performWithBestAdapter(registry, targetContext, {
        action: "send_text",
        args: {
          text: request.text,
          attempts: config.outboundRetryAttempts,
        },
        timeoutMs: config.sendConfirmTimeoutMs,
      });
      if (!result.ok || !result.confirmed) {
        throw new Error(result.error ?? "send_text_failed");
      }
      return result;
    },
    onError: (error) => {
      health.setError(error);
    },
  });
  const poller = createWebAdapterPoller({
    pollMs: config.pollMs,
    runOnce: async () => {
      const target = pickTarget(context, selectors);
      if (!target) {
        health.updateScan({
          ok: false,
          reason: "target_not_found",
        });
        return;
      }

      await ensureAttachedPage(target.page);
      const targetContext = await buildTargetContext(target);
      const selected = await resolveAdapterForTarget(registry, targetContext);
      if (!selected) {
        health.updateScan({
          ok: false,
          reason: "unsupported_page",
          pageUrl: targetContext.pageUrl,
          frameUrl: targetContext.frameUrl,
        });
        return;
      }
      let snapshot = await selected.adapter.scan(targetContext);
      health.updateScan(snapshot);

      if (!snapshot.health.isLoggedIn || !snapshot.health.domHealthy) {
        health.setError(snapshot.health.warning ?? "1688 page unhealthy");
        return;
      }

      const payload = snapshot.payload as Ali1688ChatPageSnapshot;

      const preferredConversation =
        payload.conversations.find((item) => item.unread) ??
        payload.conversations.find((item) => item.active) ??
        payload.conversations[0];

      if (preferredConversation && !preferredConversation.active) {
        const selectResult = await performWithBestAdapter(registry, targetContext, {
          action: "select_conversation",
          args: {
            conversationId: preferredConversation.conversationId,
          },
        });
        if (selectResult.ok) {
          await target.frame.waitForTimeout(300);
          snapshot = await selected.adapter.scan(targetContext);
          health.updateScan(snapshot);
        }
      }
      const updatedPayload = snapshot.payload as Ali1688ChatPageSnapshot;

      const activeConversation =
        updatedPayload.conversations.find((item) => item.active) ?? preferredConversation;
      if (!activeConversation) {
        return;
      }

      for (const message of updatedPayload.messages) {
        if (!message.isIncoming) {
          continue;
        }
        const dedupeKey = `${activeConversation.conversationId}:${message.messageId}`;
        if (seenInbound.has(dedupeKey)) {
          continue;
        }
        seenInbound.add(dedupeKey);
        const attachments = await materializeAli1688ChatMessageAttachments({
          frame: target.frame,
          downloadDir: config.downloadDir,
          conversationId: activeConversation.conversationId,
          message,
          cache: attachmentCache,
        });
        await postPluginEvent({
          conversationId: activeConversation.conversationId,
          customerId: activeConversation.customerId,
          customerName: activeConversation.customerName,
          messageId: message.messageId,
          dedupeKey,
          senderRole: message.isSystem ? "system" : "customer",
          messageType: message.messageType,
          text: message.text,
          rawText: message.rawText,
          normalizedText: message.text,
          attachments,
          timestamp: message.timestamp,
          pageSourceMetadata: {
            pageTitle: updatedPayload.title,
            pageUrl: target.page.url(),
            frameUrl: updatedPayload.frameUrl,
            isLoggedIn: snapshot.health.isLoggedIn ?? false,
            domHealthy: snapshot.health.domHealthy ?? false,
            transport: "relay",
            snapshotAt: Date.now(),
          },
          metadata: {
            adapterId: snapshot.adapterId,
            capabilities: selected.adapter.describeCapabilities(),
            pageTitle: updatedPayload.title,
            pageUrl: updatedPayload.url,
            health: snapshot.health,
          },
        });
      }
    },
    onError: (error) => {
      health.setError(error);
      console.error(`[1688.com/chat] ${String(error)}`);
    },
  });

  const server = http.createServer((req, res) => {
    void (async () => {
      if (!req.url) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      if (req.method === "GET" && req.url === "/health") {
        writeJson(
          res,
          200,
          health.buildSnapshot({
            listenPort: config.listenPort,
            pluginEventsUrl: config.pluginEventsUrl,
            queuedOutbound: outboundQueue.getQueuedCount(),
            outboundDraining: outboundQueue.isDraining(),
            poller: poller.getSnapshot(),
          }),
        );
        return;
      }

      if (req.method === "POST" && req.url === "/send") {
        const body = await readWebAdapterRequestBody(req);
        const parsed = parseOutboundRequestPayload(body);
        if (!parsed) {
          writeJson(res, 400, { ok: false, error: "invalid_payload" });
          return;
        }

        const currentStatus = outboundQueue.getStatus(parsed.idempotencyKey);
        if (currentStatus === "pending" || currentStatus === "sent") {
          writeJson(res, 200, { ok: true, duplicate: true, status: currentStatus });
          return;
        }

        try {
          const result = await outboundQueue.enqueue(parsed);
          writeJson(res, 200, result);
        } catch (error) {
          health.setError(error);
          writeJson(res, 502, { ok: false, error: String(error) });
        }
        return;
      }

      if (req.method === "POST" && req.url === "/simulate/inbound") {
        const body = await readWebAdapterRequestBody(req);
        const response = await postPluginEvent(body);
        res.statusCode = response.status;
        res.end(await response.text());
        return;
      }

      res.statusCode = 404;
      res.end("Not found");
    })().catch((error) => {
      health.setError(error);
      if (res.writableEnded) {
        return;
      }
      writeJson(res, 500, { ok: false, error: "internal_error" });
    });
  });

  server.listen(config.listenPort, "127.0.0.1");
  await poller.start();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
