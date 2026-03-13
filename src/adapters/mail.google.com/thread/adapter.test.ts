import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailGoogleThreadAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  focusMailGoogleThreadComposer: vi.fn(),
  inputMailGoogleThreadText: vi.fn(),
  sendMailGoogleThreadText: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailGoogleThreadFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
    } as unknown as Frame,
    targetId: "gmail-thread",
    pageUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
    frameUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
    pageTitle: "主题 - Gmail",
  };
}

describe("mail.google thread adapter", () => {
  it("matches gmail thread pages", async () => {
    const adapter = createMailGoogleThreadAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.98,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailGoogleThreadFrame).mockResolvedValue({
      title: "主题 - Gmail",
      url: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
      frameUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
      subject: "主题",
      messages: [],
      replyAvailable: true,
      composerVisible: false,
      health: {
        hasThreadSubject: true,
        hasMessages: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createMailGoogleThreadAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.google.com/thread",
      kind: "detail",
      health: {
        ok: true,
        isLoggedIn: true,
        domHealthy: true,
      },
      payload: {
        subject: "主题",
      },
    });
  });

  it("performs send_text through the adapter contract", async () => {
    vi.mocked(actions.sendMailGoogleThreadText).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgzQf123",
    });
    const adapter = createMailGoogleThreadAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "send_text",
        args: { text: "hello" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
    });
  });
});
