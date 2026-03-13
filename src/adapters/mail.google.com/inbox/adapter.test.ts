import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailGoogleInboxAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  clickMailGoogleInboxItem: vi.fn(),
  goToNextMailGoogleInboxPage: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailGoogleInboxFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.google.com/mail/u/0/#inbox",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.google.com/mail/u/0/#inbox",
    } as unknown as Frame,
    targetId: "gmail-inbox",
    pageUrl: "https://mail.google.com/mail/u/0/#inbox",
    frameUrl: "https://mail.google.com/mail/u/0/#inbox",
    pageTitle: "收件箱 (558) - everhcq@gmail.com - Gmail",
  };
}

describe("mail.google inbox adapter", () => {
  it("matches inbox pages", async () => {
    const adapter = createMailGoogleInboxAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.96,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailGoogleInboxFrame).mockResolvedValue({
      title: "收件箱 (558) - everhcq@gmail.com - Gmail",
      url: "https://mail.google.com/mail/u/0/#inbox",
      frameUrl: "https://mail.google.com/mail/u/0/#inbox",
      folder: {
        folderId: "inbox",
        folderName: "收件箱",
        unreadCount: 558,
        visibleItemCount: 50,
      },
      pagination: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
      items: [],
      health: {
        hasMailList: true,
        hasToolbar: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createMailGoogleInboxAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.google.com/inbox",
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
    vi.mocked(actions.clickMailGoogleInboxItem).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
      threadId: "#thread-f:123",
    });
    const adapter = createMailGoogleInboxAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "click_item",
        args: { threadId: "#thread-f:123" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
      details: {
        threadId: "#thread-f:123",
      },
    });
  });

  it("returns unsupported_action for unsupported operations", async () => {
    const adapter = createMailGoogleInboxAdapter();

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
