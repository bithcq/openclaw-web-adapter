import type { BrowserContext, Frame, Page } from "playwright-core";
import type { WebAdapterTargetContext } from "../contracts.js";

export type WebAdapterTargetSelectors = {
  pageUrlPattern?: string;
  frameUrlPattern?: string;
};

export type WebAdapterPageTarget = {
  page: Page;
  frame: Frame;
};

export async function buildTargetContext(
  target: WebAdapterPageTarget,
): Promise<WebAdapterTargetContext> {
  return {
    page: target.page,
    frame: target.frame,
    targetId: `${target.page.url()}::${target.frame.url()}`,
    pageUrl: target.page.url(),
    frameUrl: target.frame.url(),
    pageTitle: await target.page.title().catch(() => undefined),
  };
}

export function pickFrame(page: Page, selectors: WebAdapterTargetSelectors): Frame | null {
  const regex = selectors.frameUrlPattern ? new RegExp(selectors.frameUrlPattern, "i") : null;
  if (!regex) {
    return page.mainFrame();
  }
  return page.frames().find((frame) => regex.test(frame.url())) ?? null;
}

export function pickTarget(
  context: BrowserContext,
  selectors: WebAdapterTargetSelectors,
): WebAdapterPageTarget | null {
  const regex = selectors.pageUrlPattern ? new RegExp(selectors.pageUrlPattern, "i") : null;
  const pages = context.pages();
  for (const page of pages) {
    if (regex && !regex.test(page.url())) {
      continue;
    }
    const frame = pickFrame(page, selectors);
    if (frame) {
      return { page, frame };
    }
  }

  const fallbackPage = pages[0];
  if (!fallbackPage) {
    return null;
  }
  const fallbackFrame = pickFrame(fallbackPage, selectors);
  if (!fallbackFrame) {
    return null;
  }
  return { page: fallbackPage, frame: fallbackFrame };
}
