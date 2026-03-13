import { describe, expect, it } from "vitest";
import { parseOutboundRequestPayload } from "./runner.js";

describe("1688 chat runner outbound payload parsing", () => {
  it("returns null for invalid json", () => {
    expect(parseOutboundRequestPayload("{")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(
      parseOutboundRequestPayload(
        JSON.stringify({
          conversationId: "conv-1",
          text: "hello",
        }),
      ),
    ).toBeNull();
  });

  it("parses valid outbound requests", () => {
    expect(
      parseOutboundRequestPayload(
        JSON.stringify({
          conversationId: "conv-1",
          customerName: "Alice",
          text: "hello",
          idempotencyKey: "idem-1",
        }),
      ),
    ).toEqual({
      conversationId: "conv-1",
      customerId: undefined,
      customerName: "Alice",
      text: "hello",
      idempotencyKey: "idem-1",
    });
  });
});
