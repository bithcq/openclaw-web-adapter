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
  focusMailGoogleComposeEditor,
  inputMailGoogleComposeText,
  sendMailGoogleComposeDraft,
} from "./actions.js";
import { scanMailGoogleComposeFrame } from "./scan.js";
import type {
  MailGoogleComposeActionArgs,
  MailGoogleComposeActionResult,
  MailGoogleComposeDraftSnapshot,
} from "./types.js";

const MAIL_GOOGLE_COMPOSE_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "form",
    readOps: ["read_composer", "read_primary_fields", "read_health"],
    actionOps: ["focus_composer", "input_text", "send_text"],
    confidence: 1,
  },
];

const MAIL_GOOGLE_PAGE_URL_RE = /https?:\/\/mail\.google\.com\/mail\/u\/\d+\//i;
const MAIL_GOOGLE_COMPOSE_URL_RE = /https?:\/\/mail\.google\.com\/mail\/u\/\d+\/#.+[?&]compose=/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailGoogleComposeAdapter implements WebPageAdapter<
  MailGoogleComposeDraftSnapshot,
  MailGoogleComposeActionArgs,
  Record<string, unknown>
> {
  readonly id = "mail.google.com/compose";
  readonly kind = "form" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_GOOGLE_PAGE_URL_RE.test(target.pageUrl);
    const composeMatch = MAIL_GOOGLE_COMPOSE_URL_RE.test(target.pageUrl);
    const titleMatch = /Gmail/u.test(target.pageTitle ?? "");

    if (composeMatch) {
      return { matched: true, confidence: 0.99 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.45, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_GOOGLE_COMPOSE_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailGoogleComposeDraftSnapshot>> {
    const payload = await scanMailGoogleComposeFrame(target.frame);
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
    request: WebAdapterActionRequest<MailGoogleComposeActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailGoogleComposeActionResult | null = null;
    switch (request.action) {
      case "focus_composer":
        result = await focusMailGoogleComposeEditor(target.page);
        break;
      case "input_text": {
        const text = request.args?.text ?? "";
        result = await inputMailGoogleComposeText(target.page, text);
        break;
      }
      case "send_text":
        result = await sendMailGoogleComposeDraft(target.page, request.args ?? {});
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
        pageUrl: result.pageUrl,
        ...(result.recipientCount !== undefined ? { recipientCount: result.recipientCount } : {}),
      },
    };
  }
}

export function createMailGoogleComposeAdapter(): MailGoogleComposeAdapter {
  return new MailGoogleComposeAdapter();
}
