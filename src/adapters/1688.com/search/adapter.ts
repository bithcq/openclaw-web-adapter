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
import { openAli1688SearchItem } from "./actions.js";
import { scanAli1688SearchFrame } from "./scan.js";
import type {
  Ali1688SearchActionArgs,
  Ali1688SearchActionResult,
  Ali1688SearchPageSnapshot,
} from "./types.js";

const ALI1688_SEARCH_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "list",
    readOps: ["read_items", "read_metadata", "read_health"],
    actionOps: ["click_item", "open_link"],
    confidence: 1,
  },
];

const ALI1688_SEARCH_URL_RE = /https?:\/\/s\.1688\.com\/selloffer\/offer_search\.htm\b/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class Ali1688SearchAdapter implements WebPageAdapter<
  Ali1688SearchPageSnapshot,
  Ali1688SearchActionArgs,
  Record<string, unknown>
> {
  readonly id = "1688.com/search";
  readonly kind = "list" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    if (ALI1688_SEARCH_URL_RE.test(target.pageUrl)) {
      return { matched: true, confidence: 0.97 };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return ALI1688_SEARCH_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<Ali1688SearchPageSnapshot>> {
    const payload = await scanAli1688SearchFrame(target.frame);
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
    request: WebAdapterActionRequest<Ali1688SearchActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    let result: Ali1688SearchActionResult | null = null;
    switch (request.action) {
      case "click_item":
      case "open_link":
        result = await openAli1688SearchItem(target.page, request.args ?? {});
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
        ...(result.productUrl ? { productUrl: result.productUrl } : {}),
      },
    };
  }
}

export function createAli1688SearchAdapter(): Ali1688SearchAdapter {
  return new Ali1688SearchAdapter();
}
