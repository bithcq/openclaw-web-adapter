export type {
  AdapterMatchResult,
  WebAdapterActionOp,
  WebAdapterActionRequest,
  WebAdapterActionResult,
  WebAdapterCapability,
  WebAdapterHealth,
  WebAdapterKind,
  WebAdapterReadOp,
  WebAdapterSnapshot,
  WebAdapterTargetContext,
  WebPageAdapter,
} from "./contracts.js";
export { createUnsupportedActionResult } from "./contracts.js";
export {
  createBuiltInWebAdapters,
  createDefaultWebAdapterRegistry,
  getBuiltInWebAdapterCatalog,
} from "./catalog.js";
export { WebAdapterRegistry } from "./registry.js";
export {
  performWithBestAdapter,
  resolveAdapterForTarget,
  scanWithBestAdapter,
} from "./runtime/adapter-runtime.js";
export { createAli1688ChatAdapter, Ali1688ChatAdapter } from "./adapters/1688.com/chat/adapter.js";
export {
  createAli1688DetailAdapter,
  Ali1688DetailAdapter,
} from "./adapters/1688.com/detail/adapter.js";
export {
  createAli1688FactorySearchAdapter,
  Ali1688FactorySearchAdapter,
} from "./adapters/1688.com/factory-search/adapter.js";
export {
  createAli1688SearchAdapter,
  Ali1688SearchAdapter,
} from "./adapters/1688.com/search/adapter.js";
export {
  createMailGoogleComposeAdapter,
  MailGoogleComposeAdapter,
} from "./adapters/mail.google.com/compose/adapter.js";
export {
  createMailGoogleInboxAdapter,
  MailGoogleInboxAdapter,
} from "./adapters/mail.google.com/inbox/adapter.js";
export {
  createMailGoogleThreadAdapter,
  MailGoogleThreadAdapter,
} from "./adapters/mail.google.com/thread/adapter.js";
export {
  createMailQqComposeAdapter,
  MailQqComposeAdapter,
} from "./adapters/mail.qq.com/compose/adapter.js";
export {
  createMailQqInboxAdapter,
  MailQqInboxAdapter,
} from "./adapters/mail.qq.com/inbox/adapter.js";
export {
  createMailQqThreadAdapter,
  MailQqThreadAdapter,
} from "./adapters/mail.qq.com/thread/adapter.js";
