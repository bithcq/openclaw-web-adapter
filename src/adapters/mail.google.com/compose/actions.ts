import type { Locator, Page } from "playwright-core";
import type { MailGoogleComposeActionArgs, MailGoogleComposeActionResult } from "./types.js";

function asArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function resolveComposeRoot(page: Page): Promise<Locator | null> {
  const root = page
    .locator("div[role='dialog']")
    .filter({
      has: page.locator("input[aria-label='发送至收件人'], input[aria-label='To recipients']"),
    })
    .last();
  return (await root.count()) > 0 ? root : null;
}

async function resolveComposeFields(page: Page) {
  const root = await resolveComposeRoot(page);
  if (!root) {
    return null;
  }
  return {
    root,
    recipientInput: root
      .locator("input[aria-label='发送至收件人'], input[aria-label='To recipients']")
      .last(),
    subjectInput: root.locator("input[name='subjectbox']").first(),
    bodyEditor: root
      .locator(
        "div[role='textbox'][aria-label='邮件正文'], div[role='textbox'][aria-label='Message Body']",
      )
      .first(),
    sendButton: root
      .locator("[role='button'][aria-label^='发送'], [role='button'][aria-label^='Send']")
      .first(),
  };
}

async function fillComposeDraft(
  page: Page,
  args: MailGoogleComposeActionArgs,
): Promise<number | null> {
  const fields = await resolveComposeFields(page);
  if (!fields) {
    return null;
  }

  const recipients = asArray(args.to)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (recipients.length > 0) {
    for (const recipient of recipients) {
      await fields.recipientInput.click();
      await fields.recipientInput.fill(recipient);
      await fields.recipientInput.press("Enter");
    }
  }

  if (typeof args.subject === "string") {
    await fields.subjectInput.fill(args.subject);
  }

  if (typeof args.text === "string") {
    await fields.bodyEditor.click();
    await page.keyboard.press("ControlOrMeta+A").catch(() => undefined);
    await page.keyboard.press("Backspace").catch(() => undefined);
    await fields.bodyEditor.fill(args.text);
  }

  return recipients.length;
}

export async function focusMailGoogleComposeEditor(
  page: Page,
): Promise<MailGoogleComposeActionResult> {
  const fields = await resolveComposeFields(page);
  if (!fields) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "composer_not_found",
    };
  }
  await fields.bodyEditor.click();
  return {
    ok: true,
    confirmed: true,
    pageUrl: page.url(),
  };
}

export async function inputMailGoogleComposeText(
  page: Page,
  text: string,
): Promise<MailGoogleComposeActionResult> {
  if (!text.trim()) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "missing_text",
    };
  }
  const recipientCount = await fillComposeDraft(page, { text });
  return {
    ok: recipientCount !== null,
    confirmed: recipientCount !== null,
    pageUrl: page.url(),
    recipientCount: undefined,
    error: recipientCount !== null ? undefined : "composer_not_found",
  };
}

export async function sendMailGoogleComposeDraft(
  page: Page,
  args: MailGoogleComposeActionArgs,
): Promise<MailGoogleComposeActionResult> {
  const recipientCount = await fillComposeDraft(page, args);
  const fields = await resolveComposeFields(page);
  if (recipientCount === null || !fields) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "composer_not_found",
    };
  }
  await fields.sendButton.click();
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
    recipientCount,
    error: confirmed ? undefined : "send_not_confirmed",
  };
}
