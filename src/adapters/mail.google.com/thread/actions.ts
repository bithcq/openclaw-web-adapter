import type { Locator, Page } from "playwright-core";
import type { MailGoogleThreadActionResult } from "./types.js";

function replyButtonSelector() {
  return "[role='button'][aria-label='回复'], [role='button'][aria-label='Reply']";
}

function sendButtonSelector() {
  return "[role='button'][aria-label^='发送'], [role='button'][aria-label^='Send']";
}

function editorSelector() {
  return "div[role='textbox'][aria-label='邮件正文'], div[role='textbox'][aria-label='Message Body']";
}

async function ensureReplyComposer(page: Page): Promise<Locator | null> {
  const editor = page.locator(editorSelector()).last();
  if ((await editor.count()) > 0) {
    return editor;
  }
  const replyButton = page.locator(replyButtonSelector()).first();
  if ((await replyButton.count()) === 0) {
    return null;
  }
  await replyButton.click();
  const openedEditor = page.locator(editorSelector()).last();
  await openedEditor.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  return (await openedEditor.count()) > 0 ? openedEditor : null;
}

async function fillReplyBody(page: Page, text: string): Promise<boolean> {
  const editor = await ensureReplyComposer(page);
  if (!editor) {
    return false;
  }
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A").catch(() => undefined);
  await page.keyboard.press("Backspace").catch(() => undefined);
  await editor.fill(text);
  return true;
}

export async function focusMailGoogleThreadComposer(
  page: Page,
): Promise<MailGoogleThreadActionResult> {
  const editor = await ensureReplyComposer(page);
  if (!editor) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "reply_composer_unavailable",
    };
  }
  await editor.click();
  return {
    ok: true,
    confirmed: true,
    pageUrl: page.url(),
  };
}

export async function inputMailGoogleThreadText(
  page: Page,
  text: string,
): Promise<MailGoogleThreadActionResult> {
  if (!text.trim()) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "missing_text",
    };
  }
  const filled = await fillReplyBody(page, text);
  return {
    ok: filled,
    confirmed: filled,
    pageUrl: page.url(),
    error: filled ? undefined : "reply_composer_unavailable",
  };
}

export async function sendMailGoogleThreadText(
  page: Page,
  text: string,
): Promise<MailGoogleThreadActionResult> {
  const filled = await fillReplyBody(page, text);
  if (!filled) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "reply_composer_unavailable",
    };
  }

  const sendButton = page.locator(sendButtonSelector()).last();
  if ((await sendButton.count()) === 0) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "send_button_missing",
    };
  }

  await sendButton.click();
  let confirmed = false;
  try {
    await page.waitForFunction(
      new Function(
        `
          return /邮件已发送|Message sent/u.test(document.body?.innerText || "");
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
    pageUrl: page.url(),
    error: confirmed ? undefined : "send_not_confirmed",
  };
}
