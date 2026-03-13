import { describe, expect, it, vi } from "vitest";
import { createWebAdapterPoller } from "./poller.js";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });
  return {
    promise,
    resolve,
  };
}

describe("web adapter runtime poller", () => {
  it("runs immediately, then continues on the interval without overlap", async () => {
    vi.useFakeTimers();
    try {
      const first = createDeferred();
      const second = createDeferred();
      const runOnce = vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);
      const poller = createWebAdapterPoller({
        pollMs: 1_000,
        runOnce,
        now: () => vi.getMockedSystemTime()?.getTime() ?? 0,
      });

      const started = poller.start();
      expect(runOnce).toHaveBeenCalledTimes(1);
      expect(poller.getSnapshot().inFlight).toBe(true);

      await vi.advanceTimersByTimeAsync(1_000);
      expect(runOnce).toHaveBeenCalledTimes(1);
      expect(poller.getSnapshot().skippedWhileBusy).toBe(1);

      first.resolve();
      await started;
      expect(poller.getSnapshot().runCount).toBe(1);

      await vi.advanceTimersByTimeAsync(1_000);
      expect(runOnce).toHaveBeenCalledTimes(2);

      second.resolve();
      await Promise.resolve();

      expect(poller.getSnapshot()).toMatchObject({
        active: true,
        inFlight: false,
        runCount: 2,
        skippedWhileBusy: 1,
      });

      poller.stop();
      expect(poller.getSnapshot().active).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports errors and keeps the poller alive", async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      const runOnce = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce();
      const poller = createWebAdapterPoller({
        pollMs: 500,
        runOnce,
        onError,
        now: () => vi.getMockedSystemTime()?.getTime() ?? 0,
      });

      await poller.start();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
      expect(poller.getSnapshot()).toMatchObject({
        active: true,
        runCount: 0,
      });

      await vi.advanceTimersByTimeAsync(500);
      expect(runOnce).toHaveBeenCalledTimes(2);
      expect(poller.getSnapshot().runCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
