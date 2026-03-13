import process from "node:process";
import type { Frame, Locator, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { readOutgoingCounter, waitForOutgoingEcho } from "../../../core/confirm.js";
import { selectAli1688Conversation, sendAli1688Text } from "./actions.js";

vi.mock("../../../core/confirm.js", () => ({
  readOutgoingCounter: vi.fn(),
  waitForOutgoingEcho: vi.fn(),
}));

const selectors = {
  conversationItems: [".conversation-item"],
  conversationTitle: [".name"],
  conversationUnread: [".badge"],
  messageItems: [".message-item"],
  messageText: [".content"],
  input: [".composer"],
  sendButton: [".send-btn"],
};

function createLocator(overrides: Partial<Locator> = {}): Locator {
  const locator = {
    first: vi.fn(),
    waitFor: vi.fn(),
    click: vi.fn(),
    evaluate: vi.fn(),
    fill: vi.fn(),
    ...overrides,
  } as unknown as Locator;
  vi.mocked(locator.first).mockReturnValue(locator);
  return locator;
}

describe("ali1688 chat adapter actions", () => {
  it("selects a conversation and waits for it to become active", async () => {
    const frame = {
      evaluate: vi.fn().mockResolvedValue(true),
      waitForFunction: vi.fn().mockResolvedValue(undefined),
    } as unknown as Frame;

    await expect(selectAli1688Conversation(frame, selectors, "conversation-1")).resolves.toBe(true);

    expect(frame.evaluate).toHaveBeenCalledOnce();
    expect(frame.waitForFunction).toHaveBeenCalledOnce();
  });

  it("returns false when the target conversation cannot be found", async () => {
    const frame = {
      evaluate: vi.fn().mockResolvedValue(false),
      waitForFunction: vi.fn(),
    } as unknown as Frame;

    await expect(selectAli1688Conversation(frame, selectors, "conversation-missing")).resolves.toBe(
      false,
    );

    expect(frame.waitForFunction).not.toHaveBeenCalled();
  });

  it("sends contenteditable text and confirms the first outbound echo", async () => {
    vi.mocked(readOutgoingCounter).mockResolvedValue(3);
    vi.mocked(waitForOutgoingEcho).mockResolvedValue(true);

    const input = createLocator({
      evaluate: vi.fn().mockResolvedValueOnce("div").mockResolvedValueOnce(true),
    });
    const sendButton = createLocator();
    const frame = {
      locator: vi.fn((value: string) => {
        if (value === selectors.input.join(",")) {
          return input;
        }
        if (value === selectors.sendButton.join(",")) {
          return sendButton;
        }
        throw new Error(`unexpected locator: ${value}`);
      }),
    } as unknown as Frame;
    const page = {
      keyboard: {
        press: vi.fn().mockResolvedValue(undefined),
        insertText: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Page;

    const result = await sendAli1688Text({
      page,
      frame,
      selectors,
      text: "你好，我们可以做这个规格。",
      timeoutMs: 8_000,
      attempts: 2,
    });

    expect(result).toEqual({
      ok: true,
      confirmed: true,
      attempt: 1,
      responseText: "confirmed_outbound_echo",
    });
    expect(input.fill).not.toHaveBeenCalled();
    expect(page.keyboard.press).toHaveBeenCalledWith(
      process.platform === "darwin" ? "Meta+A" : "Control+A",
    );
    expect(page.keyboard.insertText).toHaveBeenCalledWith("你好，我们可以做这个规格。");
    expect(sendButton.click).toHaveBeenCalledOnce();
    expect(waitForOutgoingEcho).toHaveBeenCalledWith({
      frame,
      expectedText: "你好，我们可以做这个规格。",
      baselineCount: 3,
      timeoutMs: 8_000,
      messageSelectors: selectors.messageItems,
      textSelectors: selectors.messageText,
    });
  });

  it("retries textarea sends until the outbound echo appears", async () => {
    vi.mocked(readOutgoingCounter).mockResolvedValue(1);
    vi.mocked(waitForOutgoingEcho).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const inputEvaluate = vi
      .fn()
      .mockResolvedValueOnce("textarea")
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce("textarea")
      .mockResolvedValueOnce(false);
    const input = createLocator({
      evaluate: inputEvaluate,
    });
    const sendButton = createLocator();
    const frame = {
      locator: vi.fn((value: string) => {
        if (value === selectors.input.join(",")) {
          return input;
        }
        if (value === selectors.sendButton.join(",")) {
          return sendButton;
        }
        throw new Error(`unexpected locator: ${value}`);
      }),
    } as unknown as Frame;
    const page = {
      keyboard: {
        press: vi.fn(),
        insertText: vi.fn(),
      },
    } as unknown as Page;

    const result = await sendAli1688Text({
      page,
      frame,
      selectors,
      text: "请发一下起订量和交期。",
      timeoutMs: 6_000,
      attempts: 2,
    });

    expect(result).toEqual({
      ok: true,
      confirmed: true,
      attempt: 2,
      responseText: "confirmed_outbound_echo",
    });
    expect(input.fill).toHaveBeenNthCalledWith(1, "请发一下起订量和交期。");
    expect(input.fill).toHaveBeenNthCalledWith(2, "请发一下起订量和交期。");
    expect(sendButton.click).toHaveBeenCalledTimes(2);
  });
});
