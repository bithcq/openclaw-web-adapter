import type { Frame, Page } from "playwright-core";
import type { MailQqInboxActionResult, MailQqInboxClickItemArgs } from "./types.js";

function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim().toLowerCase();
}

async function resolveCurrentPage(frame: Frame): Promise<number> {
  return await frame.evaluate(() => {
    const current = new URL(window.location.href).searchParams.get("page");
    const parsed = Number(current);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) + 1 : 1;
  });
}

export async function clickMailQqInboxItem(
  page: Page,
  frame: Frame,
  args: MailQqInboxClickItemArgs,
): Promise<MailQqInboxActionResult> {
  const beforeUrl = frame.url();
  const navigationPromise = frame
    .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5_000 })
    .catch(() => null);
  const clickResult = await frame.evaluate(
    new Function(
      "payload",
      `
        const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim().toLowerCase();
        const rows = Array.from(document.querySelectorAll("table.i")).filter((table) =>
          table.querySelector("td.cx input[name='mailid']"),
        );
        const matched = rows.find((table) => {
          const checkbox = table.querySelector("td.cx input[name='mailid']");
          const senderNode = table.querySelector("td.l span[t='u'][n]");
          const subjectNode = table.querySelector("td.l u.black.tt, td.l u.tt, td.l u[role='link']");
          const senderCell = table.querySelector("td.l td.tl");
          const mailId =
            checkbox?.getAttribute("value") ||
            senderNode?.getAttribute("mailid") ||
            table.querySelector("td.l nobr[mailid]")?.getAttribute("mailid") ||
            "";
          const sender =
            cleanText(senderNode?.textContent) ||
            cleanText(checkbox?.getAttribute("fn")) ||
            cleanText(senderCell?.textContent);
          const subject = cleanText(subjectNode?.textContent);
          if (payload.itemId && mailId === payload.itemId) {
            return true;
          }
          if (payload.mailId && mailId === payload.mailId) {
            return true;
          }
          if (payload.sender && sender !== payload.sender) {
            return false;
          }
          if (payload.subject && subject !== payload.subject) {
            return false;
          }
          return Boolean(payload.sender || payload.subject);
        });
        if (!matched) {
          return { clicked: false };
        }
        const checkbox = matched.querySelector("td.cx input[name='mailid']");
        const target = matched.querySelector("td.l");
        if (!(target instanceof HTMLElement)) {
          return { clicked: false };
        }
        target.scrollIntoView({ block: "center", inline: "nearest" });
        target.click();
        return {
          clicked: true,
          mailId: checkbox?.getAttribute("value") || "",
        };
      `,
    ) as (payload: { itemId?: string; mailId?: string; sender?: string; subject?: string }) => {
      clicked: boolean;
      mailId?: string;
    },
    {
      itemId: args.itemId,
      mailId: args.mailId,
      sender: normalizeText(args.sender),
      subject: normalizeText(args.subject),
    },
  );

  if (!clickResult.clicked) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      error: "item_not_found",
    };
  }

  await Promise.allSettled([navigationPromise, page.waitForTimeout(300)]);

  const afterUrl = frame.url();
  const confirmed = afterUrl !== beforeUrl || !afterUrl.includes("/cgi-bin/mail_list");
  return {
    ok: true,
    confirmed,
    frameUrl: afterUrl,
    mailId: clickResult.mailId,
    error: confirmed ? undefined : "navigation_not_confirmed",
  };
}

export async function goToNextMailQqInboxPage(frame: Frame): Promise<MailQqInboxActionResult> {
  const currentPage = await resolveCurrentPage(frame);
  const nextPageUrl = await frame.evaluate(() => {
    const nextLink = document.querySelector<HTMLAnchorElement>("#nextpage, #nextpage1");
    return nextLink?.href || "";
  });

  if (!nextPageUrl) {
    return {
      ok: false,
      confirmed: false,
      frameUrl: frame.url(),
      currentPage,
      error: "next_page_unavailable",
    };
  }

  await frame.goto(nextPageUrl, { waitUntil: "domcontentloaded" });
  const nextPage = await resolveCurrentPage(frame);
  const confirmed = nextPage > currentPage;
  return {
    ok: true,
    confirmed,
    frameUrl: frame.url(),
    currentPage,
    nextPage,
    error: confirmed ? undefined : "page_change_not_confirmed",
  };
}
