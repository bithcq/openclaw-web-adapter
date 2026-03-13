import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createAli1688DetailAdapter } from "./adapter.js";
import * as scan from "./scan.js";

vi.mock("./scan.js", () => ({
  scanAli1688DetailFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://detail.1688.com/offer/1234567890.html",
    } as unknown as Page,
    frame: {
      url: () => "https://detail.1688.com/offer/1234567890.html",
    } as unknown as Frame,
    targetId: "ali-detail",
    pageUrl: "https://detail.1688.com/offer/1234567890.html",
    frameUrl: "https://detail.1688.com/offer/1234567890.html",
    pageTitle: "商品 - 阿里巴巴",
  };
}

describe("ali1688 detail adapter", () => {
  it("matches detail pages", async () => {
    const adapter = createAli1688DetailAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.97,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanAli1688DetailFrame).mockResolvedValue({
      title: "商品 - 阿里巴巴",
      url: "https://detail.1688.com/offer/1234567890.html",
      frameUrl: "https://detail.1688.com/offer/1234567890.html",
      productTitle: "商品",
      companyName: "供应商",
      priceText: "¥1.90",
      soldText: "已售10万+个",
      skuHighlights: [],
      attributes: {},
      imageUrls: [],
      health: {
        hasTitle: true,
        hasPrice: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createAli1688DetailAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "1688.com/detail",
      kind: "detail",
      health: {
        ok: true,
      },
      payload: {
        productTitle: "商品",
      },
    });
  });
});
