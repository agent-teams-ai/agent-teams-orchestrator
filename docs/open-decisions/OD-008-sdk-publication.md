---
id: OD-008
type: open-decision
status: open
owner: clients/sdk
summary: Define generated SDK package names, publication, versioning, and support policy.
related:
  - architecture.sdk-transports
  - ADR-0015
  - ADR-0016
  - ADR-0017
  - ADR-0021
  - ADR-0024
  - ADR-0036
  - OD-016
---

# OD-008: SDK Publication

## Decision required

Select package names, registry access, release versioning, generated-client
publication, runtime support, and compatibility policy.

## Accepted constraints

SDK implementation remains deferred until the first stable control contract
exists. SDKs contain transport and contract behavior, never orchestration business
logic.

ADR-0015 fixes the architectural shape:

- a handwritten, capability-oriented facade is the primary SDK;
- the TypeScript product package is `@agent-teams/orchestrator-sdk`;
- if generated Protobuf artifacts are published, their advanced package is
  `@agent-teams/orchestrator-contracts` and is not re-exported by the product SDK;
- `@agent-teams/runtime-gateway` belongs to the orchestrator-to-`ar` integration
  boundary and is not a public control SDK package;
- generated transport artifacts are not exported from the root package;
- official transports remain internal parallel adapters behind one facade;
- the first internal transport boundary is not a public third-party SPI;
- SDK SemVer and control-protocol schema versions are separate;
- supported transports pass one behavioral conformance suite.
- public control Protobuf and generated stubs are not exported from the root
  handwritten SDK;
- browser-safe modules cannot import Node.js, sidecar, process, or filesystem
  code;
- Node local-sidecar and embedded connectors use separate entry points or
  packages;
- transport selection is explicit and never inferred silently from the runtime;
- package `exports` prohibit deep imports.
- `@agent-teams/orchestrator-sdk` uses explicit Node ESM and CommonJS outputs
  plus an isolated browser ESM conditional export;
- the initial SDK Node support floor is version 22;
- Node-only Supervisor discovery and local lifecycle are isolated in
  `@agent-teams/orchestrator-local`;
- packed-artifact, Node ESM/CommonJS, TypeScript resolution, bundler, browser
  graph, previous-consumer, Connect-Web proxy, and size-budget fixtures are
  mandatory release gates.

A production-like proxy matrix passed 121/121 checks through nginx and Envoy in
Chromium, Firefox, and WebKit. It confirmed cross-origin unary calls, resumable
server streams, authentication rotation, proxy restart recovery, cancellation,
deadlines, typed errors, CORS, limits, and fail-fast configuration probes. It also
proved that browser engines may coalesce application frames, so SDK correctness
cannot depend on per-chunk arrival timing.

The retained `Connect browser and reverse-proxy matrix` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

## Remaining choices

- exact Go and Rust module names and final Node package boundaries;
- private or public registry access;
- exact supported Node minor lines and browser versions at first release;
- whether advanced generated Protobuf artifacts are published separately;
- supported SDK/server compatibility window and deprecation period;
- release automation, provenance, signing, and consumer package fixtures.

TLS termination, HTTP/2 downstream, multi-hop CDN or enterprise gateways, and
Windows package installation remain deployment or release conformance work.

## Resolution

Open.
