import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const RELAY_TOKEN_CONTEXT = "openclaw-extension-relay-v1";
const CONFIG_FILENAMES = [
  "openclaw.json",
  "clawdbot.json",
  "moldbot.json",
  "moltbot.json",
] as const;
const STATE_DIR_NAMES = [".openclaw", ".clawdbot", ".moldbot", ".moltbot"] as const;
const DEFAULT_FILE_REF_ID = "value";
const DEFAULT_EXEC_TIMEOUT_MS = 5_000;
const DEFAULT_EXEC_MAX_OUTPUT_BYTES = 1024 * 1024;
const ENV_TEMPLATE_RE = /^\$\{([A-Z][A-Z0-9_]{0,127})\}$/;
const require = createRequire(import.meta.url);

type SecretDefaults = {
  env?: string;
  file?: string;
  exec?: string;
};

type SecretRefSource = "env" | "file" | "exec";

type SecretRef = {
  source: SecretRefSource;
  provider: string;
  id: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveUserPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed === "~") {
    return resolveEffectiveHomeDir();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.resolve(resolveEffectiveHomeDir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

function resolveEffectiveHomeDir(): string {
  const explicitHome = trimToUndefined(process.env.OPENCLAW_HOME);
  if (explicitHome) {
    if (explicitHome === "~") {
      return path.resolve(
        trimToUndefined(process.env.HOME) ??
          trimToUndefined(process.env.USERPROFILE) ??
          os.homedir(),
      );
    }
    if (explicitHome.startsWith("~/") || explicitHome.startsWith("~\\")) {
      const baseHome =
        trimToUndefined(process.env.HOME) ??
        trimToUndefined(process.env.USERPROFILE) ??
        os.homedir();
      return path.resolve(baseHome, explicitHome.slice(2));
    }
    return path.resolve(explicitHome);
  }
  return path.resolve(
    trimToUndefined(process.env.HOME) ?? trimToUndefined(process.env.USERPROFILE) ?? os.homedir(),
  );
}

function resolveConfigCandidatePaths(): string[] {
  const explicitConfigPath =
    trimToUndefined(process.env.OPENCLAW_CONFIG_PATH) ??
    trimToUndefined(process.env.CLAWDBOT_CONFIG_PATH);
  if (explicitConfigPath) {
    return [resolveUserPath(explicitConfigPath)];
  }

  const explicitStateDir =
    trimToUndefined(process.env.OPENCLAW_STATE_DIR) ??
    trimToUndefined(process.env.CLAWDBOT_STATE_DIR);
  if (explicitStateDir) {
    const resolvedStateDir = resolveUserPath(explicitStateDir);
    return CONFIG_FILENAMES.map((filename) => path.join(resolvedStateDir, filename));
  }

  const homeDir = resolveEffectiveHomeDir();
  const candidates: string[] = [];
  for (const dirname of STATE_DIR_NAMES) {
    const dir = path.join(homeDir, dirname);
    for (const filename of CONFIG_FILENAMES) {
      candidates.push(path.join(dir, filename));
    }
  }
  return candidates;
}

function resolveStateDir(): string {
  const explicitStateDir =
    trimToUndefined(process.env.OPENCLAW_STATE_DIR) ??
    trimToUndefined(process.env.CLAWDBOT_STATE_DIR);
  if (explicitStateDir) {
    return resolveUserPath(explicitStateDir);
  }
  return path.join(resolveEffectiveHomeDir(), ".openclaw");
}

function resolveInstalledOpenClawRootDir(): string | undefined {
  try {
    const entry = require.resolve("openclaw");
    return path.dirname(path.dirname(entry));
  } catch {
    return undefined;
  }
}

function parseDotEnv(text: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Z_a-z][A-Z0-9_a-z]*$/u.test(key)) {
      continue;
    }
    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/gu, "\n")
          .replace(/\\r/gu, "\r")
          .replace(/\\t/gu, "\t")
          .replace(/\\"/gu, '"')
          .replace(/\\\\/gu, "\\");
      }
    }
    entries[key] = value;
  }
  return entries;
}

function resolveDotEnvCandidatePaths(): string[] {
  const candidates = [path.join(process.cwd(), ".env"), path.join(resolveStateDir(), ".env")];

  const explicitConfigPath =
    trimToUndefined(process.env.OPENCLAW_CONFIG_PATH) ??
    trimToUndefined(process.env.CLAWDBOT_CONFIG_PATH);
  if (explicitConfigPath) {
    candidates.push(path.join(path.dirname(resolveUserPath(explicitConfigPath)), ".env"));
  }

  const openClawRoot = resolveInstalledOpenClawRootDir();
  if (openClawRoot) {
    candidates.push(path.join(openClawRoot, ".env"));
  }

  return [...new Set(candidates.map((item) => path.resolve(item)))];
}

let cachedDotEnvValuesPromise: Promise<Record<string, string>> | null = null;

async function loadDotEnvValues(): Promise<Record<string, string>> {
  if (cachedDotEnvValuesPromise) {
    return await cachedDotEnvValuesPromise;
  }

  cachedDotEnvValuesPromise = (async () => {
    const merged: Record<string, string> = {};
    for (const candidate of resolveDotEnvCandidatePaths()) {
      try {
        const raw = await fs.readFile(candidate, "utf8");
        for (const [key, value] of Object.entries(parseDotEnv(raw))) {
          if (!(key in merged)) {
            merged[key] = value;
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
      }
    }
    return merged;
  })();

  return await cachedDotEnvValuesPromise;
}

export function resetRelayAuthCacheForTests(): void {
  cachedDotEnvValuesPromise = null;
}

async function readEnvVar(...keys: string[]): Promise<string | undefined> {
  for (const key of keys) {
    const directValue = trimToUndefined(process.env[key]);
    if (directValue) {
      return directValue;
    }
  }

  const dotenvValues = await loadDotEnvValues();
  for (const key of keys) {
    const dotenvValue = trimToUndefined(dotenvValues[key]);
    if (dotenvValue) {
      return dotenvValue;
    }
  }
  return undefined;
}

async function readRelayTokenFromEnv(): Promise<string | undefined> {
  return await readEnvVar("OPENCLAW_RELAY_TOKEN", "WEB_ADAPTER_RELAY_TOKEN");
}

async function readGatewayTokenFromEnv(): Promise<string | undefined> {
  return await readEnvVar("OPENCLAW_GATEWAY_TOKEN", "CLAWDBOT_GATEWAY_TOKEN");
}

function deriveRelayAuthToken(gatewayToken: string, port: number): string {
  return createHmac("sha256", gatewayToken).update(`${RELAY_TOKEN_CONTEXT}:${port}`).digest("hex");
}

async function loadConfigFromInstalledOpenClaw(): Promise<unknown> {
  const specifier = "openclaw";
  try {
    const module = (await import(specifier)) as { loadConfig?: () => unknown };
    return typeof module.loadConfig === "function" ? module.loadConfig() : null;
  } catch {
    return null;
  }
}

function parseLooseConfig(raw: string): unknown {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }
  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    const relaxedJson = stripTrailingCommas(stripJsonComments(normalized)).trim();
    if (!relaxedJson) {
      return null;
    }
    try {
      return JSON.parse(relaxedJson) as unknown;
    } catch {
      return null;
    }
  }
}

function stripJsonComments(raw: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index] ?? "";
    const next = raw[index + 1] ?? "";

    if (inLineComment) {
      if (current === "\n" || current === "\r") {
        inLineComment = false;
        result += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      result += current;
      if (isEscaped) {
        isEscaped = false;
      } else if (current === "\\") {
        isEscaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }

    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }

    if (current === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (current === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    result += current;
  }

  return result;
}

function stripTrailingCommas(raw: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index] ?? "";

    if (inString) {
      result += current;
      if (isEscaped) {
        isEscaped = false;
      } else if (current === "\\") {
        isEscaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }

    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }

    if (current === ",") {
      let lookahead = index + 1;
      while (lookahead < raw.length && /\s/u.test(raw[lookahead] ?? "")) {
        lookahead += 1;
      }
      const next = raw[lookahead] ?? "";
      if (next === "}" || next === "]") {
        continue;
      }
    }

    result += current;
  }

  return result;
}

async function loadConfigFromFilesystem(): Promise<unknown> {
  for (const candidate of resolveConfigCandidatePaths()) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = parseLooseConfig(raw);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
    }
  }
  return null;
}

function readSecretDefaults(config: unknown): SecretDefaults {
  if (!isRecord(config) || !isRecord(config.secrets) || !isRecord(config.secrets.defaults)) {
    return {};
  }
  return {
    env: trimToUndefined(config.secrets.defaults.env),
    file: trimToUndefined(config.secrets.defaults.file),
    exec: trimToUndefined(config.secrets.defaults.exec),
  };
}

function resolveSecretRef(value: unknown, defaults: SecretDefaults): SecretRef | null {
  if (isRecord(value)) {
    const source = trimToUndefined(value.source);
    const provider = trimToUndefined(value.provider);
    const id = trimToUndefined(value.id);
    if ((source === "env" || source === "file" || source === "exec") && provider && id) {
      return { source, provider, id };
    }
  }

  if (typeof value !== "string") {
    return null;
  }
  const match = ENV_TEMPLATE_RE.exec(value.trim());
  if (!match) {
    return null;
  }
  return {
    source: "env",
    provider: defaults.env ?? "default",
    id: match[1],
  };
}

function resolveGatewayTokenInput(config: unknown): unknown {
  if (!isRecord(config) || !isRecord(config.gateway) || !isRecord(config.gateway.auth)) {
    return undefined;
  }
  return config.gateway.auth.token;
}

function resolveProviderConfig(config: unknown, ref: SecretRef): JsonRecord | undefined {
  if (!isRecord(config) || !isRecord(config.secrets) || !isRecord(config.secrets.providers)) {
    return undefined;
  }
  const provider = config.secrets.providers[ref.provider];
  return isRecord(provider) ? provider : undefined;
}

function parseAllowlist(provider: JsonRecord | undefined): Set<string> | null {
  if (!provider || !Array.isArray(provider.allowlist)) {
    return null;
  }
  const allowlist = provider.allowlist
    .map((entry) => trimToUndefined(entry))
    .filter((entry): entry is string => Boolean(entry));
  return allowlist.length > 0 ? new Set(allowlist) : null;
}

function readJsonPointerValue(payload: unknown, pointer: string): unknown {
  if (pointer === DEFAULT_FILE_REF_ID) {
    return payload;
  }
  if (!pointer.startsWith("/")) {
    return undefined;
  }
  const segments = pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = payload;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

async function resolveFileSecretRefValue(config: unknown, ref: SecretRef): Promise<unknown> {
  const provider = resolveProviderConfig(config, ref);
  if (!provider || trimToUndefined(provider.source) !== "file") {
    return undefined;
  }

  const providerPath = trimToUndefined(provider.path);
  if (!providerPath) {
    return undefined;
  }

  const raw = await fs.readFile(resolveUserPath(providerPath), "utf8");
  const mode = trimToUndefined(provider.mode) ?? "json";
  if (mode === "singleValue") {
    if (ref.id !== DEFAULT_FILE_REF_ID) {
      return undefined;
    }
    return raw.replace(/\r?\n$/, "");
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return readJsonPointerValue(parsed, ref.id);
  } catch {
    return undefined;
  }
}

function parseExecProviderResponse(params: {
  ids: string[];
  stdout: string;
  jsonOnly: boolean;
}): Record<string, unknown> | null {
  const trimmed = params.stdout.trim();
  if (!trimmed) {
    return null;
  }

  if (!params.jsonOnly && params.ids.length === 1) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === "string") {
        return { [params.ids[0]]: parsed };
      }
      if (!isRecord(parsed) || parsed.protocolVersion !== 1 || !isRecord(parsed.values)) {
        return null;
      }
      const values = parsed.values;
      return params.ids.reduce<Record<string, unknown>>((result, id) => {
        if (id in values) {
          result[id] = values[id];
        }
        return result;
      }, {});
    } catch {
      return { [params.ids[0]]: trimmed };
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed) || parsed.protocolVersion !== 1 || !isRecord(parsed.values)) {
      return null;
    }
    const values = parsed.values;
    return params.ids.reduce<Record<string, unknown>>((result, id) => {
      if (id in values) {
        result[id] = values[id];
      }
      return result;
    }, {});
  } catch {
    return null;
  }
}

async function resolveExecSecretRefValue(config: unknown, ref: SecretRef): Promise<unknown> {
  const provider = resolveProviderConfig(config, ref);
  if (!provider || trimToUndefined(provider.source) !== "exec") {
    return undefined;
  }

  const command = trimToUndefined(provider.command);
  if (!command) {
    return undefined;
  }

  const args = Array.isArray(provider.args)
    ? provider.args
        .map((entry) => trimToUndefined(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];
  const passEnv = Array.isArray(provider.passEnv)
    ? provider.passEnv
        .map((entry) => trimToUndefined(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];
  const inlineEnv = isRecord(provider.env)
    ? Object.fromEntries(
        Object.entries(provider.env)
          .map(([key, value]) => [key, trimToUndefined(value)])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      )
    : {};
  const timeoutMs =
    Number(provider.timeoutMs) > 0 ? Number(provider.timeoutMs) : DEFAULT_EXEC_TIMEOUT_MS;
  const maxOutputBytes =
    Number(provider.maxOutputBytes) > 0
      ? Number(provider.maxOutputBytes)
      : DEFAULT_EXEC_MAX_OUTPUT_BYTES;
  const jsonOnly = provider.jsonOnly !== false;

  const childEnv: NodeJS.ProcessEnv = {};
  for (const key of passEnv) {
    const envValue = await readEnvVar(key);
    if (envValue !== undefined) {
      childEnv[key] = envValue;
    }
  }
  Object.assign(childEnv, inlineEnv);

  const response = await new Promise<{ stdout: string; code: number | null } | null>((resolve) => {
    const child = spawn(resolveUserPath(command), args, {
      cwd: path.dirname(resolveUserPath(command)),
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      resolve(null);
    }, timeoutMs);

    const finish = (value: { stdout: string; code: number | null } | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const append = (chunk: Buffer | string, target: "stdout" | "stderr") => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      outputBytes += Buffer.byteLength(text, "utf8");
      if (outputBytes > maxOutputBytes) {
        child.kill("SIGKILL");
        finish(null);
        return;
      }
      if (target === "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
    };

    child.stdout?.on("data", (chunk) => append(chunk, "stdout"));
    child.stderr?.on("data", (chunk) => append(chunk, "stderr"));
    child.on("error", () => finish(null));
    child.on("close", (code) => {
      if (stderr && code !== 0) {
        finish(null);
        return;
      }
      finish({ stdout, code });
    });
    child.stdin?.end(
      JSON.stringify({
        protocolVersion: 1,
        provider: ref.provider,
        ids: [ref.id],
      }),
    );
  });

  if (!response || response.code !== 0) {
    return undefined;
  }
  const parsed = parseExecProviderResponse({
    ids: [ref.id],
    stdout: response.stdout,
    jsonOnly,
  });
  return parsed?.[ref.id];
}

async function resolveSecretRefValue(config: unknown, ref: SecretRef): Promise<unknown> {
  if (ref.source === "env") {
    const provider = resolveProviderConfig(config, ref);
    if (provider && trimToUndefined(provider.source) !== "env") {
      return undefined;
    }
    const allowlist = parseAllowlist(provider);
    if (allowlist && !allowlist.has(ref.id)) {
      return undefined;
    }
    return await readEnvVar(ref.id);
  }
  if (ref.source === "file") {
    return await resolveFileSecretRefValue(config, ref);
  }
  return await resolveExecSecretRefValue(config, ref);
}

async function resolveGatewayTokenFromConfig(config: unknown): Promise<string | undefined> {
  const tokenInput = resolveGatewayTokenInput(config);
  const defaults = readSecretDefaults(config);
  const ref = resolveSecretRef(tokenInput, defaults);
  if (ref) {
    return trimToUndefined(await resolveSecretRefValue(config, ref));
  }
  return trimToUndefined(tokenInput);
}

async function resolveGatewayAuthToken(): Promise<string | undefined> {
  const envGatewayToken = await readGatewayTokenFromEnv();
  if (envGatewayToken) {
    return envGatewayToken;
  }

  const installedConfig = await loadConfigFromInstalledOpenClaw();
  const envGatewayTokenAfterOpenClawImport = await readGatewayTokenFromEnv();
  if (envGatewayTokenAfterOpenClawImport) {
    return envGatewayTokenAfterOpenClawImport;
  }

  const installedConfigToken = await resolveGatewayTokenFromConfig(installedConfig);
  if (installedConfigToken) {
    return installedConfigToken;
  }

  return await resolveGatewayTokenFromConfig(await loadConfigFromFilesystem());
}

export async function resolveRelayAuthTokenForPort(port: number): Promise<string | undefined> {
  const explicitRelayToken = await readRelayTokenFromEnv();
  if (explicitRelayToken) {
    return explicitRelayToken;
  }

  const gatewayToken = await resolveGatewayAuthToken();
  if (!gatewayToken) {
    return undefined;
  }

  return deriveRelayAuthToken(gatewayToken, port);
}
