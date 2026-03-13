export type WebAdapterPollerSnapshot = {
  active: boolean;
  inFlight: boolean;
  runCount: number;
  skippedWhileBusy: number;
  lastStartedAt: number | null;
  lastCompletedAt: number | null;
};

export function createWebAdapterPoller(params: {
  pollMs: number;
  runOnce: () => Promise<void>;
  onError?: (error: Error) => void;
  now?: () => number;
  scheduleInterval?: typeof setInterval;
  clearScheduledInterval?: typeof clearInterval;
}) {
  const now = params.now ?? Date.now;
  const scheduleInterval = params.scheduleInterval ?? setInterval;
  const clearScheduledInterval = params.clearScheduledInterval ?? clearInterval;

  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  let runCount = 0;
  let skippedWhileBusy = 0;
  let lastStartedAt: number | null = null;
  let lastCompletedAt: number | null = null;

  const tick = async (): Promise<boolean> => {
    if (inFlight) {
      skippedWhileBusy += 1;
      return false;
    }

    inFlight = true;
    lastStartedAt = now();
    try {
      await params.runOnce();
      runCount += 1;
      return true;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      params.onError?.(normalizedError);
      return false;
    } finally {
      inFlight = false;
      lastCompletedAt = now();
    }
  };

  const start = async (): Promise<void> => {
    if (!timer) {
      timer = scheduleInterval(() => {
        void tick();
      }, params.pollMs);
    }
    await tick();
  };

  const stop = (): void => {
    if (!timer) {
      return;
    }
    clearScheduledInterval(timer);
    timer = null;
  };

  const getSnapshot = (): WebAdapterPollerSnapshot => ({
    active: timer !== null,
    inFlight,
    runCount,
    skippedWhileBusy,
    lastStartedAt,
    lastCompletedAt,
  });

  return {
    getSnapshot,
    start,
    stop,
    tick,
  };
}
