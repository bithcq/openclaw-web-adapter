import { EventEmitter } from "node:events";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseWebAdapterPluginConfig } from "./config.js";
import { WebAdapterNativeRuntime } from "./native-runtime.js";

class FakeChildProcess extends EventEmitter {
  pid?: number;
  killed = false;
  exitCode: number | null = null;
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();

  constructor(pid: number) {
    super();
    this.pid = pid;
  }

  kill(): boolean {
    this.killed = true;
    this.exitCode = 0;
    this.emit("exit", 0, null);
    return true;
  }
}

describe("web adapter native runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("spawns a native watcher for supported adapters", async () => {
    const spawns: Array<{ command: string; args: string[] }> = [];
    const runtime = new WebAdapterNativeRuntime({
      packageRoot: "/repo",
      stateDir: "/state",
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      spawnImpl: (command, args) => {
        spawns.push({ command, args });
        return new FakeChildProcess(4321) as never;
      },
    });

    await runtime.start(
      parseWebAdapterPluginConfig({
        installMode: "native",
        watchers: [
          {
            id: "ali1688-main",
            adapterId: "1688.com/chat",
            pluginEventsPath: "/plugins/ali1688/events",
          },
        ],
      }),
    );

    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.command).toBe(process.execPath);
    expect(spawns[0]?.args).toContain("jiti/register");
    expect(spawns[0]?.args).toContain("/repo/src/adapters/1688.com/chat/runner.ts");
    expect(runtime.getSnapshots()).toEqual([
      expect.objectContaining({
        id: "ali1688-main",
        adapterId: "1688.com/chat",
        state: "running",
        pid: 4321,
        pluginEventsUrl: "http://127.0.0.1:18789/plugins/ali1688/events",
      }),
    ]);
  });

  it("restarts watchers after unexpected exits", async () => {
    vi.useFakeTimers();
    const children: FakeChildProcess[] = [];
    const runtime = new WebAdapterNativeRuntime({
      packageRoot: "/repo",
      stateDir: "/state",
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      spawnImpl: () => {
        const child = new FakeChildProcess(1000 + children.length);
        children.push(child);
        return child as never;
      },
    });

    await runtime.start(
      parseWebAdapterPluginConfig({
        installMode: "native",
        watchers: [
          {
            id: "ali1688-main",
            adapterId: "1688.com/chat",
            pluginEventsPath: "/plugins/ali1688/events",
          },
        ],
      }),
    );

    children[0]?.emit("exit", 1, null);
    expect(runtime.getSnapshots()[0]?.state).toBe("restarting");

    await vi.advanceTimersByTimeAsync(1_000);

    expect(children).toHaveLength(2);
    expect(runtime.getSnapshots()[0]).toEqual(
      expect.objectContaining({
        state: "running",
        restartCount: 1,
        pid: 1001,
      }),
    );
  });

  it("marks unsupported watchers as error without spawning", async () => {
    const spawnImpl = vi.fn();
    const runtime = new WebAdapterNativeRuntime({
      packageRoot: "/repo",
      stateDir: "/state",
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      spawnImpl,
    });

    await runtime.start(
      parseWebAdapterPluginConfig({
        installMode: "native",
        watchers: [
          {
            id: "gmail-thread",
            adapterId: "mail.google.com/thread",
            pluginEventsPath: "/plugins/gmail/events",
          },
        ],
      }),
    );

    expect(spawnImpl).not.toHaveBeenCalled();
    expect(runtime.getSnapshots()).toEqual([
      expect.objectContaining({
        id: "gmail-thread",
        state: "error",
        lastError: "Error: unsupported_native_watcher_adapter:mail.google.com/thread",
      }),
    ]);
  });
});
