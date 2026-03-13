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
import { scanAli1688DetailFrame } from "./scan.js";
import type { Ali1688DetailPageSnapshot } from "./types.js";

const ALI1688_DETAIL_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "detail",
    readOps: [
      "read_title",
      "read_body",
      "read_images",
      "read_metadata",
      "read_primary_fields",
      "read_health",
    ],
    actionOps: [],
    confidence: 1,
  },
];

const ALI1688_DETAIL_URL_RE = /https?:\/\/detail\.1688\.com\/offer\/\d+\.html\b/i;

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class Ali1688DetailAdapter implements WebPageAdapter<
  Ali1688DetailPageSnapshot,
  Record<string, unknown>,
  Record<string, unknown>
> {
  readonly id = "1688.com/detail";
  readonly kind = "detail" as const;

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    if (ALI1688_DETAIL_URL_RE.test(target.pageUrl)) {
      return { matched: true, confidence: 0.97 };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return ALI1688_DETAIL_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<Ali1688DetailPageSnapshot>> {
    const payload = await scanAli1688DetailFrame(target.frame);
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
    _target: WebAdapterTargetContext,
    request: WebAdapterActionRequest<Record<string, unknown>>,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    return createUnsupportedActionResult(request.action);
  }
}

export function createAli1688DetailAdapter(): Ali1688DetailAdapter {
  return new Ali1688DetailAdapter();
}
