import type { Frame } from "playwright-core";
import type { MailQqInboxPageSnapshot } from "./types.js";

export async function scanMailQqInboxFrame(frame: Frame): Promise<MailQqInboxPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const toPositiveInt = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
      };
      const readFolder = () => {
        const titleText = cleanText(document.querySelector(".txt_title")?.textContent || document.title);
        const match = titleText.match(/^(.*?)\\s*\\(共\\s*(\\d+)\\s*封(?:，其中\\s*未读邮件\\s*(\\d+)\\s*封)?(?:，\\s*星标邮件\\s*(\\d+)\\s*封)?/);
        const url = new URL(window.location.href);
        return {
          folderId: url.searchParams.get("folderid"),
          folderName: cleanText(match?.[1] || titleText || "收件箱"),
          totalCount: toPositiveInt(match?.[2]),
          unreadCount: toPositiveInt(match?.[3]),
          starredCount: toPositiveInt(match?.[4]),
        };
      };
      const readPagination = () => {
        const url = new URL(window.location.href);
        const currentPage = (toPositiveInt(url.searchParams.get("page")) ?? 0) + 1;
        const nextLink = document.querySelector("#nextpage, #nextpage1");
        const nextHref = nextLink?.getAttribute("href") || "";
        const pagerText = Array.from(document.querySelectorAll(".toolbg .right, .right"))
          .map((node) => cleanText(node.textContent || ""))
          .find((text) => text.length > 0) || "";
        const directMatch = pagerText.match(/(\\d+)\\/(\\d+)\\s*页/);
        const scriptMatch = (nextLink?.parentElement?.textContent || "").match(/document\\.write\\((\\d+)\\s*\\+\\s*1\\)/);
        const scriptPageIndex = toPositiveInt(scriptMatch?.[1]);
        const totalPages =
          toPositiveInt(directMatch?.[2]) ??
          (scriptPageIndex !== undefined ? scriptPageIndex + 1 : undefined);
        return {
          currentPage,
          totalPages,
          hasNextPage: Boolean(nextHref),
          nextPageUrl: nextHref ? new URL(nextHref, window.location.href).toString() : undefined,
        };
      };
      const items = Array.from(document.querySelectorAll("table.i"))
        .filter((table) => table.querySelector("td.cx input[name='mailid']"))
        .map((table, index) => {
          const checkbox = table.querySelector("td.cx input[name='mailid']");
          const senderNode = table.querySelector("td.l span[t='u'][n]");
          const senderCell = table.querySelector("td.l td.tl");
          const subjectNode = table.querySelector("td.l u.black.tt, td.l u.tt, td.l u[role='link']");
          const previewNode = table.querySelector("td.l b.no, td.l .no");
          const timeNode = table.querySelector("td.l td.dt > div, td.dt > div");
          const mailId =
            checkbox?.getAttribute("value") ||
            senderNode?.getAttribute("mailid") ||
            table.querySelector("td.l nobr[mailid]")?.getAttribute("mailid") ||
            "mail-" + (index + 1);
          const sender =
            cleanText(senderNode?.textContent) ||
            cleanText(checkbox?.getAttribute("fn")) ||
            cleanText(senderCell?.textContent) ||
            "unknown";
          const subject =
            cleanText(subjectNode?.textContent) ||
            cleanText(previewNode?.textContent) ||
            sender;
          const previewText = cleanText(previewNode?.textContent) || undefined;
          const unread =
            checkbox?.getAttribute("unread") === "true" ||
            /\\bbold\\b/.test(String(table.className || "")) ||
            /\\bbold\\b/.test(String(table.querySelector("td.l table.i")?.className || ""));
          const isAdvertisement =
            checkbox?.getAttribute("adconv") === "1" ||
            cleanText(senderCell?.textContent).includes("广告邮件");
          return {
            itemId: mailId,
            mailId,
            sender,
            senderEmail: cleanText(checkbox?.getAttribute("fa")) || undefined,
            subject,
            previewText,
            timeText: cleanText(timeNode?.textContent),
            unread,
            hasAttachment: Boolean(table.querySelector("td.ci .cij[title='附件'], td.ci .cij[title*='附件']")),
            isAdvertisement,
          };
        })
        .filter((item) => item.subject.length > 0);
      const pageText = cleanText(document.body?.innerText || "");
      const hasMailList = items.length > 0 || Boolean(document.querySelector("#qqmail_mailcontainer, #gotnomail"));
      const hasToolbar = Boolean(document.querySelector(".toolbg"));
      const looksLoggedOut = /扫码登录|重新登录|登录邮箱/u.test(pageText);
      const isLoggedIn = (hasMailList && hasToolbar) || !looksLoggedOut;
      const domHealthy = hasMailList && hasToolbar;
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        folder: readFolder(),
        pagination: readPagination(),
        items,
        health: {
          hasMailList,
          hasToolbar,
          isLoggedIn,
          domHealthy,
          warning: !domHealthy ? "missing mailbox list rows or toolbar anchors" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => MailQqInboxPageSnapshot;

  return await frame.evaluate(pageFunction, {
    frameUrl: frame.url(),
  });
}
