import type { Frame, Page } from "playwright-core";
import type { MailGoogleInboxActionResult, MailGoogleInboxClickItemArgs } from "./types.js";

function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim().toLowerCase();
}

async function readFirstItemId(frame: Frame): Promise<string | undefined> {
  return await frame.evaluate(
    new Function(
      `
        const first = document.querySelector(".bqe");
        return (
          first?.getAttribute("data-thread-id") ||
          first?.getAttribute("data-legacy-thread-id") ||
          undefined
        );
      `,
    ) as () => string | undefined,
  );
}

export async function clickMailGoogleInboxItem(
  page: Page,
  frame: Frame,
  args: MailGoogleInboxClickItemArgs,
): Promise<MailGoogleInboxActionResult> {
  const beforeUrl = page.url();
  const clickFn = new Function(
    "payload",
    `
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim().toLowerCase();
      const rows = Array.from(document.querySelectorAll("tr[role='row'], tr.zA")).filter((row) =>
        row.querySelector(".bqe"),
      );
      const matched = rows.find((row) => {
        const senderText = cleanText(row.querySelector(".zF, .yP, .yW span")?.textContent);
        const subjectText = cleanText(row.querySelector(".y6 .bog, .bog, .bqe")?.textContent);
        const threadNode = row.querySelector(".bqe");
        const rowThreadId = cleanText(threadNode?.getAttribute("data-thread-id"));
        const rowLegacyThreadId = cleanText(threadNode?.getAttribute("data-legacy-thread-id"));
        if (payload.itemId && rowThreadId === cleanText(payload.itemId)) {
          return true;
        }
        if (payload.threadId && rowThreadId === cleanText(payload.threadId)) {
          return true;
        }
        if (payload.legacyThreadId && rowLegacyThreadId === cleanText(payload.legacyThreadId)) {
          return true;
        }
        if (payload.sender && senderText !== payload.sender) {
          return false;
        }
        if (payload.subject && subjectText !== payload.subject) {
          return false;
        }
        return Boolean(payload.sender || payload.subject);
      });
      if (!(matched instanceof HTMLElement)) {
        return "";
      }
      const rowThreadId =
        matched.querySelector(".bqe")?.getAttribute("data-thread-id") ||
        matched.querySelector(".bqe")?.getAttribute("data-legacy-thread-id") ||
        "";
      matched.scrollIntoView({ block: "center", inline: "nearest" });
      matched.click();
      return rowThreadId;
    `,
  ) as (payload: {
    itemId?: string;
    threadId?: string;
    legacyThreadId?: string;
    sender?: string;
    subject?: string;
  }) => string;
  const threadId = await frame.evaluate(clickFn, {
    itemId: normalizeText(args.itemId),
    threadId: normalizeText(args.threadId),
    legacyThreadId: normalizeText(args.legacyThreadId),
    sender: normalizeText(args.sender),
    subject: normalizeText(args.subject),
  });

  if (!threadId) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "item_not_found",
    };
  }

  try {
    await page.waitForFunction(
      new Function(
        "expectedThreadId",
        `
          return window.location.href.includes(String(expectedThreadId).replace(/^#/, ""));
        `,
      ) as (expectedThreadId: string) => boolean,
      threadId,
      { timeout: 5_000 },
    );
  } catch {
    await page.waitForTimeout(500);
  }

  const afterUrl = page.url();
  const confirmed = afterUrl !== beforeUrl && afterUrl.includes(threadId.replace(/^#/, ""));
  return {
    ok: true,
    confirmed,
    pageUrl: afterUrl,
    threadId,
    error: confirmed ? undefined : "thread_open_not_confirmed",
  };
}

export async function goToNextMailGoogleInboxPage(
  page: Page,
  frame: Frame,
): Promise<MailGoogleInboxActionResult> {
  const olderButton = page.locator(
    "[role='button'][aria-label='较旧'], [role='button'][aria-label='Older']",
  );
  if ((await olderButton.count()) === 0) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "next_page_unavailable",
    };
  }
  const disabled = (await olderButton.first().getAttribute("aria-disabled")) === "true";
  if (disabled) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "next_page_unavailable",
    };
  }

  const beforeFirstItemId = await readFirstItemId(frame);
  await olderButton.first().click();
  try {
    await frame.waitForFunction(
      new Function(
        "baselineId",
        `
          const current =
            document.querySelector(".bqe")?.getAttribute("data-thread-id") ||
            document.querySelector(".bqe")?.getAttribute("data-legacy-thread-id") ||
            "";
          return current.length > 0 && current !== baselineId;
        `,
      ) as (baselineId?: string) => boolean,
      beforeFirstItemId,
      { timeout: 8_000 },
    );
  } catch {
    await page.waitForTimeout(800);
  }

  const afterFirstItemId = await readFirstItemId(frame);
  const confirmed = Boolean(afterFirstItemId && afterFirstItemId !== beforeFirstItemId);
  return {
    ok: true,
    confirmed,
    pageUrl: page.url(),
    firstItemId: afterFirstItemId,
    error: confirmed ? undefined : "page_change_not_confirmed",
  };
}
