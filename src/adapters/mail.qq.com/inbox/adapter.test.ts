import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailQqInboxAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  clickMailQqInboxItem: vi.fn(),
  goToNextMailQqInboxPage: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailQqInboxFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.qq.com/cgi-bin/mail_list?sid=test&folderid=1&page=0&s=inbox",
    } as unknown as Frame,
    targetId: "qq-mail-inbox",
    pageUrl: "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    frameUrl: "https://mail.qq.com/cgi-bin/mail_list?sid=test&folderid=1&page=0&s=inbox",
    pageTitle: "QQ邮箱 - 收件箱",
  };
}

describe("mail.qq inbox adapter", () => {
  it("matches inbox list frames", async () => {
    const adapter = createMailQqInboxAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.99,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailQqInboxFrame).mockResolvedValue({
      title: "QQ邮箱 - 收件箱",
      url: "https://mail.qq.com/cgi-bin/mail_list?folderid=1",
      frameUrl: "https://mail.qq.com/cgi-bin/mail_list?folderid=1",
      folder: {
        folderId: "1",
        folderName: "收件箱",
        totalCount: 2165,
        unreadCount: 101,
      },
      pagination: {
        currentPage: 1,
        totalPages: 87,
        hasNextPage: true,
        nextPageUrl: "https://mail.qq.com/cgi-bin/mail_list?folderid=1&page=1",
      },
      items: [],
      health: {
        hasMailList: true,
        hasToolbar: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createMailQqInboxAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.qq.com/inbox",
      kind: "list",
      health: {
        ok: true,
        isLoggedIn: true,
        domHealthy: true,
      },
      payload: {
        folder: {
          folderName: "收件箱",
        },
      },
    });
  });

  it("performs click_item through the adapter contract", async () => {
    vi.mocked(actions.clickMailQqInboxItem).mockResolvedValue({
      ok: true,
      confirmed: true,
      frameUrl: "https://mail.qq.com/cgi-bin/readmail?mailid=123",
      mailId: "123",
    });
    const adapter = createMailQqInboxAdapter();

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
        mailId: "123",
      },
    });
  });

  it("returns unsupported_action for unsupported operations", async () => {
    const adapter = createMailQqInboxAdapter();

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
