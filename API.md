# API

Public contract layer for `openclaw-web-adapter`.

## English

### Core exports

The current public entrypoint is `src/index.ts`.

Main exports:

- `WebAdapterRegistry`
- `resolveAdapterForTarget(...)`
- `scanWithBestAdapter(...)`
- `performWithBestAdapter(...)`
- `createAli1688ChatAdapter(...)`
- `createAli1688SearchAdapter(...)`
- `createAli1688DetailAdapter(...)`
- `createAli1688FactorySearchAdapter(...)`
- `createMailGoogleInboxAdapter(...)`
- `createMailGoogleThreadAdapter(...)`
- `createMailGoogleComposeAdapter(...)`
- `createMailQqInboxAdapter(...)`
- `createMailQqThreadAdapter(...)`
- `createMailQqComposeAdapter(...)`
- contract types from `src/contracts.ts`

Current built-in adapter:

- `1688.com/chat` from `src/adapters/1688.com/chat/adapter.ts`
- `1688.com/search` from `src/adapters/1688.com/search/adapter.ts`
- `1688.com/detail` from `src/adapters/1688.com/detail/adapter.ts`
- `1688.com/factory-search` from `src/adapters/1688.com/factory-search/adapter.ts`
- `mail.google.com/inbox` from `src/adapters/mail.google.com/inbox/adapter.ts`
- `mail.google.com/thread` from `src/adapters/mail.google.com/thread/adapter.ts`
- `mail.google.com/compose` from `src/adapters/mail.google.com/compose/adapter.ts`
- `mail.qq.com/inbox` from `src/adapters/mail.qq.com/inbox/adapter.ts`
- `mail.qq.com/thread` from `src/adapters/mail.qq.com/thread/adapter.ts`
- `mail.qq.com/compose` from `src/adapters/mail.qq.com/compose/adapter.ts`

### Main concepts

- `WebAdapterTargetContext`
  - normalized page/frame target metadata
- `WebAdapterCapability`
  - capability family plus supported read/action operations
- `WebAdapterSnapshot`
  - normalized scan result
- `WebAdapterActionRequest`
  - normalized action request
- `WebAdapterActionResult`
  - normalized action result
- `WebPageAdapter`
  - adapter contract implemented by each site adapter

### Example

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```

## 中文

### 当前公开入口

当前公开入口是 `src/index.ts`。

主要导出：

- `WebAdapterRegistry`
- `resolveAdapterForTarget(...)`
- `scanWithBestAdapter(...)`
- `performWithBestAdapter(...)`
- `createAli1688ChatAdapter(...)`
- `createAli1688SearchAdapter(...)`
- `createAli1688DetailAdapter(...)`
- `createAli1688FactorySearchAdapter(...)`
- `createMailGoogleInboxAdapter(...)`
- `createMailGoogleThreadAdapter(...)`
- `createMailGoogleComposeAdapter(...)`
- `createMailQqInboxAdapter(...)`
- `createMailQqThreadAdapter(...)`
- `createMailQqComposeAdapter(...)`
- `src/contracts.ts` 中的标准类型

当前内置适配器：

- `src/adapters/1688.com/chat/adapter.ts` 中的 `1688.com/chat`
- `src/adapters/1688.com/search/adapter.ts` 中的 `1688.com/search`
- `src/adapters/1688.com/detail/adapter.ts` 中的 `1688.com/detail`
- `src/adapters/1688.com/factory-search/adapter.ts` 中的 `1688.com/factory-search`
- `src/adapters/mail.google.com/inbox/adapter.ts` 中的 `mail.google.com/inbox`
- `src/adapters/mail.google.com/thread/adapter.ts` 中的 `mail.google.com/thread`
- `src/adapters/mail.google.com/compose/adapter.ts` 中的 `mail.google.com/compose`
- `src/adapters/mail.qq.com/inbox/adapter.ts` 中的 `mail.qq.com/inbox`
- `src/adapters/mail.qq.com/thread/adapter.ts` 中的 `mail.qq.com/thread`
- `src/adapters/mail.qq.com/compose/adapter.ts` 中的 `mail.qq.com/compose`

### 核心概念

- `WebAdapterTargetContext`
  - 标准化后的页面/iframe 目标上下文
- `WebAdapterCapability`
  - 页面能力类型和支持的读写操作
- `WebAdapterSnapshot`
  - 标准化扫描结果
- `WebAdapterActionRequest`
  - 标准化动作请求
- `WebAdapterActionResult`
  - 标准化动作结果
- `WebPageAdapter`
  - 每个站点适配器要实现的统一契约

### 示例

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```
