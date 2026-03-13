import type { Frame } from "playwright-core";
import type { MailGoogleComposeDraftSnapshot } from "./types.js";

export async function scanMailGoogleComposeFrame(
  frame: Frame,
): Promise<MailGoogleComposeDraftSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const dialogs = Array.from(document.querySelectorAll("div[role='dialog']")).filter(
        (dialog) =>
          dialog.querySelector("input[aria-label='发送至收件人'], input[aria-label='To recipients']") &&
          dialog.querySelector("input[name='subjectbox']"),
      );
      const composer = dialogs[dialogs.length - 1];
      const recipientSet = new Set();
      composer
        ?.querySelectorAll("[email], [data-hovercard-id]")
        .forEach((node) => {
          const value =
            cleanText(node.getAttribute("email")) || cleanText(node.getAttribute("data-hovercard-id"));
          if (value) {
            recipientSet.add(value);
          }
        });
      const recipientInput = composer?.querySelector(
        "input[aria-label='发送至收件人'], input[aria-label='To recipients']",
      );
      const recipientDraft = cleanText(recipientInput?.value);
      if (recipientDraft) {
        recipientSet.add(recipientDraft);
      }
      const subject = cleanText(composer?.querySelector("input[name='subjectbox']")?.value);
      const bodyNode =
        composer?.querySelector(
          "div[role='textbox'][aria-label='邮件正文'], div[role='textbox'][aria-label='Message Body']",
        ) ??
        composer?.querySelector(
          "textarea[aria-label='邮件正文'], textarea[aria-label='Message Body']",
        );
      const bodyText = cleanText(bodyNode?.textContent) || cleanText(bodyNode?.value);
      const sendButton = composer?.querySelector(
        "[role='button'][aria-label^='发送'], [role='button'][aria-label^='Send']",
      );
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /选择帐号|Choose an account|Sign in|登录后继续/u.test(pageText);
      const hasComposer = Boolean(composer);
      const domHealthy = Boolean(
        composer &&
          recipientInput &&
          bodyNode &&
          sendButton &&
          composer.querySelector("input[name='subjectbox']"),
      );
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        recipients: Array.from(recipientSet),
        subject,
        bodyText,
        composerVisible: hasComposer,
        sendEnabled: cleanText(sendButton?.getAttribute("aria-disabled")) !== "true",
        health: {
          hasComposer,
          isLoggedIn: hasComposer || !looksLoggedOut,
          domHealthy,
          warning: !domHealthy ? "missing gmail compose fields or send button" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => MailGoogleComposeDraftSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
