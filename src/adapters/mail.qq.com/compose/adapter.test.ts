import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailQqComposeAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  focusMailQqComposeEditor: vi.fn(),
  inputMailQqComposeText: vi.fn(),
  sendMailQqComposeDraft: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailQqComposeFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.qq.com/cgi-bin/readtemplate?sid=test&t=compose&ver=0502&s=cnew",
    } as unknown as Frame,
    targetId: "qq-mail-compose",
    pageUrl: "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    frameUrl: "https://mail.qq.com/cgi-bin/readtemplate?sid=test&t=compose&ver=0502&s=cnew",
    pageTitle: "QQ邮箱 - 写信",
  };
}

describe("mail.qq compose adapter", () => {
  it("matches compose frames", async () => {
    const adapter = createMailQqComposeAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.99,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailQqComposeFrame).mockResolvedValue({
      title: "QQ邮箱 - 写信",
      url: "https://mail.qq.com/cgi-bin/readtemplate?sid=test&t=compose",
      frameUrl: "https://mail.qq.com/cgi-bin/readtemplate?sid=test&t=compose",
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
    const adapter = createMailQqComposeAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.qq.com/compose",
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
    vi.mocked(actions.sendMailQqComposeDraft).mockResolvedValue({
      ok: true,
      confirmed: true,
      frameUrl: "https://mail.qq.com/cgi-bin/readtemplate?sid=test&t=compose",
      recipientCount: 1,
    });
    const adapter = createMailQqComposeAdapter();

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
