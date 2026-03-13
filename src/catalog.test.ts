import { describe, expect, it } from "vitest";
import {
  createBuiltInWebAdapters,
  createDefaultWebAdapterRegistry,
  getBuiltInWebAdapterCatalog,
} from "./catalog.js";

describe("web adapter catalog", () => {
  it("builds a catalog entry from the built-in adapters", () => {
    expect(getBuiltInWebAdapterCatalog()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "1688.com/chat",
          domain: "1688.com",
          page: "chat",
          kind: "chat",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "1688.com/search",
          domain: "1688.com",
          page: "search",
          kind: "list",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "1688.com/detail",
          domain: "1688.com",
          page: "detail",
          kind: "detail",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "1688.com/factory-search",
          domain: "1688.com",
          page: "factory-search",
          kind: "list",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.qq.com/inbox",
          domain: "mail.qq.com",
          page: "inbox",
          kind: "list",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.qq.com/thread",
          domain: "mail.qq.com",
          page: "thread",
          kind: "detail",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.qq.com/compose",
          domain: "mail.qq.com",
          page: "compose",
          kind: "form",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.google.com/inbox",
          domain: "mail.google.com",
          page: "inbox",
          kind: "list",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.google.com/thread",
          domain: "mail.google.com",
          page: "thread",
          kind: "detail",
          status: "working-mvp",
        }),
        expect.objectContaining({
          id: "mail.google.com/compose",
          domain: "mail.google.com",
          page: "compose",
          kind: "form",
          status: "working-mvp",
        }),
      ]),
    );
  });

  it("creates a registry with the built-in adapters registered", () => {
    const registry = createDefaultWebAdapterRegistry();

    expect(registry.list().map((adapter) => adapter.id)).toEqual([
      "1688.com/chat",
      "1688.com/search",
      "1688.com/detail",
      "1688.com/factory-search",
      "mail.qq.com/inbox",
      "mail.qq.com/thread",
      "mail.qq.com/compose",
      "mail.google.com/inbox",
      "mail.google.com/thread",
      "mail.google.com/compose",
    ]);
    expect(createBuiltInWebAdapters().map((adapter) => adapter.id)).toEqual([
      "1688.com/chat",
      "1688.com/search",
      "1688.com/detail",
      "1688.com/factory-search",
      "mail.qq.com/inbox",
      "mail.qq.com/thread",
      "mail.qq.com/compose",
      "mail.google.com/inbox",
      "mail.google.com/thread",
      "mail.google.com/compose",
    ]);
  });
});
