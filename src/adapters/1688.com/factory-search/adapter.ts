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
import { performAli1688FactorySearchAction } from "./actions.js";
import { scanAli1688FactorySearchFrame } from "./scan.js";
import type { Ali1688FactorySearchActionArgs, Ali1688FactorySearchPageSnapshot } from "./types.js";

const ALI1688_FACTORY_SEARCH_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "list",
    readOps: ["read_items", "read_metadata", "read_health"],
    actionOps: ["search_keyword", "click_item", "open_link"],
    confidence: 1,
  },
];

const ALI1688_FACTORY_SEARCH_URL_RE =
  /https?:\/\/s\.1688\.com\/company\/pc\/factory_search\.htm\b/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class Ali1688FactorySearchAdapter implements WebPageAdapter<
  Ali1688FactorySearchPageSnapshot,
  Ali1688FactorySearchActionArgs,
  Record<string, unknown>
> {
  readonly id = "1688.com/factory-search";
  readonly kind = "list" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    if (ALI1688_FACTORY_SEARCH_URL_RE.test(target.pageUrl)) {
      return { matched: true, confidence: 0.98 };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return ALI1688_FACTORY_SEARCH_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<Ali1688FactorySearchPageSnapshot>> {
    const payload = await scanAli1688FactorySearchFrame(target.frame);
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
    request: WebAdapterActionRequest<Ali1688FactorySearchActionArgs>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    switch (request.action) {
      case "search_keyword":
      case "click_item":
      case "open_link": {
        const result = await performAli1688FactorySearchAction(
          target.page,
          request.action,
          request.args ?? {},
        );
        return {
          ok: result.ok,
          confirmed: result.confirmed,
          attempt: 1,
          error: result.error,
          details: {
            pageUrl: result.pageUrl,
            ...(result.detailUrl ? { detailUrl: result.detailUrl } : {}),
            ...(result.itemId ? { itemId: result.itemId } : {}),
          },
        };
      }
      default:
        return createUnsupportedActionResult(request.action);
    }
  }
}

export function createAli1688FactorySearchAdapter(): Ali1688FactorySearchAdapter {
  return new Ali1688FactorySearchAdapter();
}
