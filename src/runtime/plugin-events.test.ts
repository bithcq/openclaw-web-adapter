import { describe, expect, it, vi } from "vitest";
import { createWebAdapterPluginEventPoster } from "./plugin-events.js";

describe("web adapter runtime plugin events", () => {
  it("posts object payloads with auth headers", async () => {
    const response = new Response("ok", { status: 202 });
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const postEvent = createWebAdapterPluginEventPoster({
      pluginEventsUrl: "http://127.0.0.1:18789/plugins/ali1688/events",
      pluginAuthToken: "secret",
      fetchImpl,
    });

    await expect(postEvent({ hello: "world" })).resolves.toBe(response);

    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:18789/plugins/ali1688/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret",
      },
      body: JSON.stringify({ hello: "world" }),
    });
  });

  it("passes through raw JSON bodies without auth headers", async () => {
    const response = new Response("accepted", { status: 200 });
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const postEvent = createWebAdapterPluginEventPoster({
      pluginEventsUrl: "http://127.0.0.1:18789/plugins/test/events",
      fetchImpl,
    });

    await postEvent('{"ping":true}');

    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:18789/plugins/test/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: '{"ping":true}',
    });
  });
});
