import fs from "node:fs/promises";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { resolveRelayAuthTokenForPort } from "./relay-auth.js";

const RELAY_AUTH_HEADER = "x-openclaw-relay-token";

export async function readJsonFile<T>(filePath: string | undefined, fallback: T): Promise<T> {
  if (!filePath) {
    return fallback;
  }
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function resolveWebAdapterCdpUrl(rawUrl: string): Promise<string> {
  return (await resolveWebAdapterCdpConnection(rawUrl)).endpoint;
}

export async function resolveWebAdapterCdpConnection(rawUrl: string): Promise<{
  endpoint: string;
  headers: Record<string, string>;
}> {
  const url = new URL(rawUrl);
  const isLocalRelay = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  let relayToken: string | undefined;
  if (!isLocalRelay) {
    return { endpoint: rawUrl, headers: {} };
  }

  if (!url.searchParams.has("token")) {
    const defaultPort = url.protocol === "https:" || url.protocol === "wss:" ? 443 : 80;
    const relayPort = Number(url.port || defaultPort);
    relayToken = await resolveRelayAuthTokenForPort(relayPort);
    if (relayToken) {
      url.searchParams.set("token", relayToken);
    }
  } else {
    relayToken = url.searchParams.get("token")?.trim() || undefined;
  }

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/cdp";
  }

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  return {
    endpoint: url.toString(),
    headers: relayToken ? { [RELAY_AUTH_HEADER]: relayToken } : {},
  };
}

export async function connectBrowserContext(rawUrl: string): Promise<BrowserContext> {
  const connection = await resolveWebAdapterCdpConnection(rawUrl);
  const browser = await chromium.connectOverCDP(connection.endpoint, {
    headers: connection.headers,
  });
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No browser context available from CDP connection.");
  }
  return context;
}

export async function ensureAttachedPage(page: Page): Promise<void> {
  await page.bringToFront();
}
