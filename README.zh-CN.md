[English](./README.md) | [简体中文](./README.zh-CN.md)

# OpenClaw Web Adapter

一个为 OpenClaw 构建的可复用网页理解与交互层。

`Web Adapter` 的目标，是把真实网站转换成稳定、可复用的读写能力，供
Agent 使用。它位于 OpenClaw 的浏览器传输层之上、业务 Agent 逻辑之下。

## 概述

`Web Adapter` 不是某个站点的一次性脚本，而是一个通用网页适配层。

它的职责是把网页变成一套统一能力：

- 自动识别当前页面
- 将页面扫描成结构化数据
- 通过标准化请求执行页面动作
- 确认动作是否真的成功
- 同时支持同步工具调用和长生命周期 watcher

## 设计原则

### 1. 默认自动选择适配器

当仓库未来支持很多网页时，正常使用场景下不应该要求用户手动指定适配器。

运行时应当：

- 检查页面 URL、iframe URL、标题和 DOM 锚点
- 自动选择最佳匹配的 adapter
- 向 Agent 暴露匹配后的页面能力

手动指定 adapter 可以作为调试能力存在，但不应该成为主路径。

### 2. 面向 OpenClaw 的优先集成

`Web Adapter` 是为 OpenClaw 生态设计的。

这意味着：

- 它需要和 OpenClaw 的浏览器接入层自然配合
- 它需要同时暴露适合工具调用和适合 watcher 的接口
- 它未来的安装方式应当尽量像 OpenClaw 的原生扩展能力

### 3. MCP 友好的工具接口与 watcher 工作流

这套仓库要支持两种执行模型：

- `MCP 友好的工具模式`
  - 适合 `scan`、`read`、`perform action` 这类同步请求/响应操作
- `Watcher 模式`
  - 适合聊天监听、邮箱监听、页面变化监听这类长生命周期场景

## 当前真实状态

上面的设计方向是明确的，但当前实现仍处于早期阶段。

今天已经成立的事实：

- 共享 registry/runtime 已经支持自动匹配 adapter
- 当前可运行 adapter 已包含 `1688.com/chat`、`1688.com/search`、
  `1688.com/detail`、`1688.com/factory-search`、`mail.qq.com/inbox`、
  `mail.qq.com/thread`、`mail.qq.com/compose`、`mail.google.com/inbox`、
  `mail.google.com/thread`、`mail.google.com/compose`
- 同步 scan/action 流程已经存在
- watch 风格运行时积木已经存在
- 已经补齐 OpenClaw 插件包形态和发现机制
- 已为显式配置的已支持 adapter 实现插件托管的原生 watcher

今天还不能声称已经成立的事实：

- 还没有实现完整的 MCP server 打包形态
- 还没有真正支持很多站点
- 还没有在 OpenClaw 内提供进程内浏览器运行时
- 当前原生 watcher 仍依赖显式 watcher 配置和已支持的 adapter 实现

## 它怎样和 OpenClaw 配合

`Web Adapter` 与 OpenClaw 的关系应当分成两层：

1. OpenClaw 提供浏览器附着和底层浏览器控制。
2. Web Adapter 提供页面识别、结构化扫描、页面动作和 watcher 工作流。

实际分层是：

- `OpenClaw Browser Relay / browser control`
- `Web Adapter runtime 与站点 adapter`
- `业务 Agent 或插件`

## 安装

更详细的安装与集成说明见 `INSTALL.md`。

当前插件形态下，可以直接使用仓库根目录脚本：

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

这些脚本默认会把 `https://github.com/bithcq/openclaw-web-adapter.git`
clone / 更新到 `~/web-adapter`，再把那个 checkout 安装进
OpenClaw。传入路径时，脚本会改为作用于指定 checkout 路径。

### 当前开发接入方式

当前阶段，仓库已经支持：

- 作为 OpenClaw 原生可发现插件安装
- 由 OpenClaw 插件托管已配置的原生 watcher
- 作为手动开发调试时的独立 watcher 入口

当前接入方式是：

1. 先将它安装为 OpenClaw 插件
2. 启动 OpenClaw gateway 和 browser relay
3. 在 Chrome 中打开目标网站
4. 让插件托管已配置 watcher，或在需要时从本仓库手动运行 watcher 入口
5. 让 Web Adapter 自动附着页面并匹配 adapter

如果你要直接安装当前工作区代码做本地开发验证，优先直接使用
`openclaw plugins install -l /path/to/web-adapter`，不要走这个
GitHub 自举脚本。

### 目标安装形态

这条路线现在已经部分落地：

- 已可作为 OpenClaw 兼容插件包安装
- 已可通过 `openclaw plugins install` 被 OpenClaw 发现
- 已暴露插件路由、插件 CLI 和共享 runtime/library 能力
- 已能对显式配置的已支持 adapter 托管 watcher 生命周期
- 但更深的 tool/MCP 集成和更广的 adapter 覆盖仍在继续实现

## 使用方式

### 示例 watcher 流程：`1688.com/chat`

#### 由插件原生托管的 watcher

在 `plugins.entries.web-adapter.config.watchers` 下配置 watcher：

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

然后重启 OpenClaw，并查看运行状态：

```bash
openclaw web-adapter status --json
openclaw web-adapter watchers --json
```

这条路径会把 watcher 生命周期交给 OpenClaw 插件 service 托管，但 watcher
进程仍通过 Browser Relay 附着到 Chrome。

#### 独立开发态 watcher

```bash
pnpm dev:1688-chat -- \
  --cdp-url http://127.0.0.1:18792 \
  --plugin-events-url http://127.0.0.1:18789/plugins/ali1688/events \
  --plugin-auth-token replace-me \
  --download-dir /tmp/openclaw-1688-media \
  --selectors ./src/adapters/1688.com/chat/selectors.example.json
```

这个示例会：

- 通过 OpenClaw relay 附着到现有 Chrome 标签页
- 自动识别 1688 聊天页面
- 扫描会话和消息
- 提取文本和附件
- 执行带确认的文本发送
- 也可以作为原生 watcher 模式底层使用的 runner

### 示例工具调用流程

```ts
import { WebAdapterRegistry, createAli1688ChatAdapter, scanWithBestAdapter } from "./src/index.js";

const registry = new WebAdapterRegistry();
registry.register(createAli1688ChatAdapter());

const snapshot = await scanWithBestAdapter(registry, targetContext);
```

这也是 MCP 友好工具接口的基础：

- 自动匹配 adapter
- 通过共享契约扫描页面
- 向调用方暴露结构化结果

## 仓库结构

```text
.
├── README.md
├── README.zh-CN.md
├── INSTALL.md
├── INSTALL.zh-CN.md
├── API.md
├── API.zh-CN.md
├── SPEC.md
├── SPEC.zh-CN.md
├── ROADMAP.md
├── ROADMAP.zh-CN.md
├── OPENCLAW_INTEGRATION.md
├── OPENCLAW_INTEGRATION.zh-CN.md
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

所有站点相关实现都应放在：

`src/adapters/<domain>/<page>/`

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm format:check
```

## 附录：已支持与计划支持的网页

下表会持续扩展，后续会不断增加新站点和新页面适配器。

| 站点               | 页面             | 能力             | 状态          | 说明                                                                      |
| ------------------ | ---------------- | ---------------- | ------------- | ------------------------------------------------------------------------- |
| `1688.com`         | `chat`           | `chat`           | `working-mvp` | 首个完整打通的 adapter：扫描、附件、发送文本、发送确认                    |
| `1688.com`         | `search`         | `list`           | `working-mvp` | 公共搜索结果页解析，支持结构化条目读取和打开条目                          |
| `1688.com`         | `detail`         | `detail`         | `working-mvp` | 公共商品详情页解析：标题、价格、图片、属性                                |
| `1688.com`         | `factory-search` | `list`           | `working-mvp` | 工厂列表解析与批量询盘选择                                                |
| `mail.qq.com`      | `inbox`          | `list`           | `working-mvp` | 收件箱扫描、未读状态、分页、条目点击                                      |
| `mail.qq.com`      | `thread`         | `detail`         | `working-mvp` | 读信页解析和快捷回复扫描/发送                                             |
| `mail.qq.com`      | `compose`        | `form`           | `working-mvp` | 写信草稿扫描、填写与发送                                                  |
| `mail.google.com`  | `inbox`          | `list`           | `working-mvp` | 收件箱扫描、翻页与打开线程                                                |
| `mail.google.com`  | `thread`         | `detail`         | `working-mvp` | 线程扫描和内联回复扫描/发送                                               |
| `mail.google.com`  | `compose`        | `form`           | `working-mvp` | 写信草稿扫描、填写与发送                                                  |
| `www.zhihu.com`    | `article`        | `article`        | `planned`     | 面向文章阅读的 adapter                                                    |
| `www.bilibili.com` | `video`          | `detail`, `feed` | `planned`     | 面向媒体详情/信息流的 adapter                                             |

## 项目文档

- `OPENCLAW_INTEGRATION.md`：当前与目标 OpenClaw 集成模型
- `INSTALL.md`：当前安装方式与目标集成路径
- `API.md`：公开导出与用法示例
- `SPEC.md`：仓库级契约与设计规则
- `ROADMAP.md`：当前里程碑与后续 adapter 计划

每份主要文档也都提供了对应的 `*.zh-CN.md` 中文版本。

## 非目标

`Web Adapter` 不是：

- 业务 Agent
- CRM 工作流系统
- 报价引擎
- 某个网站的一次性脚本
- OpenClaw 浏览器传输层的替代品
