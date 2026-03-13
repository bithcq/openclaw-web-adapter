import type { Frame } from "playwright-core";
import type { MailQqComposeActionArgs, MailQqComposeActionResult } from "./types.js";

function asArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getEditorFrame(frame: Frame): Frame | null {
  return frame.childFrames()[0] ?? null;
}

async function fillComposeDraft(
  frame: Frame,
  args: MailQqComposeActionArgs,
): Promise<number | null> {
  const toField = frame.locator("#to");
  const subjectField = frame.locator("#subject");
  const sendButton = frame.locator("[name='sendbtn']");
  if (
    (await toField.count()) === 0 ||
    (await subjectField.count()) === 0 ||
    (await sendButton.count()) === 0
  ) {
    return null;
  }

  const recipients = asArray(args.to)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (recipients.length > 0) {
    await toField.fill(recipients.join("; "));
  }

  if (typeof args.subject === "string") {
    await subjectField.fill(args.subject);
  }

  if (typeof args.text === "string") {
    const editorFrame = getEditorFrame(frame);
    if (!editorFrame) {
      return null;
    }
    const editor = editorFrame.locator("body[contenteditable='true']");
    if ((await editor.count()) === 0) {
      return null;
    }
    await editor.fill(args.text);
  }

  return recipients.length;
}

export async function focusMailQqComposeEditor(frame: Frame): Promise<MailQqComposeActionResult> {
  const editorFrame = getEditorFrame(frame);
  if (!editorFrame) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "composer_not_found",
    };
  }
  const editor = editorFrame.locator("body[contenteditable='true']");
  if ((await editor.count()) === 0) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "composer_not_found",
    };
  }
  await editor.click();
  return {
    ok: true,
    confirmed: true,
    frameUrl: frame.url(),
  };
}

export async function inputMailQqComposeText(
  frame: Frame,
  text: string,
): Promise<MailQqComposeActionResult> {
  if (!text.trim()) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "missing_text",
    };
  }
  const recipientCount = await fillComposeDraft(frame, { text });
  return {
    ok: recipientCount !== null,
    confirmed: recipientCount !== null,
    frameUrl: frame.url(),
    error: recipientCount !== null ? undefined : "composer_not_found",
  };
}

export async function sendMailQqComposeDraft(
  frame: Frame,
  args: MailQqComposeActionArgs,
): Promise<MailQqComposeActionResult> {
  const recipientCount = await fillComposeDraft(frame, args);
  if (recipientCount === null) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "composer_not_found",
    };
  }

  const sendButton = frame.locator("[name='sendbtn']").first();
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
    recipientCount,
    error: confirmed ? undefined : "send_not_confirmed",
  };
}
