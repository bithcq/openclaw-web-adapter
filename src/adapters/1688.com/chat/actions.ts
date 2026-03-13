import process from "node:process";
import type { Frame, Page } from "playwright-core";
import { readOutgoingCounter, waitForOutgoingEcho } from "../../../core/confirm.js";
import type { Ali1688ChatOutboundResult, Ali1688ChatSelectorConfig } from "./types.js";

export async function selectAli1688Conversation(
  frame: Frame,
  selectors: Ali1688ChatSelectorConfig,
  conversationId: string,
): Promise<boolean> {
  const selectConversationFn = new Function(
    "payload",
    `
      const items = Array.from(document.querySelectorAll(payload.conversationSelectors.join(",")));
      const target = items.find(
        (item) =>
          item.getAttribute("id") === payload.conversationId ||
          item.getAttribute("data-conversation-id") === payload.conversationId ||
          item.getAttribute("data-id") === payload.conversationId,
      );
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (!target.classList.contains("active")) {
        target.scrollIntoView({ block: "center", inline: "nearest" });
        target.click();
      }
      return true;
    `,
  ) as (payload: { conversationId: string; conversationSelectors: string[] }) => boolean;

  const selected = await frame.evaluate(selectConversationFn, {
    conversationId,
    conversationSelectors: selectors.conversationItems,
  });

  if (!selected) {
    return false;
  }

  await frame
    .waitForFunction(
      new Function(
        "payload",
        `
          const items = Array.from(document.querySelectorAll(payload.conversationSelectors.join(",")));
          return items.some(
            (item) =>
              item.classList.contains("active") &&
              (item.getAttribute("id") === payload.conversationId ||
                item.getAttribute("data-conversation-id") === payload.conversationId ||
                item.getAttribute("data-id") === payload.conversationId),
          );
        `,
      ) as (payload: { conversationId: string; conversationSelectors: string[] }) => boolean,
      {
        conversationId,
        conversationSelectors: selectors.conversationItems,
      },
      {
        timeout: 5_000,
      },
    )
    .catch(() => undefined);

  return true;
}

export async function sendAli1688Text(params: {
  page: Page;
  frame: Frame;
  selectors: Ali1688ChatSelectorConfig;
  text: string;
  timeoutMs: number;
  attempts: number;
}): Promise<Ali1688ChatOutboundResult> {
  const inputSelector = params.selectors.input.join(",");
  const sendSelector = params.selectors.sendButton.join(",");
  const input = params.frame.locator(inputSelector).first();
  await input.waitFor({ state: "visible", timeout: 5_000 });

  for (let attempt = 1; attempt <= params.attempts; attempt += 1) {
    const baselineCount = await readOutgoingCounter(params.frame, params.selectors.messageItems);
    await input.click();

    const tagName = await input.evaluate((node) => node.tagName.toLowerCase());
    const isContentEditable = await input.evaluate(
      (node) => node instanceof HTMLElement && node.isContentEditable,
    );

    if (tagName === "input" || tagName === "textarea") {
      await input.fill(params.text);
    } else if (isContentEditable) {
      const selectAllShortcut = process.platform === "darwin" ? "Meta+A" : "Control+A";
      await params.page.keyboard.press(selectAllShortcut).catch(() => undefined);
      await params.page.keyboard.press("Backspace").catch(() => undefined);
      await params.page.keyboard.insertText(params.text);
    } else {
      await input.fill(params.text);
    }

    await params.frame.locator(sendSelector).first().click();
    const confirmed = await waitForOutgoingEcho({
      frame: params.frame,
      expectedText: params.text,
      baselineCount,
      timeoutMs: params.timeoutMs,
      messageSelectors: params.selectors.messageItems,
      textSelectors: params.selectors.messageText,
    });
    if (confirmed) {
      return {
        ok: true,
        confirmed: true,
        attempt,
        responseText: "confirmed_outbound_echo",
      };
    }
  }

  return {
    ok: false,
    confirmed: false,
    attempt: params.attempts,
    responseText: "outbound_echo_not_confirmed",
  };
}
