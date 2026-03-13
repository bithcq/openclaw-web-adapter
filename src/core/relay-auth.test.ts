import { createHmac } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRelayAuthCacheForTests, resolveRelayAuthTokenForPort } from "./relay-auth.js";

const RELAY_TOKEN_CONTEXT = "openclaw-extension-relay-v1";
const ENV_KEYS = [
  "OPENCLAW_RELAY_TOKEN",
  "WEB_ADAPTER_RELAY_TOKEN",
  "OPENCLAW_GATEWAY_TOKEN",
  "CLAWDBOT_GATEWAY_TOKEN",
  "OPENCLAW_CONFIG_PATH",
  "CLAWDBOT_CONFIG_PATH",
  "OPENCLAW_STATE_DIR",
  "CLAWDBOT_STATE_DIR",
  "OPENCLAW_HOME",
  "CI_GATEWAY_TOKEN",
  "HOME",
  "USERPROFILE",
] as const;

function deriveRelayToken(gatewayToken: string, port: number): string {
  return createHmac("sha256", gatewayToken).update(`${RELAY_TOKEN_CONTEXT}:${port}`).digest("hex");
}

async function writeConfigFile(contents: unknown): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "relay-auth-test-"));
  const configPath = path.join(dir, "openclaw.json");
  await fs.writeFile(configPath, JSON.stringify(contents), "utf8");
  return configPath;
}

async function writeRawConfigFile(contents: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "relay-auth-test-"));
  const configPath = path.join(dir, "openclaw.json");
  await fs.writeFile(configPath, contents, "utf8");
  return configPath;
}

afterEach(() => {
  vi.restoreAllMocks();
  resetRelayAuthCacheForTests();
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("relay auth token resolution", () => {
  it("prefers explicit relay tokens from env", async () => {
    process.env.OPENCLAW_RELAY_TOKEN = "explicit-relay-token";

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe("explicit-relay-token");
  });

  it("derives relay tokens from gateway env tokens", async () => {
    process.env.OPENCLAW_GATEWAY_TOKEN = "gateway-from-env";

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-env", 18792),
    );
  });

  it("loads a direct gateway token from openclaw.json when env is missing", async () => {
    process.env.OPENCLAW_CONFIG_PATH = await writeConfigFile({
      gateway: { auth: { token: "gateway-from-config" } },
    });

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-config", 18792),
    );
  });

  it("resolves env template SecretRef tokens from openclaw.json", async () => {
    process.env.CI_GATEWAY_TOKEN = "gateway-from-secret-ref";
    process.env.OPENCLAW_CONFIG_PATH = await writeConfigFile({
      gateway: { auth: { token: "${CI_GATEWAY_TOKEN}" } },
    });

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-secret-ref", 18792),
    );
  });

  it("resolves file SecretRef tokens from openclaw.json", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "relay-auth-file-provider-"));
    const secretPath = path.join(dir, "gateway-token.txt");
    await fs.writeFile(secretPath, "gateway-from-file\n", "utf8");
    process.env.OPENCLAW_CONFIG_PATH = await writeConfigFile({
      gateway: {
        auth: {
          token: {
            source: "file",
            provider: "local-token",
            id: "value",
          },
        },
      },
      secrets: {
        providers: {
          "local-token": {
            source: "file",
            path: secretPath,
            mode: "singleValue",
          },
        },
      },
    });

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-file", 18792),
    );
  });

  it("loads gateway tokens from OPENCLAW_STATE_DIR/.env when process env is empty", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "relay-auth-dotenv-"));
    await fs.writeFile(
      path.join(stateDir, ".env"),
      "OPENCLAW_GATEWAY_TOKEN=gateway-from-dotenv\n",
      "utf8",
    );
    process.env.OPENCLAW_STATE_DIR = stateDir;

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-dotenv", 18792),
    );
  });

  it("parses comment-bearing config files without evaluating code", async () => {
    process.env.OPENCLAW_CONFIG_PATH = await writeRawConfigFile(`{
      // comment line
      "gateway": {
        "auth": {
          "token": "gateway-from-jsonc",
        },
      },
    }`);

    await expect(resolveRelayAuthTokenForPort(18792)).resolves.toBe(
      deriveRelayToken("gateway-from-jsonc", 18792),
    );
  });
});
