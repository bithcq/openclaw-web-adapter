import type { Frame, Page } from "playwright-core";

export type WebAdapterKind = "chat" | "article" | "list" | "detail" | "feed" | "form";

export type WebAdapterReadOp =
  | "list_conversations"
  | "read_messages"
  | "read_composer"
  | "read_health"
  | "read_title"
  | "read_author"
  | "read_publish_time"
  | "read_body"
  | "read_images"
  | "read_items"
  | "read_pagination"
  | "read_filters"
  | "read_primary_fields"
  | "read_media"
  | "read_metadata";

export type WebAdapterActionOp =
  | "search_keyword"
  | "select_conversation"
  | "focus_composer"
  | "input_text"
  | "send_text"
  | "confirm_outbound"
  | "scroll_to"
  | "expand_more"
  | "open_link"
  | "click_item"
  | "next_page"
  | "apply_filter"
  | "expand_section"
  | "open_media";

export type WebAdapterCapability = {
  kind: WebAdapterKind;
  readOps: WebAdapterReadOp[];
  actionOps: WebAdapterActionOp[];
  confidence?: number;
};

export type WebAdapterTargetContext = {
  page: Page;
  frame: Frame;
  targetId: string;
  pageUrl: string;
  frameUrl: string;
  pageTitle?: string;
};

export type AdapterMatchResult = {
  matched: boolean;
  confidence: number;
  reason?: string;
};

export type WebAdapterHealth = {
  ok: boolean;
  isLoggedIn?: boolean;
  domHealthy?: boolean;
  warning?: string;
  details?: Record<string, unknown>;
};

export type WebAdapterSnapshot<Payload = unknown> = {
  adapterId: string;
  kind: WebAdapterKind;
  capturedAt: number;
  target: Pick<WebAdapterTargetContext, "targetId" | "pageUrl" | "frameUrl" | "pageTitle">;
  health: WebAdapterHealth;
  payload: Payload;
};

export type WebAdapterActionRequest<Args = Record<string, unknown>> = {
  action: WebAdapterActionOp;
  args?: Args;
  timeoutMs?: number;
  idempotencyKey?: string;
  requestId?: string;
};

export type WebAdapterActionResult<Details = unknown> = {
  ok: boolean;
  confirmed: boolean;
  attempt: number;
  error?: string;
  details?: Details;
};

export interface WebPageAdapter<
  SnapshotPayload = unknown,
  ActionArgs = Record<string, unknown>,
  ActionDetails = unknown,
> {
  readonly id: string;
  readonly kind: WebAdapterKind;
  match(target: WebAdapterTargetContext): Promise<AdapterMatchResult>;
  describeCapabilities(): WebAdapterCapability[];
  scan(target: WebAdapterTargetContext): Promise<WebAdapterSnapshot<SnapshotPayload>>;
  perform(
    target: WebAdapterTargetContext,
    request: WebAdapterActionRequest<ActionArgs>,
  ): Promise<WebAdapterActionResult<ActionDetails>>;
}

export function createUnsupportedActionResult(
  action: WebAdapterActionOp,
): WebAdapterActionResult<Record<string, unknown>> {
  return {
    ok: false,
    confirmed: false,
    attempt: 0,
    error: "unsupported_action",
    details: { action },
  };
}
