import type { Frame } from "playwright-core";
import type { Ali1688SearchPageSnapshot } from "./types.js";

export async function scanAli1688SearchFrame(frame: Frame): Promise<Ali1688SearchPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const items = Array.from(
        document.querySelectorAll(
          "a.ocms-fusion-1688-pc-pc-ad-common-offer-2024, a[href*='detail.1688.com'], a[href*='dj.1688.com/']",
        ),
      )
        .map((anchor, index) => {
          const card = anchor.querySelector(".search-offer-item");
          if (!card) {
            return null;
          }
          const title = cleanText(card.querySelector(".offer-title-row")?.textContent);
          if (!title) {
            return null;
          }
          const href = anchor.href;
          const idMatch = href.match(/offer\\/(\\d+)\\.html/i);
          return {
            itemId: idMatch?.[1] ?? "offer-" + (index + 1),
            productUrl: href,
            title,
            priceText: cleanText(card.querySelector(".price-item, .price-comp")?.textContent) || undefined,
            soldText:
              cleanText(card.querySelector(".offer-price-row .desc-text, .sold-count")?.textContent) ||
              undefined,
            companyName:
              cleanText(card.querySelector(".offer-shop-row .desc-text, .offer-shop-row .col-left")?.textContent) ||
              undefined,
            tags: Array.from(card.querySelectorAll(".offer-tag-row .desc-text"))
              .map((tag) => cleanText(tag.textContent))
              .filter((value) => value.length > 0),
          };
        })
        .filter((item) => Boolean(item));
      const pageText = cleanText(document.body?.innerText || "");
      const url = new URL(window.location.href);
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        keyword: cleanText(url.searchParams.get("keywords") || undefined) || undefined,
        items,
        health: {
          hasResultList: items.length > 0,
          isLoggedIn: !/登录/u.test(pageText),
          domHealthy: items.length > 0,
          warning: items.length === 0 ? "missing 1688 search result cards" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => Ali1688SearchPageSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
