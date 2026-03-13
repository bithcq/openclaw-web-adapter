import type { Frame } from "playwright-core";
import type { MailQqThreadPageSnapshot } from "./types.js";

export async function scanMailQqThreadFrame(frame: Frame): Promise<MailQqThreadPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const bodyNode = document.querySelector("#mailContentContainer, #contentDiv");
      const bodyClone = bodyNode?.cloneNode(true);
      bodyClone?.querySelectorAll("script, style, head, link, meta").forEach((child) => child.remove());
      const subject = cleanText(
        document.querySelector("#subject")?.textContent ||
          document.querySelector(".sub_title, .mail_title, .txt_title")?.textContent,
      );
      const senderBlock = cleanText(
        Array.from(document.querySelectorAll("td, div, span"))
          .map((node) => cleanText(node.textContent))
          .find((text) => text.startsWith("发件人：")) || "",
      );
      const senderEmailMatch = senderBlock.match(/<([^>]+)>/);
      const sender = (
        senderBlock.match(/^发件人：\\s*([^<]+)/u)?.[1] ||
        senderBlock
          .replace(/^发件人：/u, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\\([\\s\\S]*$/u, "")
      ).trim();
      const timeBlock = cleanText(
        Array.from(document.querySelectorAll("td, div, span"))
          .map((node) => cleanText(node.textContent))
          .find((text) => text.startsWith("时 间：") || text.startsWith("时间：")) || "",
      ).replace(/^时\\s*间：|^时间：/u, "");
      const recipientBlock = cleanText(
        Array.from(document.querySelectorAll("td, div, span"))
          .map((node) => cleanText(node.textContent))
          .find((text) => text.startsWith("收件人：")) || "",
      ).replace(/^收件人：/u, "");
      const recipients = recipientBlock
        .split(/[;,，]/u)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /扫码登录|重新登录|登录邮箱/u.test(pageText);
      const quickReplyAvailable = Boolean(
        document.querySelector("#source") && document.querySelector("#sendbtn"),
      );
      const hasSubject = subject.length > 0;
      const hasBody = cleanText(bodyClone?.textContent || bodyNode?.textContent).length > 0;
      const domHealthy = hasSubject && hasBody;
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        subject,
        sender,
        senderEmail: senderEmailMatch?.[1],
        recipients,
        timeText: timeBlock,
        bodyText: cleanText(bodyClone?.textContent || bodyNode?.textContent),
        quickReplyAvailable,
        health: {
          hasSubject,
          hasBody,
          isLoggedIn: !looksLoggedOut,
          domHealthy,
          warning: !domHealthy ? "missing qq mail subject or body container" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => MailQqThreadPageSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
