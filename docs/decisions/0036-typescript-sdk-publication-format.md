---
id: ADR-0036
type: adr
status: accepted
owner: clients/sdk
summary: Publish the TypeScript SDK with explicit Node ESM and CommonJS outputs plus an isolated browser export.
approved_by: product-owner
accepted_at: 2026-07-25
related:
  - ADR-0015
  - ADR-0016
  - ADR-0024
  - architecture.sdk-transports
  - OD-008
---

# ADR-0036: TypeScript SDK Publication Format

## Context

The handwritten TypeScript SDK must support Node.js applications, CommonJS
consumers, browser applications, modern bundlers, and future internal transport
changes without exposing generated Protobuf or local process-management code.

An isolated publication spike built and installed packed SDK versions through
Node.js 22.23.1, 24.18.0, and 26.5.0, TypeScript `NodeNext` and `Bundler`,
esbuild, Rollup, and a real Chromium Connect-Web client behind a cross-origin
HTTP proxy. All 39 checks passed.

Modern Node can load an ESM-only package through `require(ESM)`, but that behavior
can be disabled by runtime policy. The explicit CommonJS output added only 626
compressed bytes in the tested package.

## Decision

Publish `@agent-teams/orchestrator-sdk` as one handwritten universal package with:

- an explicit Node.js ESM entry point;
- an explicit Node.js CommonJS entry point;
- a browser ESM entry point selected by conditional exports;
- `sideEffects: false`;
- an initial Node.js support floor of version 22;
- package exports that make generated Protobuf, Connect stubs, and internal
  transports unreachable through public or deep imports.

The browser dependency graph cannot contain Node.js built-ins, Connect-Node,
Supervisor, local Host discovery, filesystem, process, or local-credential code.
Node-only local lifecycle and discovery are published separately as
`@agent-teams/orchestrator-local`.

Generated Protobuf artifacts remain internal to the product SDK. Publishing a
separate advanced contracts package remains an independent OD-008 decision.

The release pipeline installs the actual `npm pack` artifact and checks:

1. the publish-file allowlist;
2. Node ESM and CommonJS consumers on every supported Node line;
3. TypeScript `NodeNext` and `Bundler` consumers;
4. browser resolution and tree shaking with esbuild and Rollup;
5. forbidden browser dependencies and forbidden generated deep imports;
6. a supported previous compiled consumer against the current additive SDK;
7. Connect-Web unary calls and resumable server streams through a CORS proxy;
8. package and browser-bundle size budgets;
9. public API reports and SemVer review.

SDK mutation commands do not acquire implicit retries from the browser or proxy.
Only reads and commands whose contracts define idempotency and ambiguous-outcome
handling may retry.

## Evidence

The spike observed:

- successful `npm pack` and `npm publish --dry-run` with seven intended files;
- ESM and CommonJS consumption across the three tested Node lines;
- a consumer compiled against SDK 1.0.0 running unchanged with additive 1.1.0;
- no forbidden Node or local-Host dependency in the browser graph;
- ordered Connect-Web stream recovery after an opaque cursor with duplicate
  suppression;
- typed deadline, cancellation, and protocol errors through a cross-origin
  proxy;
- a 109,704-byte minified browser bundle, 30,476 bytes with gzip, for the full
  synthetic import;
- a 32-byte esbuild output when importing only one tree-shakeable constant.

These measurements are initial regression baselines, not permanent product size
allowances.

## Consequences

- CommonJS compatibility does not depend on Node's optional `require(ESM)`
  behavior.
- Browser and Node users share one idiomatic API while receiving isolated
  dependency graphs.
- Local zero-touch startup stays an explicit Node-only capability.
- Release tests must exercise packed artifacts and real consumers, not only the
  source workspace.
- Firefox, WebKit, Windows installation, production reverse-proxy matrices,
  registry provenance, signing, and source-map policy remain release gates.

## Rejected alternatives

- Publish the v1 product SDK as ESM-only for negligible package savings.
- Export generated Protobuf or Connect clients from the product SDK root.
- Include Supervisor discovery and process lifecycle in the universal SDK.
- Publish separate handwritten Node and browser APIs with divergent semantics.
