# SPEC

Repository-level specification for `openclaw-web-adapter`.

## 1. Scope

This repository defines a reusable web-adaptation layer that turns concrete web
pages into stable capabilities for agents.

The repository is responsible for:

- adapter contracts
- adapter selection
- structured page snapshots
- normalized action execution
- action confirmation and health reporting
- watch-oriented runtime building blocks
- site-specific adapters implemented against the shared contract

The repository is not responsible for:

- business decision logic
- domain-specific agent workflows
- CRM or quoting systems
- replacing the underlying browser transport

## 2. Repository Structure

Site implementations must live under:

`src/adapters/<domain>/<page>/`

Examples:

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

Repository root should contain repository-level documents, package metadata, and
shared tooling only. Site-specific runners or selectors should not live at the
root.

## 3. Adapter Identity

Each adapter must have a stable `id` in the form:

`<domain>/<page>`

Examples:

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

This keeps public identifiers aligned with the repository layout.

## 4. Automatic Selection Policy

The default user experience should be automatic adapter matching.

For supported pages, users should not be required to manually choose an
adapter.

The runtime should evaluate:

- page URL
- frame URL
- page title
- DOM anchors
- adapter confidence

Manual adapter override may exist for debugging, recovery, or testing, but it
should not be the primary product path.

## 5. Contract Model

The contract model is defined in `src/contracts.ts`.

### 5.1 Target

`WebAdapterTargetContext` is the normalized page/frame input used by every
adapter.

It contains:

- page handle
- frame handle
- target id
- page URL
- frame URL
- page title

### 5.2 Matching

Each adapter must implement:

`match(target) -> AdapterMatchResult`

This decides whether the adapter applies to the current page and how confident
that match is.

### 5.3 Capability Description

Each adapter must implement:

`describeCapabilities() -> WebAdapterCapability[]`

Capabilities are grouped by page kind:

- `chat`
- `article`
- `list`
- `detail`
- `feed`
- `form`

### 5.4 Snapshot

Each adapter must implement:

`scan(target) -> WebAdapterSnapshot`

The snapshot must contain:

- `adapterId`
- `kind`
- `capturedAt`
- normalized target metadata
- normalized health block
- adapter-specific payload

### 5.5 Actions

Each adapter must implement:

`perform(target, request) -> WebAdapterActionResult`

Actions must be normalized into a standard result shape:

- `ok`
- `confirmed`
- `attempt`
- optional `error`
- optional `details`

## 6. Runtime Shapes

The shared runtime is intentionally small, but it must support two integration
shapes.

### 6.1 MCP-friendly Tool Shape

Tool shape covers request/response operations such as:

- match
- scan
- read
- perform action

### 6.2 Watcher Shape

Watcher shape covers long-lived sessions such as:

- chat monitoring
- inbox monitoring
- change streams
- event delivery

### 6.3 Registry

`src/registry.ts` manages adapter registration and best-match selection.

Rules:

- adapter ids must be unique
- matching is confidence-based
- highest-confidence match wins

### 6.4 Runtime

`src/runtime/adapter-runtime.ts` exposes the shared entrypoints:

- `resolveAdapterForTarget(...)`
- `scanWithBestAdapter(...)`
- `performWithBestAdapter(...)`

These entrypoints are site-agnostic and operate against the shared contract.

### 6.5 Watch-Oriented Runtime Pieces

The repository may include reusable watch/runtime primitives such as:

- polling
- plugin event posting
- outbound queueing
- health state
- request parsing helpers

These are reusable building blocks, not business-agent code.

## 7. OpenClaw Integration Boundary

This repository is intentionally designed for OpenClaw integration.

Boundary:

- OpenClaw provides browser transport and low-level browser control
- Web Adapter provides page recognition, structured scans, page actions, and
  watcher building blocks
- agents/plugins consume Web Adapter outputs

Native packaged installation into OpenClaw is a target direction, not a current
guarantee.

## 8. Adapter Requirements

Every site adapter should follow these rules:

1. Keep selectors local to the adapter directory.
2. Keep page-specific parsing local to the adapter directory.
3. Reuse shared runtime/core modules instead of duplicating generic behavior.
4. Confirm page actions whenever confirmation is possible.
5. Return normalized health information for unsupported, degraded, or logged-out
   states.
6. Prefer adapter-local tests for matching, scanning, and critical actions.

## 9. Public API Surface

The current public entrypoint is `src/index.ts`.

It exports:

- contract types
- registry
- runtime entrypoints
- current built-in adapters

The API overview and example imports live in `API.md`.

## 10. Contribution Direction

New work should usually follow one of these tracks:

- add a new adapter under `src/adapters/<domain>/<page>/`
- extend the shared contract in a backward-compatible way
- improve generic runtime pieces without introducing site coupling
- add tests that validate adapter behavior or contract invariants

Avoid adding product-specific business logic to this repository.
