import type { Frame } from "playwright-core";
import type { Ali1688ChatPageSnapshot, Ali1688ChatSelectorConfig } from "./types.js";

export async function scanAli1688ChatFrame(
  frame: Frame,
  selectors: Ali1688ChatSelectorConfig,
): Promise<Ali1688ChatPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const selectorSet = payload.selectorSet;
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => (value ?? "").replace(/\\\\s+/g, " ").trim();
      const pickFirstLocal = (selectorsLocal, root) => {
        for (const selector of selectorsLocal) {
          const node = root.querySelector(selector);
          if (node) {
            return node;
          }
        }
        return null;
      };
      const pickText = (selectorsLocal, root) =>
        selectorsLocal?.length ? cleanText(pickFirstLocal(selectorsLocal, root)?.textContent) : "";
      const parseTimestamp = (value) => {
        const raw = cleanText(value);
        if (!raw) {
          return Date.now();
        }
        const directNumber = Number(raw);
        if (Number.isFinite(directNumber) && directNumber > 0) {
          return directNumber;
        }
        const isoLike = raw.replace(" ", "T");
        const parsed = Date.parse(isoLike);
        return Number.isFinite(parsed) ? parsed : Date.now();
      };
      const hashText = (value) => {
        let hash = 2166136261;
        for (const character of value) {
          hash ^= character.charCodeAt(0);
          hash = Math.imul(hash, 16777619);
        }
        return "msg-" + (hash >>> 0).toString(16);
      };
      const collectAttachments = (item, messageId) => {
        const results = [];
        const seen = new Set();
        for (const img of Array.from(item.querySelectorAll("img"))) {
          const cls = String(img.className || "");
          if (cls.includes("headPic") || cls.includes("avatar-img")) {
            continue;
          }
          const url = img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || "";
          if (!url) {
            continue;
          }
          const key = "img:" + url;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          results.push({
            id: messageId + ":img:" + results.length,
            kind: "image",
            url,
            name: cleanText(img.getAttribute("alt") || "") || undefined,
            previewText: cleanText(img.getAttribute("alt") || "") || undefined,
          });
        }
        for (const anchor of Array.from(item.querySelectorAll("a[href]"))) {
          const href = anchor.getAttribute("href") || "";
          if (!href || href.startsWith("javascript:")) {
            continue;
          }
          const key = "file:" + href;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          const text = cleanText(anchor.textContent || "");
          const lower = href.toLowerCase();
          const kind = /\\.(png|jpg|jpeg|gif|webp|bmp)(\\?|$)/.test(lower) ? "image" : "file";
          results.push({
            id: messageId + ":file:" + results.length,
            kind,
            url: href,
            name: text || undefined,
            previewText: text || undefined,
          });
        }
        return results;
      };
      const conversations = Array.from(document.querySelectorAll(selectorSet.conversationItems.join(","))).map((item, index) => {
        const titleNode = pickFirstLocal(selectorSet.conversationTitle, item);
        const unreadNode = pickFirstLocal(selectorSet.conversationUnread, item);
        const title = cleanText(titleNode?.textContent) || "conversation-" + (index + 1);
        const conversationId =
          item.getAttribute("id") ||
          item.getAttribute("data-conversation-id") ||
          item.getAttribute("data-id") ||
          title ||
          "conversation-" + (index + 1);
        return {
          conversationId,
          customerId: conversationId,
          customerName: title,
          unread: Boolean(unreadNode),
          active: item.classList.contains("active"),
        };
      });
      const messages = Array.from(document.querySelectorAll(selectorSet.messageItems.join(",")))
        .map((item) => {
          const textNode = pickFirstLocal(selectorSet.messageText, item);
          const text = cleanText(textNode?.textContent) || pickText(selectorSet.messageText, item);
          const author = pickText(selectorSet.messageAuthor, item);
          const timestampText =
            (selectorSet.messageTimestampAttribute
              ? item.getAttribute(selectorSet.messageTimestampAttribute)
              : null) || pickText(selectorSet.messageTimestamp, item);
          const isIncoming =
            selectorSet.messageIncomingMarker && selectorSet.messageIncomingMarker.length > 0
              ? selectorSet.messageIncomingMarker.some((selector) => item.matches(selector))
              : !item.classList.contains("self");
          const rawId =
            (selectorSet.messageIdAttribute ? item.getAttribute(selectorSet.messageIdAttribute) : null) ||
            item.getAttribute("data-id");
          const attachments = collectAttachments(item, rawId || "tmp");
          const isSystem = String(item.className || "").includes("system");
          const messageType = isSystem
            ? "system"
            : text && attachments.length > 0
              ? "mixed"
              : attachments.some((attachment) => attachment.kind === "image")
                ? "image"
                : attachments.some((attachment) => attachment.kind === "file")
                  ? "file"
                  : "text";
          const messageId =
            rawId ||
            hashText(
              [author, timestampText, text, messageType, JSON.stringify(attachments)].join("|"),
            );
          const normalizedAttachments = attachments.map((attachment, index) => ({
            ...attachment,
            id: attachment.id === "tmp" ? messageId + ":att:" + index : attachment.id,
          }));
          return {
            messageId,
            text,
            rawText: text,
            timestamp: parseTimestamp(timestampText),
            timestampText: cleanText(timestampText),
            author,
            isIncoming,
            isSystem,
            messageType,
            attachments: normalizedAttachments,
          };
        })
        .filter((message) => message.text.length > 0 || message.attachments.length > 0);
      const hasConversationList =
        conversations.length > 0 || Boolean(document.querySelector(".conversation-list"));
      const hasMessageList = Boolean(document.querySelector(".message-list"));
      const hasComposer =
        Boolean(pickFirstLocal(selectorSet.input, document)) &&
        Boolean(pickFirstLocal(selectorSet.sendButton, document));
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /登录|扫码|二维码登录/.test(pageText);
      const domHealthy = hasConversationList && hasMessageList && hasComposer;
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        activeConversationId:
          conversations.find((conversation) => conversation.active)?.conversationId ?? null,
        conversations,
        messages,
        health: {
          hasConversationList,
          hasMessageList,
          hasComposer,
          isLoggedIn: !looksLoggedOut,
          domHealthy,
          warning: !domHealthy
            ? "missing required DOM anchors for conversation list, message list, or composer"
            : undefined,
        },
      };
    `,
  ) as (payload: {
    selectorSet: Ali1688ChatSelectorConfig;
    frameUrl: string;
  }) => Ali1688ChatPageSnapshot;

  return await frame.evaluate(pageFunction, {
    selectorSet: selectors,
    frameUrl: frame.url(),
  });
}
