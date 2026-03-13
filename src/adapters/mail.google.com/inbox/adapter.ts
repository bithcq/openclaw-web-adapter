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
import { clickMailGoogleInboxItem, goToNextMailGoogleInboxPage } from "./actions.js";
import { scanMailGoogleInboxFrame } from "./scan.js";
import type {
  MailGoogleInboxActionResult,
  MailGoogleInboxClickItemArgs,
  MailGoogleInboxPageSnapshot,
} from "./types.js";

const MAIL_GOOGLE_INBOX_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "list",
    readOps: ["read_items", "read_pagination", "read_health", "read_metadata", "read_filters"],
    actionOps: ["click_item", "next_page"],
    confidence: 1,
  },
];

const MAIL_GOOGLE_PAGE_URL_RE = /https?:\/\/mail\.google\.com\/mail\/u\/\d+\//i;
const MAIL_GOOGLE_INBOX_URL_RE =
  /https?:\/\/mail\.google\.com\/mail\/u\/\d+\/#(?:inbox|starred|sent|drafts|all|spam|trash)(?:\?.*)?$/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailGoogleInboxAdapter implements WebPageAdapter<
  MailGoogleInboxPageSnapshot,
  MailGoogleInboxClickItemArgs,
  Record<string, unknown>
> {
  readonly id = "mail.google.com/inbox";
  readonly kind = "list" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_GOOGLE_PAGE_URL_RE.test(target.pageUrl);
    const inboxMatch = MAIL_GOOGLE_INBOX_URL_RE.test(target.pageUrl);
    const titleMatch = /Gmail/u.test(target.pageTitle ?? "");

    if (inboxMatch) {
      return { matched: true, confidence: 0.96 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.52, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_GOOGLE_INBOX_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailGoogleInboxPageSnapshot>> {
    const payload = await scanMailGoogleInboxFrame(target.frame);
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
    request: WebAdapterActionRequest<MailGoogleInboxClickItemArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailGoogleInboxActionResult | null = null;
    switch (request.action) {
      case "click_item": {
        const args = request.args ?? {};
        if (
          !args.itemId &&
          !args.threadId &&
          !args.legacyThreadId &&
          !args.sender &&
          !args.subject
        ) {
          return {
            ok: false,
            confirmed: false,
            attempt: 0,
            error: "missing_item_selector",
          };
        }
        result = await clickMailGoogleInboxItem(target.page, target.frame, args);
        break;
      }
      case "next_page":
        result = await goToNextMailGoogleInboxPage(target.page, target.frame);
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
        ...(result.threadId ? { threadId: result.threadId } : {}),
        ...(result.firstItemId ? { firstItemId: result.firstItemId } : {}),
      },
    };
  }
}

export function createMailGoogleInboxAdapter(): MailGoogleInboxAdapter {
  return new MailGoogleInboxAdapter();
}
