# OPENCLAW INTEGRATION

How `openclaw-web-adapter` is intended to fit into OpenClaw.

## 1. Objective

This repository is built for OpenClaw, but it should remain a reusable tool
project in its own right.

The integration goal is:

- OpenClaw provides browser transport and agent runtime
- Web Adapter provides site/page understanding and page actions
- agents consume Web Adapter through stable tool and watcher surfaces

## 2. Current Integration Shape

Today, integration is native-first but still hybrid at the browser execution
layer.

That means:

1. Web Adapter can be installed into OpenClaw as a standard plugin package
2. OpenClaw is already installed and running
3. OpenClaw browser relay is already available
4. the user can access native plugin routes and CLI
5. the plugin can supervise explicitly configured native watchers for supported
   adapters
6. manual watcher entries from this repository still exist for development and
   debugging
7. Web Adapter attaches to the page through OpenClaw browser transport

This is functional, and packaged plugin discovery plus plugin-supervised native
watchers now exist, but browser execution is still handled by child watcher
processes rather than an in-process OpenClaw browser runtime.

## 3. Why Web Adapter Should Not Replace OpenClaw Browser Transport

OpenClaw already solves:

- attachment to existing Chrome tabs
- low-level browser control
- relay and browser-facing transport

Web Adapter should not duplicate that layer.

Its job is the next layer up:

- page matching
- page scanning
- normalized actions
- action confirmation
- site/page adapter registration
- watch-oriented page workflows

## 4. Current Native Integration

The target shape is OpenClaw-native, not just companion-style.

### 4.1 Installation experience

Current implemented baseline:

- `openclaw plugins install /path/to/openclaw-web-adapter`
- `openclaw plugins install -l /path/to/openclaw-web-adapter`

Current user experience:

- install `openclaw-web-adapter` as an OpenClaw-compatible package
- let OpenClaw discover or load it from an expected extension/plugin location
- expose plugin routes, plugin CLI, and watcher status
- optionally let the plugin supervise configured watcher processes

### 4.2 Runtime experience

Current runtime experience for native watcher mode:

- user opens a supported site in Chrome
- OpenClaw provides the browser session
- Web Adapter plugin starts configured watcher processes
- each watcher auto-matches the correct adapter for the target page
- agents/plugins consume the resulting events or invoke actions through the
  watcher surface
- no manual adapter selection is required for supported pages

## 5. Integration Modes

### 5.1 Tool Mode

This is the MCP-friendly direction.

Typical operations:

- match current page
- scan current page
- read structured data
- perform a normalized page action

This mode is best for request/response workflows.

### 5.2 Watcher Mode

Typical operations:

- watch a chat window
- watch a mailbox
- watch a page for structured change events

This mode is best for long-lived sessions.

The current `1688.com/chat` example is a watcher-first example.

## 6. OpenClaw Packaging Direction

This section now mixes current implementation and remaining direction.

### Option A: OpenClaw-hosted extension package

Shape:

- install Web Adapter into an OpenClaw extension/plugin-compatible location
- OpenClaw loads the package
- Web Adapter registers adapters, exposes routes/tools, and supervises watcher
  processes

Pros:

- feels native to OpenClaw
- easier user story
- easier future official inclusion

Tradeoff:

- requires agreement on package shape and registration surface

### Option B: MCP-facing companion with OpenClaw browser dependency

Shape:

- Web Adapter exposes MCP-friendly tools
- OpenClaw still supplies browser transport
- users run Web Adapter next to OpenClaw

Pros:

- decoupled
- easier multi-client reuse

Tradeoff:

- feels less native than Option A

### Practical conclusion

The likely long-term answer is:

- support `Option B` as a reusable interface shape
- move toward `Option A` for the best OpenClaw-native user experience

## 7. What Still Needs to Be Defined

To complete native integration, these pieces still need to be defined:

1. a broader adapter registration contract beyond the current built-ins
2. a first-class tool exposure contract
3. a first-class MCP surface
4. a richer health and event delivery contract across many adapter types
5. how OpenClaw settings should manage complex multi-site watcher fleets

## 8. Current Honest Status

Today:

- browser integration works through OpenClaw relay
- OpenClaw plugin install/discovery works through standard plugin packaging
- supported-page auto-matching exists
- plugin-supervised native watcher orchestration exists for configured supported adapters
- browser execution still happens in watcher child processes rather than inside OpenClaw itself

That distinction should stay explicit in project docs until implementation
catches up.
