import type { Page } from "playwright-core";
import type { Ali1688FactorySearchActionArgs, Ali1688FactorySearchActionResult } from "./types.js";

export async function performAli1688FactorySearchAction(
  page: Page,
  action: "click_item" | "open_link" | "search_keyword",
  args: Ali1688FactorySearchActionArgs,
): Promise<Ali1688FactorySearchActionResult> {
  if (action === "search_keyword") {
    const keyword = args.keyword?.trim();
    if (!keyword) {
      return {
        ok: false,
        confirmed: false,
        pageUrl: page.url(),
        error: "keyword_missing",
      };
    }

    const input = page.locator("#alisearch-input").first();
    await input.waitFor({ state: "visible", timeout: 5_000 });
    await input.fill(keyword);
    await input.press("Enter");
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(1_500);
    const confirmed = page.url().includes("/company/pc/factory_search.htm");
    return {
      ok: true,
      confirmed,
      pageUrl: page.url(),
      error: confirmed ? undefined : "keyword_search_not_confirmed",
    };
  }

  if (action === "open_link") {
    const targetUrl = args.detailUrl?.trim();
    if (!targetUrl) {
      return {
        ok: false,
        confirmed: false,
        pageUrl: page.url(),
        error: "detail_url_missing",
      };
    }

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    return {
      ok: true,
      confirmed: page.url().length > 0,
      pageUrl: page.url(),
      detailUrl: page.url(),
      error: page.url().length > 0 ? undefined : "detail_open_not_confirmed",
    };
  }

  return await page.evaluate(
    new Function(
      "payload",
      `
        const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
        const parseItemId = (element, fallbackIndex) => {
          const report = element.getAttribute("data-aplus-report") || "";
          const match = report.match(/item_id@([^\\^\\s]+)/i);
          if (match?.[1]) {
            return match[1];
          }
          return "factory-" + String(fallbackIndex + 1);
        };
        const cards = Array.from(document.querySelectorAll("div.space-factory-card"));
        const matchedCard = cards.find((card, index) => {
          const itemId = parseItemId(card, index);
          const companyName = cleanText(
            card.querySelector(".title, .title-container .title, .main-content .title")?.textContent,
          );
          if (payload.itemId && itemId === payload.itemId) {
            return true;
          }
          if (payload.companyName && companyName === payload.companyName) {
            return true;
          }
          return false;
        });
        if (!matchedCard) {
          return {
            ok: false,
            confirmed: false,
            error: "item_not_found",
            pageUrl: window.location.href,
          };
        }
        const checkbox = matchedCard.querySelector(
          ".join-factory input[type='checkbox'], .join-factory .checkbox-container input",
        );
        if (!(checkbox instanceof HTMLInputElement)) {
          return {
            ok: false,
            confirmed: false,
            error: "batch_inquiry_control_missing",
            pageUrl: window.location.href,
          };
        }
        const label = matchedCard.querySelector(
          ".join-factory label, .join-factory .checkbox-container label",
        );
        if (label instanceof HTMLElement) {
          label.click();
        } else if (!checkbox.checked) {
          checkbox.click();
        }
        const widget = document.querySelector(".price-inquiry-container");
        const widgetText = cleanText(widget?.textContent);
        const companyName = cleanText(
          matchedCard.querySelector(".title, .title-container .title, .main-content .title")?.textContent,
        );
        const confirmed =
          checkbox.checked || Boolean(companyName && widgetText.includes(companyName));
        return {
          ok: true,
          confirmed,
          pageUrl: window.location.href,
          itemId: payload.itemId || undefined,
          error: confirmed ? undefined : "batch_inquiry_select_not_confirmed",
        };
      `,
    ) as (payload: Ali1688FactorySearchActionArgs) => Ali1688FactorySearchActionResult,
    args,
  );
}
