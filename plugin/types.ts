import type { IncomingMessage, ServerResponse } from "node:http";

export type PluginLoggerLike = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type CliCommandLike = {
  command: (nameAndArgs: string) => CliCommandLike;
  description: (text: string) => CliCommandLike;
  option: (flags: string, description?: string) => CliCommandLike;
  action: (handler: (options?: Record<string, unknown>) => void | Promise<void>) => CliCommandLike;
};

export type PluginServiceContextLike = {
  config: unknown;
  workspaceDir?: string;
  stateDir: string;
  logger: PluginLoggerLike;
};

export type OpenClawPluginApiLike = {
  pluginConfig?: unknown;
  config?: unknown;
  logger: PluginLoggerLike;
  registerCli: (
    register: (ctx: {
      program: CliCommandLike;
      config: unknown;
      workspaceDir?: string;
      logger: PluginLoggerLike;
    }) => void | Promise<void>,
    opts?: { commands?: string[] },
  ) => void;
  registerHttpRoute: (params: {
    path: string;
    auth: "gateway" | "plugin";
    match?: "exact" | "prefix";
    handler: (
      req: IncomingMessage,
      res: ServerResponse,
    ) => boolean | void | Promise<boolean | void>;
  }) => void;
  registerService: (service: {
    id: string;
    start: (ctx: PluginServiceContextLike) => void | Promise<void>;
    stop?: (ctx: PluginServiceContextLike) => void | Promise<void>;
  }) => void;
};
