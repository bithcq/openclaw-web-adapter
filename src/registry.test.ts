import { describe, expect, it } from "vitest";
import type { WebAdapterTargetContext, WebPageAdapter } from "./contracts.js";
import { WebAdapterRegistry } from "./registry.js";

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

function createAdapter(params: {
  id: string;
  matched: boolean;
  confidence: number;
}): WebPageAdapter {
  return {
    id: params.id,
    kind: "detail",
    async match() {
      return {
        matched: params.matched,
        confidence: params.confidence,
      };
    },
    describeCapabilities() {
      return [];
    },
    async scan() {
      throw new Error("not_used");
    },
    async perform() {
      throw new Error("not_used");
    },
  };
}

describe("web adapter registry", () => {
  it("selects the highest-confidence matched adapter", async () => {
    const registry = new WebAdapterRegistry();
    registry.register(createAdapter({ id: "low", matched: true, confidence: 0.4 }));
    registry.register(createAdapter({ id: "high", matched: true, confidence: 0.9 }));

    const selected = await registry.selectBestMatch(createTarget());

    expect(selected?.adapter.id).toBe("high");
    expect(selected?.match.confidence).toBe(0.9);
  });

  it("returns null when no adapter matches", async () => {
    const registry = new WebAdapterRegistry();
    registry.register(createAdapter({ id: "miss", matched: false, confidence: 0 }));

    await expect(registry.selectBestMatch(createTarget())).resolves.toBeNull();
  });

  it("rejects duplicate adapter ids", () => {
    const registry = new WebAdapterRegistry();
    registry.register(createAdapter({ id: "dup", matched: true, confidence: 0.5 }));

    expect(() =>
      registry.register(createAdapter({ id: "dup", matched: true, confidence: 0.8 })),
    ).toThrow(/adapter_already_registered:dup/);
  });
});
