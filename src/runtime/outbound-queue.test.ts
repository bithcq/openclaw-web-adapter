import { describe, expect, it, vi } from "vitest";
import { WebAdapterOutboundQueue } from "./outbound-queue.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

describe("web adapter runtime outbound queue", () => {
  it("runs outbound requests serially and marks them sent", async () => {
    const first = createDeferred<{ ok: true }>();
    const second = createDeferred<{ ok: true }>();
    const execute = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const queue = new WebAdapterOutboundQueue({
      timeoutMs: 5_000,
      execute,
    });

    const firstSend = queue.enqueue({ idempotencyKey: "first" });
    const secondSend = queue.enqueue({ idempotencyKey: "second" });

    expect(queue.getStatus("first")).toBe("pending");
    expect(queue.getStatus("second")).toBe("pending");
    expect(execute).toHaveBeenCalledTimes(1);

    first.resolve({ ok: true });
    await expect(firstSend).resolves.toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(2);

    second.resolve({ ok: true });
    await expect(secondSend).resolves.toEqual({ ok: true });

    expect(queue.getStatus("first")).toBe("sent");
    expect(queue.getStatus("second")).toBe("sent");
  });

  it("clears timed-out jobs and ignores late success", async () => {
    vi.useFakeTimers();
    try {
      const deferred = createDeferred<{ ok: true }>();
      const queue = new WebAdapterOutboundQueue({
        timeoutMs: 1_000,
        execute: vi.fn().mockImplementation(() => deferred.promise),
      });

      const pending = queue.enqueue({ idempotencyKey: "late" });
      const handledError = pending.then(
        () => null,
        (error) => error,
      );
      await vi.advanceTimersByTimeAsync(1_001);

      await expect(handledError).resolves.toMatchObject({
        message: "send_timeout",
      });
      expect(queue.getStatus("late")).toBeUndefined();

      deferred.resolve({ ok: true });
      await Promise.resolve();
      expect(queue.getStatus("late")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
