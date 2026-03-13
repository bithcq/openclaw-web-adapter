import type { BrowserContext, Frame, Page } from "playwright-core";
import { describe, expect, it } from "vitest";
import { pickFrame, pickTarget } from "./target.js";

function createFrame(url: string): Frame {
  return {
    url: () => url,
  } as unknown as Frame;
}

function createPage(url: string, frames: Frame[], mainFrame?: Frame): Page {
  return {
    url: () => url,
    frames: () => frames,
    mainFrame: () => mainFrame ?? frames[0] ?? createFrame("about:blank"),
  } as unknown as Page;
}

function createContext(pages: Page[]): BrowserContext {
  return {
    pages: () => pages,
  } as unknown as BrowserContext;
}

describe("web adapter core target", () => {
  it("picks the matched frame from the matched page", () => {
    const mainFrame = createFrame("https://example.com/main");
    const chatFrame = createFrame("https://example.com/def_cbu_web_im_core");
    const page = createPage(
      "https://example.com/def_cbu_web_im",
      [mainFrame, chatFrame],
      mainFrame,
    );
    const context = createContext([page]);

    const target = pickTarget(context, {
      pageUrlPattern: "def_cbu_web_im",
      frameUrlPattern: "def_cbu_web_im_core",
    });

    expect(target?.page).toBe(page);
    expect(target?.frame).toBe(chatFrame);
  });

  it("falls back to the first available page and frame", () => {
    const mainFrame = createFrame("https://example.com/main");
    const page = createPage("https://example.com/other", [mainFrame], mainFrame);
    const context = createContext([page]);

    const target = pickTarget(context, {
      pageUrlPattern: "missing-page",
    });

    expect(target?.page).toBe(page);
    expect(target?.frame).toBe(mainFrame);
  });

  it("returns null when no page contains a usable frame", () => {
    const page = createPage("https://example.com/other", [], null as unknown as Frame);
    const context = createContext([page]);

    expect(
      pickTarget(context, {
        frameUrlPattern: "missing-frame",
      }),
    ).toBeNull();
  });

  it("uses the page main frame when no frame pattern is configured", () => {
    const mainFrame = createFrame("https://example.com/main");
    const page = createPage("https://example.com/page", [mainFrame], mainFrame);

    expect(pickFrame(page, {})).toBe(mainFrame);
  });
});
