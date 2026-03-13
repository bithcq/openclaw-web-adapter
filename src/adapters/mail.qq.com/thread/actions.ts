import type { Frame } from "playwright-core";
import type { MailQqThreadActionResult } from "./types.js";

async function fillQuickReply(frame: Frame, text: string): Promise<boolean> {
  const composer = frame.locator("#source");
  if ((await composer.count()) === 0) {
    return false;
  }
  await composer.fill(text);
  return true;
}

export async function focusMailQqThreadComposer(frame: Frame): Promise<MailQqThreadActionResult> {
  const composer = frame.locator("#source");
  if ((await composer.count()) === 0) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "reply_composer_unavailable",
    };
  }
  await composer.click();
  return {
    ok: true,
    confirmed: true,
    frameUrl: frame.url(),
  };
}

export async function inputMailQqThreadText(
  frame: Frame,
  text: string,
): Promise<MailQqThreadActionResult> {
  if (!text.trim()) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "missing_text",
    };
  }
  const filled = await fillQuickReply(frame, text);
  return {
    ok: filled,
    confirmed: filled,
    frameUrl: frame.url(),
    error: filled ? undefined : "reply_composer_unavailable",
  };
}

export async function sendMailQqThreadText(
  frame: Frame,
  text: string,
): Promise<MailQqThreadActionResult> {
  if (!text.trim()) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "missing_text",
    };
  }
  const filled = await fillQuickReply(frame, text);
  if (!filled) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "reply_composer_unavailable",
    };
  }

  const sendButton = frame.locator("#sendbtn");
  if ((await sendButton.count()) === 0) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "send_button_missing",
    };
  }

  await sendButton.click();
  let confirmed = false;
  try {
    await frame.waitForFunction(
      new Function(
        `
          return /此邮件已成功发送|邮件已成功发送/u.test(document.body?.innerText || "");
        `,
      ) as () => boolean,
      undefined,
      { timeout: 8_000 },
    );
    confirmed = true;
  } catch {
    confirmed = false;
  }

  return {
    ok: true,
    confirmed,
    frameUrl: frame.url(),
    error: confirmed ? undefined : "send_not_confirmed",
  };
}
