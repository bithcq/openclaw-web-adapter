import type { Frame } from "playwright-core";
import type { MailGoogleInboxPageSnapshot } from "./types.js";

export async function scanMailGoogleInboxFrame(frame: Frame): Promise<MailGoogleInboxPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const toPositiveInt = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
      };
      const hash = window.location.hash || "#inbox";
      const folderId = hash.replace(/^#/, "").split(/[/?]/, 1)[0] || "inbox";
      const title = document.title;
      const unreadMatch = title.match(/\\((\\d+)\\)/);
      const rows = Array.from(document.querySelectorAll("tr[role='row'], tr.zA"))
        .filter((row) => row.querySelector(".bqe"))
        .map((row, index) => {
          const senderNode = row.querySelector(".zF, .yP, .yW span");
          const subjectNode = row.querySelector(".y6 .bog, .bog, .bqe");
          const threadNode = row.querySelector(".bqe");
          const timeNode = row.querySelector(".xW .xS, .xW span");
          const snippetNode = row.querySelector(".y2");
          const starNode = row.querySelector(".aXw[role='button']");
          const importantNode = row.querySelector("[role='switch']");
          const threadId = cleanText(threadNode?.getAttribute("data-thread-id")) || "thread-" + (index + 1);
          const legacyThreadId = cleanText(threadNode?.getAttribute("data-legacy-thread-id")) || undefined;
          return {
            itemId: threadId,
            threadId,
            legacyThreadId,
            sender: cleanText(senderNode?.textContent) || "unknown",
            senderEmail:
              cleanText(senderNode?.getAttribute("email")) ||
              cleanText(senderNode?.getAttribute("data-hovercard-id")) ||
              undefined,
            subject: cleanText(subjectNode?.textContent) || "untitled",
            snippet: cleanText(snippetNode?.textContent) || undefined,
            timeText: cleanText(timeNode?.getAttribute("title")) || cleanText(timeNode?.textContent),
            unread: /\\bzE\\b/.test(String(row.className || "")),
            starred: /已加星标|starred/i.test(
              cleanText(starNode?.getAttribute("aria-label")) || cleanText(starNode?.getAttribute("data-tooltip")),
            ),
            important:
              cleanText(importantNode?.getAttribute("aria-checked")) === "true" ||
              /重要|important/i.test(cleanText(importantNode?.getAttribute("aria-label"))),
            hasAttachment: Boolean(
              row.querySelector(".aQw, .yf, img[alt*='附件'], img[alt*='Attachment']"),
            ),
          };
        });
      const pagerRange = Array.from(document.querySelectorAll("span, div"))
        .map((node) => cleanText(node.textContent))
        .find((text) => /\\d+\\s*[-–]\\s*\\d+\\s*(?:封|of)\\s*\\d+/i.test(text));
      const pagerMatch = pagerRange?.match(/(\\d+)\\s*[-–]\\s*(\\d+)\\D+(\\d+)/);
      const newerButton = document.querySelector(
        "[role='button'][aria-label='较新'], [role='button'][aria-label='Newer']",
      );
      const olderButton = document.querySelector(
        "[role='button'][aria-label='较旧'], [role='button'][aria-label='Older']",
      );
      const hasMailList = rows.length > 0;
      const hasToolbar = Boolean(newerButton || olderButton || document.querySelector("[gh='tm']"));
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /选择帐号|Choose an account|Sign in|登录后继续/u.test(pageText);
      const domHealthy = hasMailList && hasToolbar;
      return {
        title,
        url: window.location.href,
        frameUrl,
        folder: {
          folderId,
          folderName: folderId === "inbox" ? "收件箱" : folderId,
          unreadCount: toPositiveInt(unreadMatch?.[1]),
          visibleItemCount: rows.length,
        },
        pagination: {
          visibleStart: toPositiveInt(pagerMatch?.[1]),
          visibleEnd: toPositiveInt(pagerMatch?.[2]),
          totalItems: toPositiveInt(pagerMatch?.[3]),
          hasNextPage: cleanText(olderButton?.getAttribute("aria-disabled")) !== "true",
          hasPreviousPage: cleanText(newerButton?.getAttribute("aria-disabled")) !== "true",
        },
        items: rows,
        health: {
          hasMailList,
          hasToolbar,
          isLoggedIn: hasMailList || hasToolbar || !looksLoggedOut,
          domHealthy,
          warning: !domHealthy ? "missing gmail list rows or pager controls" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => MailGoogleInboxPageSnapshot;

  return await frame.evaluate(pageFunction, {
    frameUrl: frame.url(),
  });
}
