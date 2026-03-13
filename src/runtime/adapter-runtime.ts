import type {
  WebAdapterActionRequest,
  WebAdapterActionResult,
  WebAdapterSnapshot,
  WebAdapterTargetContext,
} from "../contracts.js";
import { WebAdapterRegistry } from "../registry.js";

export async function resolveAdapterForTarget(
  registry: WebAdapterRegistry,
  target: WebAdapterTargetContext,
) {
  return await registry.selectBestMatch(target);
}

export async function scanWithBestAdapter(
  registry: WebAdapterRegistry,
  target: WebAdapterTargetContext,
): Promise<WebAdapterSnapshot> {
  const selected = await registry.selectBestMatch(target);
  if (!selected) {
    throw new Error("unsupported_page");
  }
  return await selected.adapter.scan(target);
}

export async function performWithBestAdapter(
  registry: WebAdapterRegistry,
  target: WebAdapterTargetContext,
  request: WebAdapterActionRequest,
): Promise<WebAdapterActionResult> {
  const selected = await registry.selectBestMatch(target);
  if (!selected) {
    return {
      ok: false,
      confirmed: false,
      attempt: 0,
      error: "unsupported_page",
      details: {
        pageUrl: target.pageUrl,
        frameUrl: target.frameUrl,
        action: request.action,
      },
    };
  }
  return await selected.adapter.perform(target, request);
}
