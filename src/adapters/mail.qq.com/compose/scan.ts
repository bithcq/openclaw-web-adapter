import type { Frame } from "playwright-core";
import type { MailQqComposeDraftSnapshot } from "./types.js";

function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim();
}

export async function scanMailQqComposeFrame(frame: Frame): Promise<MailQqComposeDraftSnapshot> {
  const pageFunction = new Function(
    "payload",
    `
      const frameUrl = payload.frameUrl;
      const cleanText = (value) => String(value ?? "").replace(/\\\\s+/g, " ").trim();
      const toValue = document.querySelector("#to")?.value || "";
      const subject = document.querySelector("#subject")?.value || "";
      const recipients = toValue
        .split(/[;,，\\n]/u)
        .map((value) => cleanText(value))
        .filter((value) => value.length > 0);
      const sendButton = document.querySelector("[name='sendbtn']");
      const pageText = cleanText(document.body?.innerText || "");
      const looksLoggedOut = /扫码登录|重新登录|登录邮箱/u.test(pageText);
      const hasComposer = Boolean(
        document.querySelector("#to") && document.querySelector("#subject") && document.querySelector("[name='sendbtn']"),
      );
      return {
        title: document.title,
        url: window.location.href,
        frameUrl,
        recipients,
        subject: cleanText(subject),
        sendEnabled: cleanText(sendButton?.getAttribute("disabled")) !== "true",
        health: {
          hasComposer,
          isLoggedIn: !looksLoggedOut,
          domHealthy: hasComposer,
          warning: !hasComposer ? "missing qq compose fields or send button" : undefined,
        },
      };
    `,
  ) as (payload: {
    frameUrl: string;
  }) => Omit<MailQqComposeDraftSnapshot, "bodyText" | "composerVisible">;

  const base = await frame.evaluate(pageFunction, { frameUrl: frame.url() });

  const editorFrame = frame.childFrames()[0];
  const bodyText = editorFrame
    ? cleanText(
        await editorFrame.evaluate(
          new Function("return document.body?.innerText || '';") as () => string,
        ),
      )
    : "";

  return {
    ...base,
    bodyText,
    composerVisible: base.health.hasComposer,
  };
}
