[English](./README.md) | [简体中文](./README.zh-CN.md)

# Web Adapter for OpenClaw

A reusable web understanding and interaction layer built for OpenClaw.

`Web Adapter` turns real websites into stable, reusable read/write capabilities
for agents. It is designed to sit above OpenClaw browser transport and below
business-agent logic.

## Overview

`Web Adapter` is not a one-site script. It is a general adapter layer for web
pages.

Its job is to make pages usable through a consistent contract:

- recognize the current page automatically
- scan the page into structured data
- perform page actions through normalized requests
- confirm whether actions really succeeded
- support both synchronous tool calls and long-lived watchers

## Design Principles

### 1. Automatic adapter selection by default

When many adapters exist, users should not need to manually choose one for
normal usage.

The runtime should:

- inspect page URL, frame URL, title, and DOM anchors
- choose the best matching adapter automatically
- expose the matched page capabilities to agents

Manual adapter selection may still exist for debugging, but it should not be
the primary user experience.

### 2. OpenClaw-first integration

`Web Adapter` is built for OpenClaw.

That means:

- it should work cleanly with OpenClaw browser transport
- it should expose tool-friendly and watcher-friendly surfaces
- its installation path should eventually feel native to OpenClaw

### 3. MCP-friendly tools and watcher workflows

This repository has two intended execution models:

- `MCP-friendly tool mode`
  - for request/response style operations such as `scan`, `read`, and
    `perform action`
- `Watcher mode`
  - for long-lived sessions such as chat monitoring, mailbox watching, and page
    change observation

## Current Truth

The design direction above is intentional, but the current implementation is
still early.

What is true today:

- automatic adapter matching already exists in the shared registry/runtime
- working adapters now include `1688.com/chat`, `1688.com/search`,
  `1688.com/detail`, `1688.com/factory-search`, `mail.qq.com/inbox`,
  `mail.qq.com/thread`, `mail.qq.com/compose`, `mail.google.com/inbox`,
  `mail.google.com/thread`, and `mail.google.com/compose`
- synchronous scan/action flows already exist
- watch-style runtime pieces already exist
- OpenClaw plugin packaging and discovery are now implemented
- plugin-supervised native watchers are now implemented for explicitly
  configured supported adapters

What is not true yet:

- MCP server packaging is not implemented yet
- support for many sites does not exist yet
- there is no in-process browser runtime inside OpenClaw yet
- native watcher orchestration currently depends on explicit watcher config and
  a supported adapter implementation

## How It Fits with OpenClaw

`Web Adapter` is meant to work with OpenClaw in two layers:

1. OpenClaw provides browser attachment and low-level browser control.
2. Web Adapter provides page recognition, structured scans, actions, and watch
   workflows.

Practical layering:

- `OpenClaw Browser Relay / browser control`
- `Web Adapter runtime and site adapters`
- `business agents or plugins`

## Installation

Detailed installation and integration instructions live in `INSTALL.md`.

Quick entry points for the current plugin shape:

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

These scripts default to cloning/updating
`https://github.com/bithcq/openclaw-web-adapter.git` into
`~/web-adapter`, then installing that checkout into OpenClaw. If you
pass a path, the scripts operate on that specific checkout path instead.

### Current development setup

Today, the repository supports all of the following:

- native OpenClaw plugin installation and discovery
- native plugin-supervised watcher execution for configured supported adapters
- companion-style site watcher execution for manual development flows

Current shape:

1. install the package into OpenClaw as a plugin
2. run OpenClaw gateway and browser relay
3. open the target site in Chrome
4. either let the plugin supervise a configured watcher or run a manual watcher
   entry from this repository
5. let Web Adapter attach to the page and match the adapter automatically

For local development against your current working tree, prefer
`openclaw plugins install -l /path/to/web-adapter` directly instead of
the GitHub bootstrap script.

### Target packaged setup

This direction is now partially implemented:

- installable as an OpenClaw-compatible plugin package
- discoverable by OpenClaw through `openclaw plugins install`
- exposing plugin routes, plugin CLI, and the shared runtime/library surface
- exposing plugin-supervised watcher orchestration for configured supported
  adapters
- still evolving toward deeper tool/MCP integration and broader adapter
  coverage

## Usage

### Example watcher flow: `1688.com/chat`

#### Native plugin-supervised watcher

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

#### Companion development watcher

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

### Example tool-style flow

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

## Repository Layout

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

All site-specific code must live under:

`src/adapters/<domain>/<page>/`

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm format:check
```

## Appendix: Supported Sites and Pages

This table is intentionally growing. More adapters will be added over time.

| Site               | Page             | Capability       | Status        | Notes                                                                     |
| ------------------ | ---------------- | ---------------- | ------------- | ------------------------------------------------------------------------- |
| `1688.com`         | `chat`           | `chat`           | `working-mvp` | First fully wired adapter: scan, attachments, send-text, confirm-outbound |
| `1688.com`         | `search`         | `list`           | `working-mvp` | Public search result parsing with structured items and item opening       |
| `1688.com`         | `detail`         | `detail`         | `working-mvp` | Public offer detail parsing: title, price, images, attributes             |
| `1688.com`         | `factory-search` | `list`           | `working-mvp` | Factory list parsing and batch inquiry selection                          |
| `mail.qq.com`      | `inbox`          | `list`           | `working-mvp` | Inbox scan, unread state, pagination, item click                          |
| `mail.qq.com`      | `thread`         | `detail`         | `working-mvp` | Readmail parsing plus quick-reply scan/send                               |
| `mail.qq.com`      | `compose`        | `form`           | `working-mvp` | Compose draft scan plus fill/send                                         |
| `mail.google.com`  | `inbox`          | `list`           | `working-mvp` | Inbox scan, next-page, and thread opening                                 |
| `mail.google.com`  | `thread`         | `detail`         | `working-mvp` | Thread scan plus inline reply scan/send                                   |
| `mail.google.com`  | `compose`        | `form`           | `working-mvp` | Compose draft scan plus fill/send                                         |
| `www.zhihu.com`    | `article`        | `article`        | `planned`     | Article-oriented read adapter                                             |
| `www.bilibili.com` | `video`          | `detail`, `feed` | `planned`     | Media/detail-oriented adapter                                             |

## Project Documents

- `OPENCLAW_INTEGRATION.md`: current and target OpenClaw integration model
- `INSTALL.md`: current setup and target integration path
- `API.md`: public exports and usage examples
- `SPEC.md`: repository-level contracts and design rules
- `ROADMAP.md`: current milestones and next adapters

Each major document also has a matching `*.zh-CN.md` Chinese version.

## Non-Goals

`Web Adapter` is not:

- a business agent
- a CRM workflow system
- a quoting engine
- a one-site throwaway script
- a replacement for OpenClaw browser transport
