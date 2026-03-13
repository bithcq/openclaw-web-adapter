import type { Frame } from "playwright-core";

function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim();
}

export function normalizeForCompare(value: string): string {
  return cleanText(value)
    .replace(/[，。、“”"':：；,.!?！？]/gu, "")
    .toLowerCase();
}

export async function readOutgoingCounter(
  frame: Frame,
  messageSelectors: string[],
): Promise<number> {
  const readFn = new Function(
    "payload",
    `
      const items = Array.from(document.querySelectorAll(payload.messageSelectors.join(",")));
      return items.filter((item) => item.classList.contains("self")).length;
    `,
  ) as (payload: { messageSelectors: string[] }) => number;
  return await frame.evaluate(readFn, {
    messageSelectors,
  });
}

export async function waitForOutgoingEcho(params: {
  frame: Frame;
  messageSelectors: string[];
  textSelectors: string[];
  expectedText: string;
  baselineCount: number;
  timeoutMs: number;
}): Promise<boolean> {
  const normalizedExpected = normalizeForCompare(params.expectedText).slice(0, 120);
  try {
    await params.frame.waitForFunction(
      new Function(
        "payload",
        `
          const normalize = (value) =>
            String(value ?? "")
              .replace(/\\\\s+/g, " ")
              .replace(/[，。、“”"':：；,.!?！？]/g, "")
              .trim()
              .toLowerCase();
          const pickText = (selectorsLocal, root) => {
            for (const selector of selectorsLocal) {
              const node = root.querySelector(selector);
              if (node) {
                return normalize(node.textContent || "");
              }
            }
            return normalize(root.textContent || "");
          };
          const items = Array.from(document.querySelectorAll(payload.messageSelectors.join(","))).filter((item) =>
            item.classList.contains("self"),
          );
          if (items.length <= payload.baselineCount) {
            return false;
          }
          const last = items[items.length - 1];
          const text = pickText(payload.textSelectors, last);
          return text.includes(payload.expectedText) || payload.expectedText.includes(text);
        `,
      ) as (payload: {
        expectedText: string;
        baselineCount: number;
        messageSelectors: string[];
        textSelectors: string[];
      }) => boolean,
      {
        expectedText: normalizedExpected,
        baselineCount: params.baselineCount,
        messageSelectors: params.messageSelectors,
        textSelectors: params.textSelectors,
      },
      { timeout: params.timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}
