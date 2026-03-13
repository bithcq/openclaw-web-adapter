import type { Frame } from "playwright-core";
import type { MailGoogleThreadPageSnapshot } from "./types.js";

export async function scanMailGoogleThreadFrame(
  frame: Frame,
): Promise<MailGoogleThreadPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const messages = Array.from(document.querySelectorAll("[data-message-id]")).map((node, index) => {
        const bodyNode = node.querySelector(".a3s.aiL, .ii.gt");
        const clone = bodyNode?.cloneNode(true);
        clone?.querySelectorAll("script, style, head, link, meta").forEach((child) => child.remove());
        return {
          messageId: cleanText(node.getAttribute("data-message-id")) || "message-" + (index + 1),
          legacyMessageId: cleanText(node.getAttribute("data-legacy-message-id")) || undefined,
          senderName:
            cleanText(node.querySelector(".gD span, .gD")?.textContent) ||
            cleanText(node.querySelector(".go")?.textContent) ||
            "unknown",
          senderEmail:
            cleanText(node.querySelector(".gD")?.getAttribute("email")) ||
            cleanText(node.querySelector(".gD")?.getAttribute("data-hovercard-id")) ||
            undefined,
          timeText:
            cleanText(node.querySelector(".g3")?.getAttribute("title")) ||
            cleanText(node.querySelector(".g3")?.textContent),
          bodyText: cleanText(clone?.textContent || bodyNode?.textContent),
          attachmentNames: Array.from(node.querySelectorAll(".aZo, .aQy span"))
            .map((attachment) => cleanText(attachment.textContent))
            .filter((value) => value.length > 0),
        };
      });
      const subject = cleanText(document.querySelector("h2.hP")?.textContent);
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /选择帐号|Choose an account|Sign in|登录后继续/u.test(pageText);
      const replyAvailable = Boolean(
        Array.from(document.querySelectorAll("[role='button'], button")).find((button) => {
          const label =
            cleanText(button.getAttribute("aria-label")) ||
            cleanText(button.getAttribute("data-tooltip")) ||
            cleanText(button.textContent);
          return /^回复$|^Reply$/iu.test(label);
        }),
      );
      const composerVisible = Boolean(
        document.querySelector(
          "div[role='textbox'][aria-label='邮件正文'], div[role='textbox'][aria-label='Message Body'], textarea[aria-label='邮件正文'], textarea[aria-label='Message Body']",
        ),
      );
      const hasThreadSubject = subject.length > 0;
      const hasMessages = messages.length > 0;
      const domHealthy = hasThreadSubject && hasMessages;
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        subject,
        messages,
        replyAvailable,
        composerVisible,
        health: {
          hasThreadSubject,
          hasMessages,
          isLoggedIn: hasMessages || hasThreadSubject || !looksLoggedOut,
          domHealthy,
          warning: !domHealthy ? "missing gmail thread subject or message nodes" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => MailGoogleThreadPageSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
