[English](./INSTALL.md) | [简体中文](./INSTALL.zh-CN.md)

# INSTALL

`openclaw-web-adapter` 的安装与使用说明。

## 1. 定位

当前这个仓库仍然是 OpenClaw 的配套项目。

今天已经成立的事实：

- 已可通过 OpenClaw browser relay 工作
- 已可自动匹配已支持页面
- 已可作为 OpenClaw 插件包安装
- 已可由 OpenClaw 插件 service 托管已配置的原生 watcher
- 仍保留 companion 风格的 runner，用于手动开发和调试

## 2. 依赖要求

- Node.js `22+`
- `pnpm`
- 可用的 OpenClaw 安装
- 当前 shell 中可直接调用 OpenClaw CLI
- 本地正在运行的 OpenClaw gateway
- 本地可访问的 OpenClaw browser relay
- 已打开目标页面的 Chrome
- 对于仓库根目录脚本：
  - `install.sh` / `update.sh` 需要 `git`
  - 脚本会优先尝试 `openclaw daemon restart`，只有失败时才回退到 `systemctl --user restart openclaw-gateway.service`

## 3. 当前开发安装方式

### 3.0 一键插件脚本

当前 companion/plugin 形态下，可以直接使用仓库根目录脚本：

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

行为说明：

- `install.sh`
  - 默认作用于当前仓库 checkout
  - 如果传入一个不存在的路径，会先把当前仓库的 `origin` clone 到目标路径
  - 运行 `pnpm install`
  - 使用 `openclaw plugins install -l` 安装到 OpenClaw
  - 启用插件
  - 重启 gateway
- `update.sh`
  - 默认作用于当前仓库 checkout
  - 优先按该 checkout 的 upstream 分支更新；如果没有 upstream，则回退到“当前分支 + 第一个 remote”
  - 重新安装依赖
  - 从同一个 checkout 刷新 linked plugin install
  - 重启 gateway
- `uninstall.sh`
  - 运行 `openclaw plugins uninstall web-adapter --keep-files --force`
  - 重启 gateway
  - 保留本地仓库 checkout，不删除源码目录

示例：

```bash
# 安装当前 checkout
bash install.sh

# 先自举一个独立 checkout，再安装它
bash install.sh ~/openclaw-web-adapter

# 更新指定 checkout
bash update.sh ~/openclaw-web-adapter
```

### 3.1 安装到 OpenClaw

本地开发时，可以用下面任一方式把仓库装进 OpenClaw：

```bash
openclaw plugins install -l /path/to/openclaw-web-adapter
```

或者：

```bash
openclaw plugins install /path/to/openclaw-web-adapter
```

之后重启 OpenClaw gateway。

安装完成后，检查是否已被发现：

```bash
openclaw plugins list
openclaw web-adapter status --json
openclaw web-adapter watchers --json
```

### 3.2 配置原生 watcher 模式

在 `plugins.entries.web-adapter.config` 下添加插件配置：

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

修改配置后重启 gateway。

### 3.3 克隆并安装依赖

```bash
git clone https://github.com/bithcq/openclaw-web-adapter.git
cd openclaw-web-adapter
pnpm install
```

### 3.4 确认 OpenClaw 已运行

在使用本仓库前，你需要先有本地 OpenClaw gateway 和 browser relay。

典型本地默认值：

- gateway HTTP base：`http://127.0.0.1:18789`
- browser relay base：`http://127.0.0.1:18792`

### 3.5 在 Chrome 中打开目标页面

对于当前可运行示例，请先在 Chrome 标签页中打开 1688 聊天页，并确保 OpenClaw 可以附着到该标签页。

### 3.6 可选：手动运行 adapter 入口

```bash
pnpm dev:1688-chat -- \
  --cdp-url http://127.0.0.1:18792 \
  --plugin-events-url http://127.0.0.1:18789/plugins/ali1688/events \
  --plugin-auth-token replace-me \
  --download-dir /tmp/openclaw-1688-media \
  --selectors ./src/adapters/1688.com/chat/selectors.example.json
```

### 3.7 验证运行状态

启动原生 watcher 模式或手动 watcher 入口后，至少检查这些点：

1. 进程仍在持续运行
2. 目标 Chrome 标签页已经打开
3. 本地 OpenClaw browser relay 可访问
4. adapter 的 health endpoint 可访问

示例检查：

```bash
openclaw web-adapter status --json
openclaw web-adapter watchers --json
curl http://127.0.0.1:18888/health
```

预期结果：

- HTTP 请求成功
- `lastScan` 已填充
- `lastError` 为 `null` 或空
- `openclaw web-adapter watchers --json` 中的 watcher 处于 `running`

如果出现 `target_not_found`，说明当前页面还不匹配已支持 adapter，或者预期标签页并未打开。

## 4. 运行时会发生什么

当前运行流程是：

1. 通过 OpenClaw browser relay 附着到 Chrome
2. 检查页面 URL、frame URL 和 DOM
3. 自动匹配最佳 adapter
4. 扫描页面或监听页面
5. 对外暴露结构化事件或动作结果

对于已支持页面，正常使用时不应该要求用户手动选择 adapter。

## 5. Tool Mode 与 Watcher Mode

### Tool Mode

当你需要请求/响应式操作时使用 tool mode，例如：

- 扫描当前页面
- 读取条目或消息
- 执行页面动作

这是 Web Adapter 面向 MCP 友好方向的一部分。

### Watcher Mode

当你需要长生命周期监听页面时使用 watcher mode，例如：

- 聊天窗口
- 收件箱变化
- 页面事件流

当前的 `1688.com/chat` 示例主要是 watcher 风格集成。

## 6. OpenClaw 集成模型

当前 OpenClaw 集成形态是：

- OpenClaw 负责浏览器传输
- Web Adapter 负责页面语义、页面动作和插件托管的 watcher 生命周期
- agents 或 plugins 消费 Web Adapter 的能力

目标集成选项：

1. 由 OpenClaw 托管的工具接口
2. 由 OpenClaw 托管的 watcher companion
3. 由 Web Adapter 暴露 MCP 友好接口，同时继续依赖 OpenClaw 浏览器传输

## 7. 原生安装状态

这部分现在已经对“显式配置的已支持 watcher”落地。

目标用户体验是：

- 把 `openclaw-web-adapter` 安装为 OpenClaw 兼容插件
- 让它把 adapter 注册到 OpenClaw 环境中
- 让插件托管已配置 watcher 进程
- 对已支持 adapter 暴露无需逐站点手工接线的页面能力

当前仍未实现的内容：

- OpenClaw 进程内浏览器运行时
- 一等公民级别的 MCP server 打包
- 超出当前早期插件接口之外的多站点原生编排

关于目标中的 OpenClaw 原生形态，更多说明见 `OPENCLAW_INTEGRATION.md`。

## 8. 当前示例路径

- runner：`src/adapters/1688.com/chat/runner.ts`
- selectors：`src/adapters/1688.com/chat/selectors.example.json`
- adapter 契约实现：`src/adapters/1688.com/chat/adapter.ts`

## 9. 常见失败场景

- relay URL 错误
  - browser relay 未运行，或端口不可达
- 目标页面未打开
  - watcher 无法自动匹配已支持页面
- selector 漂移
  - 站点 DOM 已变化，需要更新 adapter
- plugin event endpoint 错误
  - 本地已读到 watcher 事件，但无法向上游投递

## 10. 当前状态与目标摘要

当前：

- 已可安装为 OpenClaw 插件包
- 已有 OpenClaw 插件路由与 CLI
- 当前可运行 watcher 仍是绑定浏览器的 companion 执行形态
- 已支持已支持页面的自动匹配
- 已具备 tool 风格和 watcher 风格的基础积木

目标：

- 更深的 OpenClaw 托管式 tool / watcher 集成
- 覆盖更多站点的 adapter
