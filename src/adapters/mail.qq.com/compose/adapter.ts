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
  focusMailQqComposeEditor,
  inputMailQqComposeText,
  sendMailQqComposeDraft,
} from "./actions.js";
import { scanMailQqComposeFrame } from "./scan.js";
import type {
  MailQqComposeActionArgs,
  MailQqComposeActionResult,
  MailQqComposeDraftSnapshot,
} from "./types.js";

const MAIL_QQ_COMPOSE_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "form",
    readOps: ["read_composer", "read_primary_fields", "read_health"],
    actionOps: ["focus_composer", "input_text", "send_text"],
    confidence: 1,
  },
];

const MAIL_QQ_PAGE_URL_RE = /https?:\/\/mail\.qq\.com\/cgi-bin\/(?:frame_html|readtemplate)/i;
const MAIL_QQ_COMPOSE_URL_RE =
  /https?:\/\/mail\.qq\.com\/cgi-bin\/readtemplate\b.*[?&]t=compose\b/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailQqComposeAdapter implements WebPageAdapter<
  MailQqComposeDraftSnapshot,
  MailQqComposeActionArgs,
  Record<string, unknown>
> {
  readonly id = "mail.qq.com/compose";
  readonly kind = "form" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_QQ_PAGE_URL_RE.test(target.pageUrl);
    const frameMatch = MAIL_QQ_COMPOSE_URL_RE.test(target.frameUrl);
    const titleMatch = /QQ邮箱/u.test(target.pageTitle ?? "");

    if (frameMatch) {
      return { matched: true, confidence: 0.99 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.56, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_QQ_COMPOSE_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailQqComposeDraftSnapshot>> {
    const payload = await scanMailQqComposeFrame(target.frame);
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
    request: WebAdapterActionRequest<MailQqComposeActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailQqComposeActionResult | null = null;
    switch (request.action) {
      case "focus_composer":
        result = await focusMailQqComposeEditor(target.frame);
        break;
      case "input_text":
        result = await inputMailQqComposeText(target.frame, request.args?.text ?? "");
        break;
      case "send_text":
        result = await sendMailQqComposeDraft(target.frame, request.args ?? {});
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
        ...(result.recipientCount !== undefined ? { recipientCount: result.recipientCount } : {}),
      },
    };
  }
}

export function createMailQqComposeAdapter(): MailQqComposeAdapter {
  return new MailQqComposeAdapter();
}
