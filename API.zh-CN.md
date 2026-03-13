[English](./API.md) | [简体中文](./API.zh-CN.md)

# API

`openclaw-web-adapter` 的公开契约层说明。

## 核心导出

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
- `src/contracts.ts` 中的契约类型

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

## 核心概念

- `WebAdapterTargetContext`
  - 标准化后的页面/iframe 目标元数据
- `WebAdapterCapability`
  - 能力类型，以及支持的读/写操作
- `WebAdapterSnapshot`
  - 标准化扫描结果
- `WebAdapterActionRequest`
  - 标准化动作请求
- `WebAdapterActionResult`
  - 标准化动作结果
- `WebPageAdapter`
  - 每个站点 adapter 实现的统一契约

## 示例

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```
