import { describe, expect, it, vi } from "vitest";
import webAdapterPlugin from "./index.js";

function createProgramMock() {
  const chain = {
    command: vi.fn(),
    description: vi.fn(),
    option: vi.fn(),
    action: vi.fn(),
  };
  chain.command.mockReturnValue(chain);
  chain.description.mockReturnValue(chain);
  chain.option.mockReturnValue(chain);
  chain.action.mockReturnValue(chain);
  return chain;
}

describe("web adapter plugin", () => {
  it("registers a service, routes, and cli commands", () => {
    const api = {
      pluginConfig: {},
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      registerService: vi.fn(),
      registerHttpRoute: vi.fn(),
      registerCli: vi.fn(),
    };

    webAdapterPlugin.register(api);

    expect(api.registerService).toHaveBeenCalledTimes(1);
    expect(api.registerHttpRoute).toHaveBeenCalledTimes(3);
    expect(api.registerHttpRoute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: "/plugins/web-adapter/catalog",
        auth: "gateway",
      }),
    );
    expect(api.registerHttpRoute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: "/plugins/web-adapter/status",
        auth: "gateway",
      }),
    );
    expect(api.registerHttpRoute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        path: "/plugins/web-adapter/watchers",
        auth: "gateway",
      }),
    );
    expect(api.registerCli).toHaveBeenCalledWith(expect.any(Function), {
      commands: ["web-adapter"],
    });
  });

  it("wires the CLI subcommands", () => {
    const program = createProgramMock();
    const api = {
      pluginConfig: {},
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      registerService: vi.fn(),
      registerHttpRoute: vi.fn(),
      registerCli: vi.fn((register) =>
        register({
          program,
          config: {},
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        }),
      ),
    };

    webAdapterPlugin.register(api);

    expect(program.command).toHaveBeenCalledWith("web-adapter");
    expect(program.command).toHaveBeenCalledWith("status");
    expect(program.command).toHaveBeenCalledWith("catalog");
    expect(program.command).toHaveBeenCalledWith("watchers");
  });
});
