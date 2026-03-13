import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createAli1688FactorySearchAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  performAli1688FactorySearchAction: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanAli1688FactorySearchFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () =>
        "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
    } as unknown as Page,
    frame: {
      url: () =>
        "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
    } as unknown as Frame,
    targetId: "ali-factory-search",
    pageUrl:
      "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
    frameUrl:
      "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
    pageTitle: "工厂搜索 - 阿里巴巴",
  };
}

describe("ali1688 factory search adapter", () => {
  it("matches factory search pages", async () => {
    const adapter = createAli1688FactorySearchAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.98,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanAli1688FactorySearchFrame).mockResolvedValue({
      title: "工厂搜索 - 阿里巴巴",
      url: "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
      frameUrl:
        "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
      keyword: "注塑厂",
      items: [],
      pagination: {
        currentPage: 1,
        totalPages: 50,
      },
      health: {
        hasFactoryCards: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createAli1688FactorySearchAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "1688.com/factory-search",
      kind: "list",
      health: {
        ok: true,
      },
    });
  });

  it("performs click_item through the adapter contract", async () => {
    vi.mocked(actions.performAli1688FactorySearchAction).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl:
        "https://s.1688.com/company/pc/factory_search.htm?keywords=%E6%B3%A8%E5%A1%91%E5%8E%82",
      itemId: "936271302176",
    });
    const adapter = createAli1688FactorySearchAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "click_item",
        args: { itemId: "936271302176" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
      details: {
        itemId: "936271302176",
      },
    });
  });

  it("performs search_keyword through the adapter contract", async () => {
    vi.mocked(actions.performAli1688FactorySearchAction).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl: "https://s.1688.com/company/pc/factory_search.htm?keywords=%D7%A2%CB%DC%CD%E2%BF%C7",
    });
    const adapter = createAli1688FactorySearchAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "search_keyword",
        args: { keyword: "注塑外壳" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
    });
  });
});
