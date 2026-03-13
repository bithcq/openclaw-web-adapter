# Web Adapter for OpenClaw

A reusable web understanding and interaction layer built for OpenClaw.

`Web Adapter` turns real websites into stable, reusable read/write capabilities
for agents. It is designed to sit above OpenClaw browser transport and below
business-agent logic.

## Overview / 概述

`Web Adapter` is not a one-site script. It is a general adapter layer for web
pages.

Its job is to make pages usable through a consistent contract:

- recognize the current page automatically
- scan the page into structured data
- perform page actions through normalized requests
- confirm whether actions really succeeded
- support both synchronous tool calls and long-lived watchers

`Web Adapter` 不是某一个网站的临时脚本，而是一个通用网页适配层。

它的职责是把网页变成一套统一能力：

- 自动识别当前页面
- 将页面扫描成结构化数据
- 通过标准化请求执行页面动作
- 确认动作是否真的成功
- 同时支持同步工具调用和长生命周期 watcher

## Design Principles / 设计原则

### 1. Automatic adapter selection by default / 默认自动选择适配器

When many adapters exist, users should not need to manually choose one for
normal usage.

The runtime should:

- inspect page URL, frame URL, title, and DOM anchors
- choose the best matching adapter automatically
- expose the matched page capabilities to agents

Manual adapter selection may still exist for debugging, but it should not be
the primary user experience.

当仓库未来支持很多网页时，正常使用场景下不应该要求用户手动指定适配器。

运行时应当：

- 检查页面 URL、iframe URL、标题和 DOM 锚点
- 自动选择最佳匹配的 adapter
- 向 Agent 暴露匹配后的页面能力

手动指定 adapter 可以作为调试能力存在，但不应该成为主路径。

### 2. OpenClaw-first integration / 面向 OpenClaw 的优先集成

`Web Adapter` is built for OpenClaw.

That means:

- it should work cleanly with OpenClaw browser transport
- it should expose tool-friendly and watcher-friendly surfaces
- its installation path should eventually feel native to OpenClaw

`Web Adapter` 是为 OpenClaw 生态设计的。

这意味着：

- 它需要和 OpenClaw 的浏览器接入层自然配合
- 它需要同时暴露适合工具调用和适合 watcher 的接口
- 它未来的安装方式应当尽量像 OpenClaw 的原生扩展能力

### 3. MCP-friendly tools and watcher workflows / MCP 友好的工具接口与 watcher 工作流

This repository has two intended execution models:

- `MCP-friendly tool mode`
  - for request/response style operations such as `scan`, `read`, and
    `perform action`
- `Watcher mode`
  - for long-lived sessions such as chat monitoring, mailbox watching, and page
    change observation

这套仓库要支持两种执行模型：

- `MCP 友好的工具模式`
  - 适合 `scan`、`read`、`perform action` 这类同步请求/响应操作
- `Watcher 模式`
  - 适合聊天监听、邮箱监听、页面变化监听这类长生命周期场景

## Current Truth / 当前真实状态

The design direction above is intentional, but the current implementation is
still early.

What is true today:

- automatic adapter matching already exists in the shared registry/runtime
- working adapters now include `1688.com/chat`, `1688.com/search`, `1688.com/detail`, `1688.com/factory-search`, `mail.qq.com/inbox`, `mail.qq.com/thread`, `mail.qq.com/compose`, `mail.google.com/inbox`, `mail.google.com/thread`, and `mail.google.com/compose`
- synchronous scan/action flows already exist
- watch-style runtime pieces already exist
- OpenClaw plugin packaging and discovery are now implemented
- plugin-supervised native watchers are now implemented for explicitly configured supported adapters

What is not true yet:

- MCP server packaging is not implemented yet
- support for many sites does not exist yet
- there is no in-process browser runtime inside OpenClaw yet
- native watcher orchestration currently depends on explicit watcher config and a supported adapter implementation

上面的设计方向是明确的，但当前实现仍处于早期阶段。

今天已经成立的事实：

- 共享 registry/runtime 已经支持自动匹配 adapter
- 当前可运行 adapter 已包含 `1688.com/chat`、`1688.com/search`、`1688.com/detail`、`1688.com/factory-search`、`mail.qq.com/inbox`、`mail.qq.com/thread`、`mail.qq.com/compose`、`mail.google.com/inbox`、`mail.google.com/thread`、`mail.google.com/compose`
- 同步 scan/action 流程已经存在
- watch 风格运行时积木已经存在
- 已经补齐 OpenClaw 插件包形态和发现机制
- 已为显式配置的已支持 adapter 实现插件托管的原生 watcher

今天还不能声称已经成立的事实：

- 还没有实现完整的 MCP server 打包形态
- 还没有真正支持很多站点
- 还没有在 OpenClaw 内提供进程内浏览器运行时
- 当前原生 watcher 仍依赖显式 watcher 配置和已支持的 adapter 实现

## How It Fits with OpenClaw / 它怎样和 OpenClaw 配合

`Web Adapter` is meant to work with OpenClaw in two layers:

1. OpenClaw provides browser attachment and low-level browser control.
2. Web Adapter provides page recognition, structured scans, actions, and watch
   workflows.

Practical layering:

- `OpenClaw Browser Relay / browser control`
- `Web Adapter runtime and site adapters`
- `business agents or plugins`

`Web Adapter` 与 OpenClaw 的关系应当分成两层：

1. OpenClaw 提供浏览器附着和底层浏览器控制。
2. Web Adapter 提供页面识别、结构化扫描、页面动作和 watcher 工作流。

实际分层是：

- `OpenClaw Browser Relay / browser control`
- `Web Adapter runtime 与站点 adapter`
- `业务 Agent 或插件`

## Installation / 安装

Detailed installation and integration instructions live in `INSTALL.md`.

更详细的安装与集成说明见 `INSTALL.md`。

Quick entry points for the current plugin shape:

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

当前插件形态下，也可以直接使用仓库根目录脚本：

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

These scripts default to the current repository checkout. If you pass a path,
`install.sh` can bootstrap a separate clone there first, and `update.sh` will
operate on that specific checkout.

这些脚本默认作用于当前仓库 checkout。传入路径时，`install.sh`
会先在目标路径自举 clone，`update.sh` 则会针对那个 checkout 执行更新。

### Current development setup / 当前开发接入方式

Today, the repository supports both:

- native OpenClaw plugin installation and discovery
- native plugin-supervised watcher execution for configured supported adapters
- companion-style site watcher execution for manual development flows

Current shape:

1. install the package into OpenClaw as a plugin
2. run OpenClaw gateway and browser relay
3. open the target site in Chrome
4. either let the plugin supervise a configured watcher or run a manual watcher entry from this repository
5. let Web Adapter attach to the page and match the adapter automatically

当前阶段，它同时支持两种形态：

- 作为 OpenClaw 原生可发现插件安装
- 由 OpenClaw 插件托管已配置的原生 watcher
- 作为手动开发调试时的独立 watcher 入口

当前接入方式是：

1. 先将它安装为 OpenClaw 插件
2. 启动 OpenClaw gateway 和 browser relay
3. 在 Chrome 中打开目标网站
4. 让插件托管已配置 watcher，或在需要时从本仓库手动运行 watcher 入口
5. 让 Web Adapter 自动附着页面并匹配 adapter

### Target packaged setup / 目标安装形态

This direction is now partially implemented:

- installable as an OpenClaw-compatible plugin package
- discoverable by OpenClaw through `openclaw plugins install`
- exposing plugin routes, plugin CLI, and the shared runtime/library surface
- exposing plugin-supervised watcher orchestration for configured supported adapters
- still evolving toward deeper tool/MCP integration and broader adapter coverage

这条路线现在已经部分落地：

- 已可作为 OpenClaw 兼容插件包安装
- 已可通过 `openclaw plugins install` 被 OpenClaw 发现
- 已暴露插件路由、插件 CLI 和共享 runtime/library 能力
- 已能对显式配置的已支持 adapter 托管 watcher 生命周期
- 但更深的 tool/MCP 集成和更广的 adapter 覆盖仍在继续实现

## Usage / 使用

### Example watcher flow: `1688.com/chat` / 示例 watcher 流程：`1688.com/chat`

#### Native plugin-supervised watcher / 由插件原生托管的 watcher

Configure a watcher under `plugins.entries.web-adapter.config.watchers`:

```json
{
  "plugins": {
    "entries": {
      "web-adapter": {
        "enabled": true,
        "config": {
          "installMode": "native",
          "watchers": [
            {
              "id": "ali1688-main",
              "adapterId": "1688.com/chat",
              "pluginEventsPath": "/plugins/ali1688/events"
            }
          ]
        }
      }
    }
  }
}
```

Then restart OpenClaw and inspect runtime status:

```bash
openclaw web-adapter status --json
openclaw web-adapter watchers --json
```

This path keeps watcher lifecycle under the OpenClaw plugin service, while the
watcher process still attaches to Chrome through Browser Relay.

这条路径会把 watcher 生命周期交给 OpenClaw 插件 service 托管，但 watcher
进程仍通过 Browser Relay 附着到 Chrome。

#### Companion development watcher / 独立开发态 watcher

```bash
pnpm dev:1688-chat -- \
  --cdp-url http://127.0.0.1:18792 \
  --plugin-events-url http://127.0.0.1:18789/plugins/ali1688/events \
  --plugin-auth-token replace-me \
  --download-dir /tmp/openclaw-1688-media \
  --selectors ./src/adapters/1688.com/chat/selectors.example.json
```

This example:

- attaches to an existing Chrome tab through OpenClaw relay
- recognizes the 1688 chat page automatically
- scans conversations and messages
- extracts text and attachments
- performs confirmed text sending
- can also serve as the underlying runner used by native watcher mode

这个示例会：

- 通过 OpenClaw relay 附着到现有 Chrome 标签页
- 自动识别 1688 聊天页面
- 扫描会话和消息
- 提取文本和附件
- 执行带确认的文本发送
- 也可以作为原生 watcher 模式底层使用的 runner

### Example tool-style flow / 示例工具调用流程

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```

This is the beginning of the MCP-friendly tool surface:

- match adapter automatically
- scan the page through a shared contract
- expose structured data to the caller

这也是 MCP 友好工具接口的基础：

- 自动匹配 adapter
- 通过共享契约扫描页面
- 向调用方暴露结构化结果

## Repository Layout / 仓库结构

```text
.
├── README.md
├── INSTALL.md
├── API.md
├── SPEC.md
├── ROADMAP.md
├── package.json
├── plugin/
├── scripts/
├── src/
│   ├── contracts.ts
│   ├── registry.ts
│   ├── core/
│   ├── runtime/
│   └── adapters/
│       ├── 1688.com/
│       │   ├── chat/
│       │   ├── search/
│       │   ├── detail/
│       │   └── factory-search/
│       ├── mail.google.com/
│       │   ├── inbox/
│       │   ├── thread/
│       │   └── compose/
│       └── mail.qq.com/
│           ├── inbox/
│           ├── thread/
│           └── compose/
└── vitest.config.ts
```

All site-specific code must live under:

`src/adapters/<domain>/<page>/`

所有站点相关实现都应放在：

`src/adapters/<domain>/<page>/`

## Development / 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm format:check
```

## Appendix: Supported Sites and Pages / 附录：已支持与计划支持的网页

This table is intentionally growing. More adapters will be added over time.

下表会持续扩展，后续会不断增加新站点和新页面适配器。

| Site               | Page      | Capability       | Status        | Notes                                                                     |
| ------------------ | --------- | ---------------- | ------------- | ------------------------------------------------------------------------- |
| `1688.com`         | `chat`    | `chat`           | `working-mvp` | First fully wired adapter: scan, attachments, send-text, confirm-outbound |
| `1688.com`         | `search`  | `list`           | `working-mvp` | Public search result parsing with structured items and item opening       |
| `1688.com`         | `detail`  | `detail`         | `working-mvp` | Public offer detail parsing: title, price, images, attributes             |
| `mail.qq.com`      | `inbox`   | `list`           | `working-mvp` | Inbox scan, unread state, pagination, item click                          |
| `mail.qq.com`      | `thread`  | `detail`         | `working-mvp` | Readmail parsing plus quick-reply scan/send                               |
| `mail.qq.com`      | `compose` | `form`           | `working-mvp` | Compose draft scan plus fill/send                                         |
| `mail.google.com`  | `inbox`   | `list`           | `working-mvp` | Inbox scan, next-page, and thread opening                                 |
| `mail.google.com`  | `thread`  | `detail`         | `working-mvp` | Thread scan plus inline reply scan/send                                   |
| `mail.google.com`  | `compose` | `form`           | `working-mvp` | Compose draft scan plus fill/send                                         |
| `www.zhihu.com`    | `article` | `article`        | `planned`     | Article-oriented read adapter                                             |
| `www.bilibili.com` | `video`   | `detail`, `feed` | `planned`     | Media/detail-oriented adapter                                             |

## Project Documents / 项目文档

- `OPENCLAW_INTEGRATION.md`: current and target OpenClaw integration model
- `INSTALL.md`: current setup and target integration path
- `API.md`: public exports and usage examples
- `SPEC.md`: repository-level contracts and design rules
- `ROADMAP.md`: current milestones and next adapters

## Non-Goals / 非目标

`Web Adapter` is not:

- a business agent
- a CRM workflow system
- a quoting engine
- a one-site throwaway script
- a replacement for OpenClaw browser transport

`Web Adapter` 不是：

- 业务 Agent
- CRM 工作流系统
- 报价引擎
- 某个网站的一次性脚本
- OpenClaw 浏览器传输层的替代品
