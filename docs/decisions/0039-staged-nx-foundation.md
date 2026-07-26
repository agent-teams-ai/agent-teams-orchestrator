---
id: ADR-0039
type: adr
status: accepted
owner: engineering/tooling
summary: Adopt Nx incrementally as a package-based task and project graph without making it the source of architecture topology.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0031
  - ADR-0032
  - ADR-0038
  - architecture.repository-tooling
---

# ADR-0039: Staged Nx Foundation

## Context

The repository is expected to grow into many applications, bounded-context
packages, integrations, SDKs, and tooling packages. Plain workspace scripts remain
portable but do not provide one project graph, affected execution, task pipelines,
or deterministic local caching. Adding those capabilities only after the workspace
has grown would require consolidating competing scripts and project metadata.

Nx can add graph and task capabilities to an existing pnpm workspace without
changing package ownership or product runtime. Its optional plugins, executors,
generators, remote cache, and integrated layout would create premature coupling if
adopted before real package conventions are proven.

## Decision

Adopt Nx in staged, package-based mode. The initial foundation uses the exact
accepted Nx version only for:

- workspace project discovery from pnpm package manifests;
- project and task graphs;
- affected-project calculation;
- local caching of deterministic tasks;
- task ordering and parallel execution;
- graph inspection for developers and coding agents.

The following remain authoritative:

- `pnpm-workspace.yaml` and package manifests own workspace membership;
- `architecture/package-catalog.yaml` owns allowed package identity and role;
- architecture validators own DDD, package, layer, and feature rules;
- package scripts own portable task commands;
- TypeScript configurations own compiler behavior.

Nx configuration must derive from or validate against those sources. It cannot
introduce a second manually maintained package taxonomy.

Do not initially adopt Nx Cloud, remote caching, an integrated workspace layout,
Nx executors, `project.json`, `@nx/js`, local generators, release automation, or Nx
as a runtime dependency. Each later capability is enabled only at the trigger and
conformance gate defined by the repository tooling plan.

Product source cannot import Nx or `@nx/*`. Exact Nx package versions remain
aligned and pinned. An Nx upgrade is an isolated tooling change with graph, cache,
affected, and existing quality-gate verification.

## Consequences

- The repository gains project visibility, affected execution, and caching before
  custom task infrastructure proliferates.
- Standard pnpm packages and scripts remain usable without Nx.
- Architecture ownership remains independent of the monorepo tool.
- Some high-value Nx capabilities are deliberately delayed until real packages
  provide evidence for their configuration.
- The repository temporarily maintains full quality gates alongside affected
  execution until equivalence is proven.

## Rejected alternatives

- Delay all Nx adoption until the workspace contains many packages.
- Generate an integrated Nx workspace and let its layout define package ownership.
- Adopt Nx Cloud and remote cache before a CI bottleneck and trust review exist.
- Replace the package catalog or architecture validator with manually maintained
  Nx tags.
- Adopt Turborepo, Lage, Rush, or another overlapping task graph alongside Nx.
