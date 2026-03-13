import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createAli1688SearchAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  openAli1688SearchItem: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanAli1688SearchFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
    } as unknown as Page,
    frame: {
      url: () => "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
    } as unknown as Frame,
    targetId: "ali-search",
    pageUrl: "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
    frameUrl: "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
    pageTitle: "纸箱 - 阿里巴巴",
  };
}

describe("ali1688 search adapter", () => {
  it("matches search pages", async () => {
    const adapter = createAli1688SearchAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.97,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanAli1688SearchFrame).mockResolvedValue({
      title: "纸箱 - 阿里巴巴",
      url: "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
      frameUrl: "https://s.1688.com/selloffer/offer_search.htm?keywords=纸箱",
      keyword: "纸箱",
      items: [],
      health: {
        hasResultList: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createAli1688SearchAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "1688.com/search",
      kind: "list",
      health: {
        ok: true,
      },
    });
  });

  it("performs click_item through the adapter contract", async () => {
    vi.mocked(actions.openAli1688SearchItem).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl: "https://detail.1688.com/offer/123.html",
      productUrl: "https://detail.1688.com/offer/123.html",
    });
    const adapter = createAli1688SearchAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "click_item",
        args: { itemId: "123" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
      details: {
        productUrl: "https://detail.1688.com/offer/123.html",
      },
    });
  });
});
