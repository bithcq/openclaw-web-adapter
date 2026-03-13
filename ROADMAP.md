[English](./ROADMAP.md) | [简体中文](./ROADMAP.zh-CN.md)

# ROADMAP

Current development roadmap for `openclaw-web-adapter`.

## Principles

- Keep the repository site-agnostic at the root.
- Grow through adapters, not through one-off scripts.
- Standardize contracts before expanding too many sites.
- Prefer reliable page reads and action confirmation over broad but fragile
  coverage.

## Current State

Implemented today:

- shared adapter contract
- adapter registry and best-match selection
- shared scan/perform runtime entrypoints
- watch-oriented runtime building blocks
- working adapters for `1688.com/chat`, `1688.com/search`, `1688.com/detail`, `1688.com/factory-search`, `mail.qq.com/inbox`, `mail.qq.com/thread`, `mail.qq.com/compose`, `mail.google.com/inbox`, `mail.google.com/thread`, and `mail.google.com/compose`
- native watcher orchestration still focuses on `1688.com/chat`

Current maturity:

- architecture: usable
- tooling: usable
- public API: early
- production readiness: partial

## Near-Term Milestones

### M1. Stabilize the Foundation

- keep root repository layout generic and clean
- finish naming cleanup around domain/page adapters
- tighten adapter-level test coverage
- document contribution rules and adapter conventions

### M2. Expand Non-Chat Adapters

- add more non-chat adapters to prove the contract is reusable across page kinds
- preferred targets:
  - `www.zhihu.com/article`
  - `www.bilibili.com/video`
  - broader `1688.com` post-login business pages

### M3. Formalize MCP-Friendly Tool Surface

- define which operations are synchronous tool calls
- define which operations belong to watch-style runtimes
- keep the contract compatible with OpenClaw-hosted integrations

### M3.5 Native OpenClaw Packaging

- implemented:
  - installable/discoverable plugin packaging for OpenClaw-compatible environments
  - plugin routes, plugin CLI, and built-in adapter catalog export
  - plugin-supervised native watcher orchestration for `1688.com/chat`
- remaining:
  - remove as much manual wiring as possible from normal setup
  - expand native watcher support beyond the initial `1688.com/chat` path

### M4. Expand Watch Workflows

- standardize watch lifecycle
- standardize event payload shapes
- standardize health and retry signals for long-lived page sessions

## Planned Adapter Targets

| Site               | Page             | Priority | Reason                                             |
| ------------------ | ---------------- | -------- | -------------------------------------------------- |
| `1688.com`         | `chat`           | current  | First end-to-end adapter and watch workflow        |
| `1688.com`         | `search`         | current  | Public list-style parsing and item opening         |
| `1688.com`         | `detail`         | current  | Public detail parsing and media/attribute reading  |
| `1688.com`         | `factory-search` | current  | Factory list parsing and batch inquiry selection   |
| `mail.qq.com`      | `inbox`          | current  | First mailbox list adapter and first non-chat page |
| `mail.qq.com`      | `thread`         | current  | Readmail parsing and quick-reply actions           |
| `mail.qq.com`      | `compose`        | current  | Draft editing and send flow                        |
| `mail.google.com`  | `inbox`          | current  | Validates list-style adapters                      |
| `mail.google.com`  | `thread`         | current  | Validates detail/article hybrid pages              |
| `mail.google.com`  | `compose`        | current  | Validates form-style actions                       |
| `www.zhihu.com`    | `article`        | high     | Validates article parsing                          |
| `www.bilibili.com` | `video`          | medium   | Validates media/detail parsing                     |

## Definition of Progress

An adapter is considered:

- `planned` when only the target and intended capability are defined
- `experimental` when the adapter can match and partially scan/action a page
- `working-mvp` when the main read/action loop works locally with tests
- `production-ready` only after stability, regression coverage, and recovery
  behavior are in place
