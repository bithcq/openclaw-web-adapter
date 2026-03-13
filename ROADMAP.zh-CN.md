[English](./ROADMAP.md) | [简体中文](./ROADMAP.zh-CN.md)

# ROADMAP

`web-adapter` 当前的开发路线图。

## 原则

- 保持仓库根目录对站点无关且干净
- 通过 adapter 扩展，而不是一次性脚本堆功能
- 先标准化契约，再扩大站点数量
- 优先追求可靠的页面读取和动作确认，而不是脆弱但很宽的覆盖面

## 当前状态

今天已实现：

- 共享 adapter 契约
- adapter registry 与最佳匹配选择
- 共享 scan/perform runtime 入口
- 面向 watcher 的运行时基础积木
- 可工作的 adapters：`1688.com/chat`、`1688.com/search`、`1688.com/detail`、`1688.com/factory-search`、`mail.qq.com/inbox`、`mail.qq.com/thread`、`mail.qq.com/compose`、`mail.google.com/inbox`、`mail.google.com/thread`、`mail.google.com/compose`
- 原生 watcher 编排目前仍聚焦 `1688.com/chat`

当前成熟度：

- 架构：可用
- 工具链：可用
- 公开 API：早期
- 生产可用性：部分到位

## 近期里程碑

### M1. 稳定基础

- 保持根目录结构通用且整洁
- 完成 domain/page adapter 命名收敛
- 加强 adapter 级测试覆盖
- 文档化贡献规则和 adapter 约定

### M2. 扩展非聊天类 Adapter

- 增加更多非聊天 adapter，证明这套契约可以跨页面类型复用
- 优先目标：
  - `www.zhihu.com/article`
  - `www.bilibili.com/video`
  - 更广的 `1688.com` 登录后业务页

### M3. 形式化 MCP 友好工具接口

- 明确哪些操作属于同步工具调用
- 明确哪些操作属于 watcher 风格运行时
- 保持契约和 OpenClaw 托管式集成兼容

### M3.5 OpenClaw 原生打包

- 已实现：
  - 面向 OpenClaw 兼容环境的可安装 / 可发现插件打包
  - 插件 routes、插件 CLI 与内置 adapter catalog 导出
  - 面向 `1688.com/chat` 的插件托管原生 watcher 编排
- 剩余工作：
  - 尽可能移除日常安装中的手工接线
  - 将原生 watcher 支持范围扩展到 `1688.com/chat` 之外

### M4. 扩展 Watch 工作流

- 统一 watch 生命周期
- 统一事件 payload 形状
- 统一长生命周期页面会话的健康与重试信号

## 计划中的 Adapter 目标

| 站点               | 页面             | 优先级  | 原因                           |
| ------------------ | ---------------- | ------- | ------------------------------ |
| `1688.com`         | `chat`           | current | 首个端到端 adapter 和 watch 流 |
| `1688.com`         | `search`         | current | 公共列表页解析与打开条目       |
| `1688.com`         | `detail`         | current | 公共详情页解析与媒体/属性读取  |
| `1688.com`         | `factory-search` | current | 工厂列表解析与批量询盘选择     |
| `mail.qq.com`      | `inbox`          | current | 首个邮箱列表 adapter 和首个非聊天页 |
| `mail.qq.com`      | `thread`         | current | 读信解析与快捷回复动作         |
| `mail.qq.com`      | `compose`        | current | 草稿编辑与发送流程             |
| `mail.google.com`  | `inbox`          | current | 验证列表型 adapter             |
| `mail.google.com`  | `thread`         | current | 验证 detail/article 混合页面   |
| `mail.google.com`  | `compose`        | current | 验证表单型动作                 |
| `www.zhihu.com`    | `article`        | high    | 验证文章解析                   |
| `www.bilibili.com` | `video`          | medium  | 验证媒体/详情解析              |

## 进展定义

一个 adapter 的状态定义为：

- `planned`：只定义了目标和预期能力
- `experimental`：可以匹配页面，且具备部分 scan/action 能力
- `working-mvp`：主 read/action 回路已能在本地配合测试工作
- `production-ready`：稳定性、回归覆盖和恢复行为到位后，才能称为生产可用
