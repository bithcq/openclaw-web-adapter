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
import { clickMailQqInboxItem, goToNextMailQqInboxPage } from "./actions.js";
import { scanMailQqInboxFrame } from "./scan.js";
import type {
  MailQqInboxActionResult,
  MailQqInboxClickItemArgs,
  MailQqInboxPageSnapshot,
} from "./types.js";

const MAIL_QQ_INBOX_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "list",
    readOps: ["read_items", "read_pagination", "read_health", "read_metadata"],
    actionOps: ["click_item", "next_page"],
    confidence: 1,
  },
];

const MAIL_QQ_PAGE_URL_RE = /https?:\/\/mail\.qq\.com\/cgi-bin\/(?:frame_html|mail_list)/i;
const MAIL_QQ_INBOX_FRAME_URL_RE =
  /https?:\/\/mail\.qq\.com\/cgi-bin\/mail_list\b.*(?:[?&]folderid=1\b|[?&]s=inbox\b)/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class MailQqInboxAdapter implements WebPageAdapter<
  MailQqInboxPageSnapshot,
  MailQqInboxClickItemArgs,
  Record<string, unknown>
> {
  readonly id = "mail.qq.com/inbox";
  readonly kind = "list" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = MAIL_QQ_PAGE_URL_RE.test(target.pageUrl);
    const frameMatch = MAIL_QQ_INBOX_FRAME_URL_RE.test(target.frameUrl);
    const titleMatch = /QQ邮箱.*收件箱|收件箱.*QQ邮箱/u.test(target.pageTitle ?? "");

    if (frameMatch) {
      return { matched: true, confidence: 0.99 };
    }
    if (pageMatch && titleMatch) {
      return { matched: true, confidence: 0.72, reason: "mail_page_title_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return MAIL_QQ_INBOX_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<MailQqInboxPageSnapshot>> {
    const payload = await scanMailQqInboxFrame(target.frame);
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
    request: WebAdapterActionRequest<MailQqInboxClickItemArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: MailQqInboxActionResult | null = null;
    switch (request.action) {
      case "click_item": {
        const args = request.args ?? {};
        if (!args.itemId && !args.mailId && !args.sender && !args.subject) {
          return {
            ok: false,
            confirmed: false,
            attempt: 0,
            error: "missing_item_selector",
          };
        }
        result = await clickMailQqInboxItem(target.page, target.frame, args);
        break;
      }
      case "next_page":
        result = await goToNextMailQqInboxPage(target.frame);
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
        ...(result.mailId ? { mailId: result.mailId } : {}),
        ...(result.currentPage !== undefined ? { currentPage: result.currentPage } : {}),
        ...(result.nextPage !== undefined ? { nextPage: result.nextPage } : {}),
      },
    };
  }
}

export function createMailQqInboxAdapter(): MailQqInboxAdapter {
  return new MailQqInboxAdapter();
}
