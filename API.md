[English](./API.md) | [简体中文](./API.zh-CN.md)

# API

Public contract layer for `openclaw-web-adapter`.

## Core exports

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

Current built-in adapters:

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

## Main concepts

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

## Example

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```
