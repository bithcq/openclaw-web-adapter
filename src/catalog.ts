import type { WebAdapterCapability, WebAdapterKind } from "./contracts.js";
import { createAli1688ChatAdapter } from "./adapters/1688.com/chat/adapter.js";
import { createAli1688DetailAdapter } from "./adapters/1688.com/detail/adapter.js";
import { createAli1688FactorySearchAdapter } from "./adapters/1688.com/factory-search/adapter.js";
import { createAli1688SearchAdapter } from "./adapters/1688.com/search/adapter.js";
import { createMailGoogleComposeAdapter } from "./adapters/mail.google.com/compose/adapter.js";
import { createMailGoogleInboxAdapter } from "./adapters/mail.google.com/inbox/adapter.js";
import { createMailGoogleThreadAdapter } from "./adapters/mail.google.com/thread/adapter.js";
import { createMailQqComposeAdapter } from "./adapters/mail.qq.com/compose/adapter.js";
import { createMailQqInboxAdapter } from "./adapters/mail.qq.com/inbox/adapter.js";
import { createMailQqThreadAdapter } from "./adapters/mail.qq.com/thread/adapter.js";
import { WebAdapterRegistry } from "./registry.js";

export type WebAdapterCatalogStatus = "working-mvp" | "experimental" | "planned";

export type WebAdapterCatalogEntry = {
  id: string;
  domain: string;
  page: string;
  kind: WebAdapterKind;
  status: WebAdapterCatalogStatus;
  capabilities: WebAdapterCapability[];
};

function splitAdapterId(adapterId: string): { domain: string; page: string } {
  const [domain = adapterId, page = "unknown"] = adapterId.split("/", 2);
  return { domain, page };
}

export function createBuiltInWebAdapters() {
  return [
    createAli1688ChatAdapter(),
    createAli1688SearchAdapter(),
    createAli1688DetailAdapter(),
    createAli1688FactorySearchAdapter(),
    createMailQqInboxAdapter(),
    createMailQqThreadAdapter(),
    createMailQqComposeAdapter(),
    createMailGoogleInboxAdapter(),
    createMailGoogleThreadAdapter(),
    createMailGoogleComposeAdapter(),
  ];
}

export function createDefaultWebAdapterRegistry(): WebAdapterRegistry {
  const registry = new WebAdapterRegistry();
  for (const adapter of createBuiltInWebAdapters()) {
    registry.register(adapter);
  }
  return registry;
}

export function getBuiltInWebAdapterCatalog(): WebAdapterCatalogEntry[] {
  return createBuiltInWebAdapters().map((adapter) => {
    const { domain, page } = splitAdapterId(adapter.id);
    return {
      id: adapter.id,
      domain,
      page,
      kind: adapter.kind,
      status: "working-mvp",
      capabilities: adapter.describeCapabilities(),
    };
  });
}
