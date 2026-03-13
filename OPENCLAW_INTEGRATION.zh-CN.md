[English](./OPENCLAW_INTEGRATION.md) | [简体中文](./OPENCLAW_INTEGRATION.zh-CN.md)

# OPENCLAW INTEGRATION

`openclaw-web-adapter` 预期如何融入 OpenClaw。

## 1. 目标

这个仓库是为 OpenClaw 构建的，但它本身仍应保持为一个可复用工具项目。

集成目标是：

- OpenClaw 提供浏览器传输和 Agent 运行时
- Web Adapter 提供站点/页面理解和页面动作
- agents 通过稳定的工具接口和 watcher 接口消费 Web Adapter

## 2. 当前集成形态

今天的集成是 native-first，但在浏览器执行层仍然是混合形态。

这意味着：

1. Web Adapter 已可作为标准插件包安装到 OpenClaw
2. OpenClaw 已经安装并运行
3. OpenClaw browser relay 已可用
4. 用户已经可以访问原生插件 routes 和 CLI
5. 插件可以为显式配置的已支持 adapter 托管原生 watcher
6. 本仓库中的手动 watcher 入口仍保留，用于开发和调试
7. Web Adapter 通过 OpenClaw 浏览器传输附着到页面

这套方案已经可用，插件包发现和插件托管原生 watcher 也已经存在，但浏览器执行仍通过 watcher 子进程完成，而不是 OpenClaw 进程内的浏览器运行时。

## 3. 为什么 Web Adapter 不应替代 OpenClaw 浏览器传输

OpenClaw 已经解决了：

- 附着到现有 Chrome 标签页
- 低层浏览器控制
- relay 和面向浏览器的传输

Web Adapter 不应重复实现这一层。

它的职责是更上一层：

- 页面匹配
- 页面扫描
- 标准化动作
- 动作确认
- 站点/页面 adapter 注册
- 面向 watcher 的页面工作流

## 4. 当前原生集成

目标形态是 OpenClaw 原生，而不只是 companion 风格。

### 4.1 安装体验

当前已实现的基线：

- `openclaw plugins install /path/to/openclaw-web-adapter`
- `openclaw plugins install -l /path/to/openclaw-web-adapter`

当前用户体验：

- 将 `openclaw-web-adapter` 安装为 OpenClaw 兼容包
- 让 OpenClaw 从预期的 extension/plugin 位置发现或加载它
- 暴露插件 routes、插件 CLI 和 watcher 状态
- 在需要时让插件托管已配置的 watcher 进程

### 4.2 运行体验

当前原生 watcher 模式下的运行体验：

- 用户在 Chrome 中打开已支持网站
- OpenClaw 提供浏览器会话
- Web Adapter 插件启动已配置 watcher 进程
- 每个 watcher 自动为目标页面匹配正确的 adapter
- agents/plugins 消费生成的事件，或通过 watcher 接口调用动作
- 对于已支持页面，不需要手动选择 adapter

## 5. 集成模式

### 5.1 Tool Mode

这是面向 MCP 友好的方向。

典型操作：

- 匹配当前页面
- 扫描当前页面
- 读取结构化数据
- 执行标准化页面动作

这种模式更适合请求/响应工作流。

### 5.2 Watcher Mode

典型操作：

- 监听聊天窗口
- 监听邮箱
- 监听页面结构化变化事件

这种模式更适合长生命周期会话。

当前 `1688.com/chat` 示例是一个 watcher-first 的例子。

## 6. OpenClaw 打包方向

这一节现在同时混合了“当前已实现”与“剩余方向”。

### 方案 A：由 OpenClaw 托管的扩展包

形态：

- 将 Web Adapter 安装到 OpenClaw 的 extension/plugin 兼容位置
- 由 OpenClaw 加载该包
- Web Adapter 注册 adapters、暴露 routes/tools，并托管 watcher 进程

优点：

- 更像 OpenClaw 原生能力
- 用户体验更简单
- 更容易进入未来的官方集成

代价：

- 需要就包形态和注册接口达成一致

### 方案 B：依赖 OpenClaw 浏览器传输的 MCP 风格 companion

形态：

- Web Adapter 暴露 MCP 友好工具
- OpenClaw 仍提供浏览器传输
- 用户把 Web Adapter 与 OpenClaw 并行运行

优点：

- 更解耦
- 更容易被多个客户端复用

代价：

- 不如方案 A 那样有原生感

### 实际结论

更可能的长期答案是：

- 保留 `Option B` 作为可复用接口形态
- 朝 `Option A` 演进，以获得更好的 OpenClaw 原生体验

## 7. 仍需定义的部分

要完成原生集成，仍需定义这些内容：

1. 超出当前 built-ins 的更广 adapter 注册契约
2. 一等公民级别的工具暴露契约
3. 一等公民级别的 MCP 接口
4. 面向多类 adapter 的更丰富健康与事件投递契约
5. OpenClaw 设置应如何管理复杂的多站点 watcher 集群

## 8. 当前诚实状态

今天：

- 浏览器集成通过 OpenClaw relay 工作
- OpenClaw 插件安装/发现通过标准插件打包工作
- 已存在支持页面的自动匹配
- 已存在针对显式配置的已支持 adapter 的插件托管原生 watcher 编排
- 浏览器执行仍然发生在 watcher 子进程中，而不是 OpenClaw 进程内

在实现真正追上之前，这个区别应在项目文档里持续保持明确。
