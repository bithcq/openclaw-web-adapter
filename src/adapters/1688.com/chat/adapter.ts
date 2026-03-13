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
import { sendAli1688Text, selectAli1688Conversation } from "./actions.js";
import { scanAli1688ChatFrame } from "./scan.js";
import { DEFAULT_ALI1688_CHAT_SELECTORS } from "./selectors.js";
import type {
  Ali1688ChatOutboundResult,
  Ali1688ChatPageSnapshot,
  Ali1688ChatSelectorConfig,
} from "./types.js";

const CHAT_CAPABILITIES: WebAdapterCapability[] = [
  {
    kind: "chat",
    readOps: ["list_conversations", "read_messages", "read_composer", "read_health"],
    actionOps: [
      "select_conversation",
      "focus_composer",
      "input_text",
      "send_text",
      "confirm_outbound",
    ],
    confidence: 1,
  },
];

type Ali1688SendTextArgs = {
  text?: string;
  attempts?: number;
};

type Ali1688SelectConversationArgs = {
  conversationId?: string;
};

function normalizeTarget(target: WebAdapterTargetContext) {
  return {
    targetId: target.targetId,
    pageUrl: target.pageUrl,
    frameUrl: target.frameUrl,
    pageTitle: target.pageTitle,
  };
}

export class Ali1688ChatAdapter implements WebPageAdapter<
  Ali1688ChatPageSnapshot,
  Record<string, unknown>,
  Record<string, unknown>
> {
  readonly id = "1688.com/chat";
  readonly kind = "chat" as const;

  constructor(
    private readonly selectors: Ali1688ChatSelectorConfig = DEFAULT_ALI1688_CHAT_SELECTORS,
  ) {}

  async match(target: WebAdapterTargetContext): Promise<AdapterMatchResult> {
    const pageMatch = this.selectors.pageUrlPattern
      ? new RegExp(this.selectors.pageUrlPattern, "i").test(target.pageUrl)
      : true;
    const frameMatch = this.selectors.frameUrlPattern
      ? new RegExp(this.selectors.frameUrlPattern, "i").test(target.frameUrl)
      : true;

    if (pageMatch && frameMatch) {
      return { matched: true, confidence: 0.98 };
    }
    if (pageMatch || frameMatch) {
      return { matched: true, confidence: 0.55, reason: "partial_url_match" };
    }
    return { matched: false, confidence: 0, reason: "url_patterns_missed" };
  }

  describeCapabilities(): WebAdapterCapability[] {
    return CHAT_CAPABILITIES;
  }

  async scan(
    target: WebAdapterTargetContext,
  ): Promise<WebAdapterSnapshot<Ali1688ChatPageSnapshot>> {
    const payload = await scanAli1688ChatFrame(target.frame, this.selectors);
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
    request: WebAdapterActionRequest,
  ): Promise<WebAdapterActionResult<Record<string, unknown>>> {
    switch (request.action) {
      case "select_conversation": {
        const args = (request.args ?? {}) as Ali1688SelectConversationArgs;
        if (!args.conversationId) {
          return {
            ok: false,
            confirmed: false,
            attempt: 0,
            error: "missing_conversation_id",
          };
        }
        const selected = await selectAli1688Conversation(
          target.frame,
          this.selectors,
          args.conversationId,
        );
        return {
          ok: selected,
          confirmed: selected,
          attempt: 1,
          ...(selected ? {} : { error: "conversation_not_found" }),
          details: { conversationId: args.conversationId },
        };
      }
      case "send_text": {
        const args = (request.args ?? {}) as Ali1688SendTextArgs;
        if (!args.text?.trim()) {
          return {
            ok: false,
            confirmed: false,
            attempt: 0,
            error: "missing_text",
          };
        }
        const result: Ali1688ChatOutboundResult = await sendAli1688Text({
          page: target.page,
          frame: target.frame,
          selectors: this.selectors,
          text: args.text,
          timeoutMs: request.timeoutMs ?? 8_000,
          attempts: args.attempts ?? 2,
        });
        return {
          ok: result.ok,
          confirmed: result.confirmed,
          attempt: result.attempt,
          ...(result.ok ? {} : { error: result.responseText }),
          details: {
            responseText: result.responseText,
          },
        };
      }
      default:
        return createUnsupportedActionResult(request.action);
    }
  }
}

export function createAli1688ChatAdapter(
  selectors?: Ali1688ChatSelectorConfig,
): Ali1688ChatAdapter {
  return new Ali1688ChatAdapter(selectors);
}
