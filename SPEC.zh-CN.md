[English](./SPEC.md) | [简体中文](./SPEC.zh-CN.md)

# SPEC

`web-adapter` 的仓库级规范。

## 1. 范围

本仓库定义一个可复用的网页适配层，把具体网页转换成 Agent 可消费的稳定能力。

本仓库负责：

- adapter 契约
- adapter 选择
- 结构化页面快照
- 标准化动作执行
- 动作确认与健康状态上报
- 面向 watcher 的运行时基础积木
- 基于共享契约实现的站点级 adapter

本仓库不负责：

- 业务决策逻辑
- 面向业务域的 Agent 工作流
- CRM 或报价系统
- 替代底层浏览器传输层

## 2. 仓库结构

站点实现必须放在：

`src/adapters/<domain>/<page>/`

示例：

- `src/adapters/1688.com/chat/`
- `src/adapters/1688.com/search/`
- `src/adapters/1688.com/detail/`
- `src/adapters/1688.com/factory-search/`
- `src/adapters/mail.google.com/compose/`
- `src/adapters/mail.google.com/thread/`
- `src/adapters/mail.google.com/inbox/`
- `src/adapters/mail.qq.com/inbox/`
- `src/adapters/mail.qq.com/thread/`
- `src/adapters/mail.qq.com/compose/`

仓库根目录应只包含仓库级文档、包元数据和共享工具。站点专用 runner 或 selector 不应放在根目录。

## 3. Adapter 标识

每个 adapter 都必须有一个稳定的 `id`，格式为：

`<domain>/<page>`

示例：

- `1688.com/chat`
- `1688.com/search`
- `1688.com/detail`
- `1688.com/factory-search`
- `mail.google.com/compose`
- `mail.google.com/thread`
- `mail.google.com/inbox`
- `mail.qq.com/inbox`
- `mail.qq.com/thread`
- `mail.qq.com/compose`

这样可以让对外标识和仓库目录结构保持一致。

## 4. 自动选择策略

默认用户体验应当是自动匹配 adapter。

对于已支持页面，不应要求用户手动选择 adapter。

运行时应评估：

- 页面 URL
- frame URL
- 页面标题
- DOM 锚点
- adapter 置信度

手动覆盖 adapter 可以作为调试、恢复或测试能力存在，但不应成为主要产品路径。

## 5. 契约模型

契约模型定义在 `src/contracts.ts` 中。

### 5.1 目标

`WebAdapterTargetContext` 是所有 adapter 共用的标准化页面/frame 输入。

它包含：

- page handle
- frame handle
- target id
- page URL
- frame URL
- page title

### 5.2 匹配

每个 adapter 都必须实现：

`match(target) -> AdapterMatchResult`

它决定当前页面是否适用该 adapter，以及匹配置信度。

### 5.3 能力描述

每个 adapter 都必须实现：

`describeCapabilities() -> WebAdapterCapability[]`

能力按页面类型分组：

- `chat`
- `article`
- `list`
- `detail`
- `feed`
- `form`

### 5.4 快照

每个 adapter 都必须实现：

`scan(target) -> WebAdapterSnapshot`

快照必须包含：

- `adapterId`
- `kind`
- `capturedAt`
- 标准化目标元数据
- 标准化健康状态块
- adapter 专有 payload

### 5.5 动作

每个 adapter 都必须实现：

`perform(target, request) -> WebAdapterActionResult`

动作结果必须标准化为统一形状：

- `ok`
- `confirmed`
- `attempt`
- 可选 `error`
- 可选 `details`

## 6. 运行时形态

共享运行时刻意保持精简，但必须支持两种集成形态。

### 6.1 MCP 友好的工具形态

工具形态覆盖请求/响应式操作，例如：

- match
- scan
- read
- perform action

### 6.2 Watcher 形态

Watcher 形态覆盖长生命周期会话，例如：

- 聊天监听
- 收件箱监听
- 变化流
- 事件投递

### 6.3 Registry

`src/registry.ts` 负责 adapter 注册和最佳匹配选择。

规则：

- adapter id 必须唯一
- 匹配按置信度决策
- 置信度最高者胜出

### 6.4 Runtime

`src/runtime/adapter-runtime.ts` 暴露共享入口：

- `resolveAdapterForTarget(...)`
- `scanWithBestAdapter(...)`
- `performWithBestAdapter(...)`

这些入口不关心具体站点，只依赖共享契约。

### 6.5 面向 Watch 的运行时积木

仓库可以包含可复用的 watcher/runtime 原语，例如：

- polling
- plugin event posting
- outbound queueing
- health state
- request parsing helpers

这些都是可复用基础积木，不是业务 Agent 代码。

## 7. OpenClaw 集成边界

本仓库明确是为 OpenClaw 集成而设计。

边界如下：

- OpenClaw 提供浏览器传输和底层浏览器控制
- Web Adapter 提供页面识别、结构化扫描、页面动作以及 watcher 基础积木
- agents/plugins 消费 Web Adapter 的输出

面向 OpenClaw 的原生打包安装是目标方向，但不是所有场景下的当前保证。

## 8. Adapter 要求

每个站点 adapter 都应遵循这些规则：

1. selector 保持在 adapter 自己的目录内。
2. 页面专有解析逻辑保持在 adapter 自己的目录内。
3. 复用共享 runtime/core 模块，不要复制通用行为。
4. 页面动作只要可能，就要做确认。
5. 对不支持、降级、未登录等状态返回标准化健康信息。
6. 优先为匹配、扫描和关键动作添加 adapter 本地测试。

## 9. 公开 API 面

当前公开入口是 `src/index.ts`。

它导出：

- 契约类型
- registry
- runtime 入口
- 当前内置 adapters

API 概览和导入示例见 `API.md`。

## 10. 贡献方向

新工作通常应落在以下轨道之一：

- 在 `src/adapters/<domain>/<page>/` 下新增 adapter
- 以向后兼容方式扩展共享契约
- 改进通用 runtime 积木，同时避免引入站点耦合
- 添加验证 adapter 行为或契约不变量的测试

避免把产品级业务逻辑直接塞进本仓库。
