import type { Frame, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { createMailQqThreadAdapter } from "./adapter.js";
import * as actions from "./actions.js";
import * as scan from "./scan.js";

vi.mock("./actions.js", () => ({
  focusMailQqThreadComposer: vi.fn(),
  inputMailQqThreadText: vi.fn(),
  sendMailQqThreadText: vi.fn(),
}));

vi.mock("./scan.js", () => ({
  scanMailQqThreadFrame: vi.fn(),
}));

function createTarget() {
  return {
    page: {
      url: () => "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    } as unknown as Page,
    frame: {
      url: () => "https://mail.qq.com/cgi-bin/readmail?mailid=123",
    } as unknown as Frame,
    targetId: "qq-mail-thread",
    pageUrl: "https://mail.qq.com/cgi-bin/frame_html?sid=test&r=1&lang=zh",
    frameUrl: "https://mail.qq.com/cgi-bin/readmail?mailid=123",
    pageTitle: "主题 - QQ邮箱",
  };
}

describe("mail.qq thread adapter", () => {
  it("matches readmail frames", async () => {
    const adapter = createMailQqThreadAdapter();

    await expect(adapter.match(createTarget())).resolves.toMatchObject({
      matched: true,
      confidence: 0.98,
    });
  });

  it("wraps scan output into the generic snapshot contract", async () => {
    vi.mocked(scan.scanMailQqThreadFrame).mockResolvedValue({
      title: "主题 - QQ邮箱",
      url: "https://mail.qq.com/cgi-bin/readmail?mailid=123",
      frameUrl: "https://mail.qq.com/cgi-bin/readmail?mailid=123",
      subject: "主题",
      sender: "sender",
      recipients: ["57476661@qq.com"],
      timeText: "2026年3月13日",
      bodyText: "hello",
      quickReplyAvailable: true,
      health: {
        hasSubject: true,
        hasBody: true,
        isLoggedIn: true,
        domHealthy: true,
      },
    });
    const adapter = createMailQqThreadAdapter();

    await expect(adapter.scan(createTarget())).resolves.toMatchObject({
      adapterId: "mail.qq.com/thread",
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
    vi.mocked(actions.sendMailQqThreadText).mockResolvedValue({
      ok: true,
      confirmed: true,
      frameUrl: "https://mail.qq.com/cgi-bin/readmail?mailid=123",
    });
    const adapter = createMailQqThreadAdapter();

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
