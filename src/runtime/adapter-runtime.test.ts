import { describe, expect, it } from "vitest";
import type { WebAdapterTargetContext, WebPageAdapter } from "../contracts.js";
import { WebAdapterRegistry } from "../registry.js";
import { performWithBestAdapter, scanWithBestAdapter } from "./adapter-runtime.js";

function createTarget(overrides: Partial<WebAdapterTargetContext> = {}): WebAdapterTargetContext {
  return {
    page: {} as WebAdapterTargetContext["page"],
    frame: {} as WebAdapterTargetContext["frame"],
    targetId: "target-1",
    pageUrl: "https://example.com/page",
    frameUrl: "https://example.com/frame",
    pageTitle: "Example",
    ...overrides,
  };
}

function createAdapter(): WebPageAdapter {
  return {
    id: "example",
    kind: "detail",
    async match() {
      return {
        matched: true,
        confidence: 0.8,
      };
    },
    describeCapabilities() {
      return [];
    },
    async scan(target) {
      return {
        adapterId: "example",
        kind: "detail",
        capturedAt: 1,
        target: {
          targetId: target.targetId,
          pageUrl: target.pageUrl,
          frameUrl: target.frameUrl,
          pageTitle: target.pageTitle,
        },
        health: { ok: true },
        payload: { ok: true },
      };
    },
    async perform(_target, request) {
      return {
        ok: true,
        confirmed: true,
        attempt: 1,
        details: { action: request.action },
      };
    },
  };
}

describe("web adapter runtime", () => {
  it("scans via the best matched adapter", async () => {
    const registry = new WebAdapterRegistry();
    registry.register(createAdapter());

    await expect(scanWithBestAdapter(registry, createTarget())).resolves.toMatchObject({
      adapterId: "example",
      payload: { ok: true },
    });
  });

  it("returns unsupported_page for unknown targets on perform", async () => {
    const registry = new WebAdapterRegistry();

    await expect(
      performWithBestAdapter(registry, createTarget(), {
        action: "open_link",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: "unsupported_page",
    });
  });
});
