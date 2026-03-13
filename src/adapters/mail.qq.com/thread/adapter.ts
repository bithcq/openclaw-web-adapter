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
  focusMailQqThreadComposer,
  inputMailQqThreadText,
  sendMailQqThreadText,
} from "./actions.js";
import { scanMailQqThreadFrame } from "./scan.js";
import type {
  MailQqThreadActionArgs,
  MailQqThreadActionResult,
  MailQqThreadPageSnapshot,
} from "./types.js";

const MAIL_QQ_THREAD_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "detail",
    readOps: ["read_title", "read_body", "read_metadata", "read_health"],
    actionOps: ["focus_composer", "input_text", "send_text"],
    confidence: 1,
  },
];

const MAIL_QQ_PAGE_URL_RE = /https?:\/\/mail\.qq\.com\/cgi-bin\/(?:frame_html|readmail)/i;
const MAIL_QQ_THREAD_URL_RE = /https?:\/\/mail\.qq\.com\/cgi-bin\/readmail\b/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailQqThreadAdapter implements WebPageAdapter<
  MailQqThreadPageSnapshot,
  MailQqThreadActionArgs,
  Record<string, unknown>
> {
  readonly id = "mail.qq.com/thread";
  readonly kind = "detail" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_QQ_PAGE_URL_RE.test(target.pageUrl);
    const frameMatch = MAIL_QQ_THREAD_URL_RE.test(target.frameUrl);
    const titleMatch = /QQ邮箱/u.test(target.pageTitle ?? "");

    if (frameMatch) {
      return { matched: true, confidence: 0.98 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.58, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_QQ_THREAD_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailQqThreadPageSnapshot>> {
    const payload = await scanMailQqThreadFrame(target.frame);
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
    request: WebAdapterActionRequest<MailQqThreadActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailQqThreadActionResult | null = null;
    switch (request.action) {
      case "focus_composer":
        result = await focusMailQqThreadComposer(target.frame);
        break;
      case "input_text":
        result = await inputMailQqThreadText(target.frame, request.args?.text ?? "");
        break;
      case "send_text":
        result = await sendMailQqThreadText(target.frame, request.args?.text ?? "");
        break;
      default:
        return createUnsupportedActionResult(request.action);
    }

    return {
      ok: result.ok,
      confirmed: result.confirmed,
      attempt: 1,
      error: result.error,
      details: {
        frameUrl: result.frameUrl,
      },
    };
  }
}

export function createMailQqThreadAdapter(): MailQqThreadAdapter {
  return new MailQqThreadAdapter();
}
