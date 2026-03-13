import type { Page } from "playwright-core";
import type { Ali1688SearchActionArgs, Ali1688SearchActionResult } from "./types.js";

export async function openAli1688SearchItem(
  page: Page,
  args: Ali1688SearchActionArgs,
): Promise<Ali1688SearchActionResult> {
  const targetUrl = args.productUrl?.trim();
  if (targetUrl) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    return {
      ok: true,
      confirmed: /detail\.1688\.com\/offer\//i.test(page.url()),
      pageUrl: page.url(),
      productUrl: page.url(),
      error: /detail\.1688\.com\/offer\//i.test(page.url())
        ? undefined
        : "detail_open_not_confirmed",
    };
  }

  const href = await page.evaluate(
    new Function(
      "itemId",
      `
        const anchors = Array.from(
          document.querySelectorAll(
            "a.ocms-fusion-1688-pc-pc-ad-common-offer-2024, a[href*='detail.1688.com'], a[href*='dj.1688.com/']",
          ),
        );
        const matched = anchors.find((anchor) => {
          const href = anchor.href;
          const idMatch = href.match(/offer\\/(\\d+)\\.html/i);
          return idMatch?.[1] === itemId;
        });
        return matched?.href || "";
      `,
    ) as (itemId: string) => string,
    args.itemId ?? "",
  );

  if (!href) {
    return {
      ok: false,
      confirmed: false,
      pageUrl: page.url(),
      error: "item_not_found",
    };
  }

  await page.goto(href, { waitUntil: "domcontentloaded" });
  const confirmed = /detail\.1688\.com\/offer\//i.test(page.url());
  return {
    ok: true,
    confirmed,
    pageUrl: page.url(),
    productUrl: page.url(),
    error: confirmed ? undefined : "detail_open_not_confirmed",
  };
}
