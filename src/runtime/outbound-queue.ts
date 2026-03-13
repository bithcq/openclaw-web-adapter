export type WebAdapterOutboundStatus = "pending" | "sent";

type QueuedOutboundJob<Request, Result> = {
  request: Request;
  resolve: (value: Result) => void;
  reject: (error: Error) => void;
};

export class WebAdapterOutboundQueue<Request extends { idempotencyKey: string }, Result> {
  private readonly execute: (request: Request) => Promise<Result>;
  private readonly onError?: (error: Error, request: Request) => void;
  private readonly queue: Array<QueuedOutboundJob<Request, Result>> = [];
  private readonly status = new Map<string, WebAdapterOutboundStatus>();
  private readonly timeoutMs: number;
  private draining = false;

  constructor(params: {
    timeoutMs: number;
    execute: (request: Request) => Promise<Result>;
    onError?: (error: Error, request: Request) => void;
  }) {
    this.timeoutMs = params.timeoutMs;
    this.execute = params.execute;
    this.onError = params.onError;
  }

  getStatus(idempotencyKey: string): WebAdapterOutboundStatus | undefined {
    return this.status.get(idempotencyKey);
  }

  getQueuedCount(): number {
    return this.queue.length;
  }

  isDraining(): boolean {
    return this.draining;
  }

  async enqueue(request: Request): Promise<Result> {
    this.status.set(request.idempotencyKey, "pending");

    const promise = new Promise<Result>((resolve, reject) => {
      let settled = false;
      const settleResolve = (value: Result) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const settleReject = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(() => {
        this.status.delete(request.idempotencyKey);
        settleReject(new Error("send_timeout"));
      }, this.timeoutMs);

      this.queue.push({
        request,
        resolve: settleResolve,
        reject: settleReject,
      });
    });

    void this.drain();
    return await promise;
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) {
          break;
        }

        try {
          const result = await this.execute(job.request);
          if (this.status.get(job.request.idempotencyKey) === "pending") {
            this.status.set(job.request.idempotencyKey, "sent");
          }
          job.resolve(result);
        } catch (error) {
          this.status.delete(job.request.idempotencyKey);
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          this.onError?.(normalizedError, job.request);
          job.reject(normalizedError);
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
