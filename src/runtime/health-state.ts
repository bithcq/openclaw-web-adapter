export class WebAdapterHealthState<Scan extends Record<string, unknown>> {
  private lastScan: Record<string, unknown> = {};
  private lastError: string | null = null;

  updateScan(scan: Scan | Record<string, unknown>): void {
    this.lastScan = scan;
  }

  setError(error: unknown): void {
    this.lastError = String(error);
  }

  clearError(): void {
    this.lastError = null;
  }

  getLastScan(): Record<string, unknown> {
    return this.lastScan;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  buildSnapshot(extra: Record<string, unknown>): Record<string, unknown> {
    return {
      ok: true,
      ...extra,
      lastScan: this.lastScan,
      lastError: this.lastError,
    };
  }
}
