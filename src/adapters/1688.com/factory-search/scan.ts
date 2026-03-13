import type { Frame } from "playwright-core";
import type { Ali1688FactorySearchPageSnapshot } from "./types.js";

export async function scanAli1688FactorySearchFrame(
  frame: Frame,
): Promise<Ali1688FactorySearchPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const parsePageNumber = (value) => {
        const text = cleanText(value);
        if (!text) {
          return undefined;
        }
        const match = text.match(/(\\d+)/);
        return match ? Number(match[1]) : undefined;
      };
      const parseItemId = (element, fallbackIndex) => {
        const report = element.getAttribute("data-aplus-report") || "";
        const match = report.match(/item_id@([^\\^\\s]+)/i);
        if (match?.[1]) {
          return match[1];
        }
        return "factory-" + String(fallbackIndex + 1);
      };
      const cards = Array.from(document.querySelectorAll("div.space-factory-card"));
      const items = cards
        .map((card, index) => {
          const companyName = cleanText(
            card.querySelector(".title, .title-container .title, .main-content .title")?.textContent,
          );
          if (!companyName) {
            return null;
          }
          const city = cleanText(card.querySelector(".city")?.textContent) || undefined;
          const yearsText = cleanText(
            card.querySelector(".factory-year, .factory-years, .year-tag, [class*='year']")?.textContent,
          ) || undefined;
          const businessTags = Array.from(
            card.querySelectorAll(".business-tag, .tag-item, .main-content .tag, .main-content .cate-text"),
          )
            .map((node) => cleanText(node.textContent))
            .filter((value, idx, array) => value.length > 0 && array.indexOf(value) === idx);
          const serviceTags = Array.from(
            card.querySelectorAll(".whole-day-online, .service-tag, .service-label, .right-top-header .header"),
          )
            .map((node) => cleanText(node.textContent))
            .filter((value, idx, array) => value.length > 0 && array.indexOf(value) === idx);
          const detailUrl = cleanText(card.getAttribute("data-splus-exp-url")) || undefined;
          const supportsBatchInquiry = Boolean(
            card.querySelector(".join-factory input[type='checkbox'], .join-factory .checkbox-container input"),
          );
          return {
            itemId: parseItemId(card, index),
            companyName,
            city,
            yearsText,
            businessTags,
            serviceTags,
            detailUrl,
            supportsBatchInquiry,
          };
        })
        .filter((item) => Boolean(item));
      const currentPage = parsePageNumber(
        document.querySelector(".pages .current, .page-current, .pagination .active, .ui-page-item-active")?.textContent,
      );
      const totalPageCandidates = Array.from(
        document.querySelectorAll(".pages a, .pages span, .pagination a, .pagination span, .ui-page-item"),
      )
        .map((node) => parsePageNumber(node.textContent))
        .filter((value) => Number.isFinite(value));
      const totalPages = totalPageCandidates.length > 0 ? Math.max(...totalPageCandidates) : undefined;
      const pageText = cleanText(document.body?.innerText || "");
      const url = new URL(window.location.href);
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        keyword: cleanText(url.searchParams.get("keywords") || undefined) || undefined,
        items,
        pagination: currentPage || totalPages ? { currentPage, totalPages } : undefined,
        health: {
          hasFactoryCards: items.length > 0,
          isLoggedIn: !/登录/u.test(pageText),
          domHealthy: items.length > 0,
          warning: items.length === 0 ? "missing 1688 factory cards" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => Ali1688FactorySearchPageSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
