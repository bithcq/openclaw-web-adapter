[English](./INSTALL.md) | [简体中文](./INSTALL.zh-CN.md)

# INSTALL

Installation and usage guide for `openclaw-web-adapter`.

## 1. Positioning

This repository is currently a companion project for OpenClaw.

Current truth:

- it can already work with OpenClaw browser relay
- it can already auto-match supported pages
- it can now be installed as an OpenClaw plugin package
- it can now supervise configured native watchers through the OpenClaw plugin service
- companion-style runner execution still exists for manual development and debugging

## 2. Requirements

- Node.js `22+`
- `pnpm`
- a working OpenClaw installation
- OpenClaw CLI available in the current shell
- OpenClaw gateway running locally
- OpenClaw browser relay available locally
- Chrome opened with the target page already loaded
- for the root helper scripts:
  - `install.sh` / `update.sh` require `git`
  - the scripts first try `openclaw daemon restart` and only fall back to `systemctl --user restart openclaw-gateway.service`

## 3. Current Development Installation

### 3.0 One-click plugin scripts

For the current companion/plugin shape, you can use these root scripts:

```bash
bash install.sh
bash update.sh
bash uninstall.sh
```

Behavior:

- `install.sh`
  - default target is the current repository checkout
  - if you pass a non-existent path, clone the current repository `origin` into that path first
  - run `pnpm install`
  - install the plugin into OpenClaw with `openclaw plugins install -l`
  - enable the plugin
  - restart the gateway
- `update.sh`
  - default target is the current repository checkout
  - update using the checkout's configured upstream branch, or fall back to the current branch plus its first remote
  - rerun dependency install
  - refresh the linked plugin install from that same checkout
  - restart the gateway
- `uninstall.sh`
  - run `openclaw plugins uninstall web-adapter --keep-files --force`
  - restart the gateway
  - keep the local repository checkout on disk

Examples:

```bash
# install the current checkout
bash install.sh

# bootstrap a separate checkout, then install it
bash install.sh ~/openclaw-web-adapter

# update a specific checkout
bash update.sh ~/openclaw-web-adapter
```

### 3.1 Install into OpenClaw

For local development, install the repository into OpenClaw with either of
these:

```bash
openclaw plugins install -l /path/to/openclaw-web-adapter
```

or

```bash
openclaw plugins install /path/to/openclaw-web-adapter
```

Then restart the OpenClaw gateway.

After installation, verify discovery:

```bash
openclaw plugins list
openclaw web-adapter status --json
openclaw web-adapter watchers --json
```

### 3.2 Configure native watcher mode

Add plugin config under `plugins.entries.web-adapter.config`:

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

Restart the gateway after editing config.

### 3.3 Clone and install

```bash
git clone https://github.com/bithcq/openclaw-web-adapter.git
cd openclaw-web-adapter
pnpm install
```

### 3.4 Make sure OpenClaw is running

You need a local OpenClaw gateway and browser relay before using this
repository.

Typical local assumptions:

- gateway HTTP base: `http://127.0.0.1:18789`
- browser relay base: `http://127.0.0.1:18792`

### 3.5 Open the target page in Chrome

For the current runnable example, open the 1688 chat page in a Chrome tab that
OpenClaw can attach to.

### 3.6 Optional: run the adapter entry manually

```bash
pnpm dev:1688-chat -- \
  --cdp-url http://127.0.0.1:18792 \
  --plugin-events-url http://127.0.0.1:18789/plugins/ali1688/events \
  --plugin-auth-token replace-me \
  --download-dir /tmp/openclaw-1688-media \
  --selectors ./src/adapters/1688.com/chat/selectors.example.json
```

### 3.7 Verify the runtime

After starting native watcher mode or a manual watcher entry, verify these
points:

1. the process stays alive
2. the target Chrome tab is already open
3. the local OpenClaw browser relay is reachable
4. the adapter health endpoint is reachable

Example checks:

```bash
openclaw web-adapter status --json
openclaw web-adapter watchers --json
curl http://127.0.0.1:18888/health
```

Expected result:

- the HTTP request succeeds
- `lastScan` is populated
- `lastError` is either `null` or empty
- `openclaw web-adapter watchers --json` shows the watcher in `running` state

If `target_not_found` appears, the current page does not match a supported
adapter yet or the expected target tab is not open.

## 4. What happens at runtime

The current runtime flow is:

1. attach to Chrome through OpenClaw browser relay
2. inspect page URL, frame URL, and DOM
3. auto-match the best adapter
4. scan the page or watch the page
5. expose structured events or action results

Users are not expected to manually choose an adapter during normal usage for
supported pages.

## 5. Tool Mode vs Watcher Mode

### Tool Mode

Use tool mode when you want request/response interactions such as:

- scan the current page
- read items or messages
- perform a page action

This is the MCP-friendly direction for Web Adapter.

### Watcher Mode

Use watcher mode when you want long-lived page monitoring such as:

- chat windows
- inbox changes
- page event streams

The current `1688.com/chat` example is primarily a watcher-style integration.

## 6. OpenClaw Integration Model

The current OpenClaw integration shape is:

- OpenClaw owns browser transport
- Web Adapter owns page semantics, page actions, and plugin-supervised watcher lifecycle
- agents or plugins consume Web Adapter capabilities

Target integration options:

1. OpenClaw-hosted tool surface
2. OpenClaw-hosted watcher companion
3. MCP-friendly interface exposed by Web Adapter while still relying on
   OpenClaw browser transport

## 7. Native Installation Status

This is now implemented for explicitly configured supported watchers.

The target user experience is:

- install `openclaw-web-adapter` as an OpenClaw-compatible package
- let it register its adapters into the OpenClaw environment
- let the plugin supervise configured watcher processes
- expose page capabilities without per-site manual wiring for supported adapters

What still does not exist yet:

- an in-process browser runtime inside OpenClaw
- first-class MCP server packaging
- multi-site native orchestration beyond the current early plugin surface

More detail about the intended OpenClaw-native shape lives in
`OPENCLAW_INTEGRATION.md`.

## 8. Current Example Paths

- runner: `src/adapters/1688.com/chat/runner.ts`
- selectors: `src/adapters/1688.com/chat/selectors.example.json`
- adapter contract implementation: `src/adapters/1688.com/chat/adapter.ts`

## 9. Common Failure Cases

- relay URL is wrong
  - the browser relay is not running or the port is not reachable
- target page is not open
  - the watcher cannot auto-match a supported page
- selector drift
  - the site DOM changed and the adapter needs an update
- plugin event endpoint is wrong
  - watch events are read locally but cannot be delivered upstream

## 10. Current vs Target Summary

Current:

- installable as an OpenClaw plugin package
- OpenClaw plugin routes and CLI surface
- browser-bound companion execution for the current runnable watcher
- supported-page auto-matching
- tool-style and watcher-style building blocks

Target:

- deeper OpenClaw-hosted tool and watcher integration
- broader adapter coverage across many sites
