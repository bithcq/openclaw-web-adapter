import type {
  AdapterMatchResult,
  WebAdapterActionRequest,
  WebAdapterActionResult,
  WebAdapterCapability,
  WebAdapterSnapshot,
  WebAdapterTargetContext,
  WebPageAdapter,
} from "../../../contracts.js";
import { createUnsupportedActionResult } from "../../../contracts.js";
import {
  focusMailGoogleThreadComposer,
  inputMailGoogleThreadText,
  sendMailGoogleThreadText,
} from "./actions.js";
import { scanMailGoogleThreadFrame } from "./scan.js";
import type {
  MailGoogleThreadActionArgs,
  MailGoogleThreadActionResult,
  MailGoogleThreadPageSnapshot,
} from "./types.js";

const MAIL_GOOGLE_THREAD_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "detail",
    readOps: ["read_title", "read_body", "read_metadata", "read_health"],
    actionOps: ["focus_composer", "input_text", "send_text"],
    confidence: 1,
  },
];

const MAIL_GOOGLE_PAGE_URL_RE = /https?:\/\/mail\.google\.com\/mail\/u\/\d+\//i;
const MAIL_GOOGLE_THREAD_URL_RE =
  /https?:\/\/mail\.google\.com\/mail\/u\/\d+\/#(?:inbox|starred|sent|drafts|all|spam|trash)\/[^?]+(?:\?.*)?$/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailGoogleThreadAdapter implements WebPageAdapter<
  MailGoogleThreadPageSnapshot,
  MailGoogleThreadActionArgs,
  Record<string, unknown>
> {
  readonly id = "mail.google.com/thread";
  readonly kind = "detail" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_GOOGLE_PAGE_URL_RE.test(target.pageUrl);
    const threadMatch = MAIL_GOOGLE_THREAD_URL_RE.test(target.pageUrl);
    const titleMatch = /Gmail/u.test(target.pageTitle ?? "");

    if (threadMatch) {
      return { matched: true, confidence: 0.98 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.48, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_GOOGLE_THREAD_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailGoogleThreadPageSnapshot>> {
    const payload = await scanMailGoogleThreadFrame(target.frame);
    return {
      adapterId: this.id,
      kind: this.kind,
      capturedAt: Date.now(),
      target: normalizeTarget(target),
      health: {
        ok: payload.health.domHealthy && payload.health.isLoggedIn,
        isLoggedIn: payload.health.isLoggedIn,
        domHealthy: payload.health.domHealthy,
        warning: payload.health.warning,
      },
      payload,
    };
  }

  async perform(
    target: WebAdapterTargetContext,
    request: WebAdapterActionRequest<MailGoogleThreadActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailGoogleThreadActionResult | null = null;
    switch (request.action) {
      case "focus_composer":
        result = await focusMailGoogleThreadComposer(target.page);
        break;
      case "input_text": {
        const text = request.args?.text ?? "";
        result = await inputMailGoogleThreadText(target.page, text);
        break;
      }
      case "send_text": {
        const text = request.args?.text ?? "";
        if (!text.trim()) {
          return {
            ok: false,
            confirmed: false,
            attempt: 0,
            error: "missing_text",
          };
        }
        result = await sendMailGoogleThreadText(target.page, text);
        break;
      }
      default:
        return createUnsupportedActionResult(request.action);
    }

    return {
      ok: result.ok,
      confirmed: result.confirmed,
      attempt: 1,
      error: result.error,
      details: {
        pageUrl: result.pageUrl,
      },
    };
  }
}

export function createMailGoogleThreadAdapter(): MailGoogleThreadAdapter {
  return new MailGoogleThreadAdapter();
}
