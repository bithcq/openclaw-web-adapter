import { describe, expect, it } from "vitest";
import { WebAdapterHealthState } from "./health-state.js";

describe("web adapter runtime health state", () => {
  it("stores scan state and error state in a health snapshot", () => {
    const health = new WebAdapterHealthState();

    health.updateScan({
      ok: false,
      reason: "target_not_found",
    });
    health.setError(new Error("page_unhealthy"));

    expect(
      health.buildSnapshot({
        listenPort: 18888,
      }),
    ).toEqual({
      ok: true,
      listenPort: 18888,
      lastScan: {
        ok: false,
        reason: "target_not_found",
      },
      lastError: "Error: page_unhealthy",
    });

    health.clearError();
    expect(health.getLastError()).toBeNull();
  });
});
