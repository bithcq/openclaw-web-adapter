import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createAli1688ChatAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  selectAli1688Conversation: vi.fn(),
  sendAli1688Text: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanAli1688ChatFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://air.1688.com/app/ocms-fusion-components-1688/def_cbu_web_im/index.html",
    } as unknown as Page,
    frame: {
      url: () =>
        "https://air.1688.com/app/ocms-fusion-components-1688/def_cbu_web_im_core/index.html",
    } as unknown as Frame,
    targetId: "target-1",
    pageUrl: "https://air.1688.com/app/ocms-fusion-components-1688/def_cbu_web_im/index.html",
    frameUrl: "https://air.1688.com/app/ocms-fusion-components-1688/def_cbu_web_im_core/index.html",
    pageTitle: "1688 Chat",
  };
}

describe("ali1688 chat adapter", () => {
  it("matches ali1688 chat pages by page and frame url", async () => {
    const adapter = createAli1688ChatAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.98,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanAli1688ChatFrame).mockResolvedValue({
      title: "1688 Chat",
      url: "https://air.1688.com/page",
      frameUrl: "https://air.1688.com/frame",
      activeConversationId: "conv-1",
      conversations: [],
      messages: [],
      health: {
        hasConversationList: true,
        hasMessageList: true,
        hasComposer: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createAli1688ChatAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "1688.com/chat",
      kind: "chat",
      health: {
        ok: true,
        isLoggedIn: true,
        domHealthy: true,
      },
      payload: {
        activeConversationId: "conv-1",
      },
    });
  });

  it("performs select_conversation through the adapter contract", async () => {
    vi.mocked(actions.selectAli1688Conversation).mockResolvedValue(true);
    const adapter = createAli1688ChatAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "select_conversation",
        args: { conversationId: "conv-1" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
    });
  });

  it("returns unsupported_action for unsupported operations", async () => {
    const adapter = createAli1688ChatAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "open_link",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: "unsupported_action",
    });
  });
});
