import { describe, expect, it, vi } from "vitest";
import { resolveWebAdapterCdpConnection, resolveWebAdapterCdpUrl } from "./browser.js";
import { resolveRelayAuthTokenForPort } from "./relay-auth.js";

vi.mock("./relay-auth.js", () => ({
  resolveRelayAuthTokenForPort: vi.fn(),
}));

describe("web adapter core browser", () => {
  it("adds relay token and cdp path for local relay urls", async () => {
    vi.mocked(resolveRelayAuthTokenForPort).mockResolvedValue("relay-token");

    await expect(resolveWebAdapterCdpUrl("http://127.0.0.1:18792")).resolves.toBe(
      "ws://127.0.0.1:18792/cdp?token=relay-token",
    );
    await expect(resolveWebAdapterCdpConnection("http://127.0.0.1:18792")).resolves.toEqual({
      endpoint: "ws://127.0.0.1:18792/cdp?token=relay-token",
      headers: {
        "x-openclaw-relay-token": "relay-token",
      },
    });
  });

  it("keeps remote urls unchanged", async () => {
    await expect(resolveWebAdapterCdpUrl("wss://example.com/browser")).resolves.toBe(
      "wss://example.com/browser",
    );
    await expect(resolveWebAdapterCdpConnection("wss://example.com/browser")).resolves.toEqual({
      endpoint: "wss://example.com/browser",
      headers: {},
    });
  });

  it("keeps provided token and path intact", async () => {
    await expect(
      resolveWebAdapterCdpUrl("http://localhost:18792/cdp?token=existing"),
    ).resolves.toBe("ws://localhost:18792/cdp?token=existing");
    await expect(
      resolveWebAdapterCdpConnection("http://localhost:18792/cdp?token=existing"),
    ).resolves.toEqual({
      endpoint: "ws://localhost:18792/cdp?token=existing",
      headers: {
        "x-openclaw-relay-token": "existing",
      },
    });
  });
});
