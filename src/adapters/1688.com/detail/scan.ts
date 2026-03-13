import type { Frame } from "playwright-core";
import type { Ali1688DetailPageSnapshot } from "./types.js";

export async function scanAli1688DetailFrame(frame: Frame): Promise<Ali1688DetailPageSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .map((node) => cleanText(node.textContent))
        .filter((value) => value.length > 0);
      const productTitle = headings[1] ?? headings[0] ?? "";
      const companyName = headings[0];
      const priceText =
        cleanText(document.querySelector(".price-comp, .price-info")?.textContent) || undefined;
      const soldText = cleanText(document.querySelector(".sold-count")?.textContent) || undefined;
      const skuHighlights = Array.from(document.querySelectorAll(".feature-item"))
        .map((item) => cleanText(item.textContent))
        .filter((value) => value.length > 0)
        .slice(0, 12);
      const attributes = {};
      const rows = Array.from(document.querySelectorAll(".ant-descriptions-row"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll(".ant-descriptions-item"));
        for (const cell of cells) {
          const label = cleanText(cell.querySelector(".ant-descriptions-item-label")?.textContent);
          const value = cleanText(cell.querySelector(".ant-descriptions-item-content")?.textContent);
          if (label && value) {
            attributes[label] = value;
          }
        }
      }
      const imageUrls = Array.from(document.querySelectorAll("img"))
        .map((image) => image.getAttribute("src") || image.getAttribute("data-src") || "")
        .map((value) => cleanText(value))
        .filter((value) => /^https?:\\/\\//i.test(value))
        .slice(0, 20);
      const pageText = cleanText(document.body?.innerText || "");
      const hasTitle = productTitle.length > 0;
      const hasPrice = Boolean(priceText);
      const domHealthy = hasTitle && hasPrice;
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        productTitle,
        companyName,
        priceText,
        soldText,
        skuHighlights,
        attributes,
        imageUrls,
        health: {
          hasTitle,
          hasPrice,
          isLoggedIn: !/登录/u.test(pageText),
          domHealthy,
          warning: !domHealthy ? "missing 1688 detail title or price anchors" : undefined,
        },
      };
    `,
  ) as (payload: { frameUrl: string }) => Ali1688DetailPageSnapshot;

  return await frame.evaluate(pageFunction, { frameUrl: frame.url() });
}
