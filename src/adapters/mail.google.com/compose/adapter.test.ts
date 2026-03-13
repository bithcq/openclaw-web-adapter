import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailGoogleComposeAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  focusMailGoogleComposeEditor: vi.fn(),
  inputMailGoogleComposeText: vi.fn(),
  sendMailGoogleComposeDraft: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailGoogleComposeFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.google.com/mail/u/0/#inbox?compose=new",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.google.com/mail/u/0/#inbox?compose=new",
    } as unknown as Frame,
    targetId: "gmail-compose",
    pageUrl: "https://mail.google.com/mail/u/0/#inbox?compose=new",
    frameUrl: "https://mail.google.com/mail/u/0/#inbox?compose=new",
    pageTitle: "收件箱 - Gmail",
  };
}

describe("mail.google compose adapter", () => {
  it("matches compose pages", async () => {
    const adapter = createMailGoogleComposeAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.99,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailGoogleComposeFrame).mockResolvedValue({
      title: "收件箱 - Gmail",
      url: "https://mail.google.com/mail/u/0/#inbox?compose=new",
      frameUrl: "https://mail.google.com/mail/u/0/#inbox?compose=new",
      recipients: ["57476661@qq.com"],
      subject: "hello",
      bodyText: "world",
      composerVisible: true,
      sendEnabled: true,
      health: {
        hasComposer: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createMailGoogleComposeAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.google.com/compose",
      kind: "form",
      health: {
        ok: true,
        isLoggedIn: true,
        domHealthy: true,
      },
      payload: {
        recipients: ["57476661@qq.com"],
      },
    });
  });

  it("performs send_text through the adapter contract", async () => {
    vi.mocked(actions.sendMailGoogleComposeDraft).mockResolvedValue({
      ok: true,
      confirmed: true,
      pageUrl: "https://mail.google.com/mail/u/0/#inbox",
      recipientCount: 1,
    });
    const adapter = createMailGoogleComposeAdapter();

    await expect(
      adapter.perform(createTarget(), {
        action: "send_text",
        args: { to: "57476661@qq.com", text: "hello" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      confirmed: true,
      attempt: 1,
      details: {
        recipientCount: 1,
      },
    });
  });
});
