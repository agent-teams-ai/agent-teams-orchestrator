---
id: ADR-0098
type: adr
status: accepted
owner: architecture
summary: Adopt the immutable organization Feature Module Standard v1 and retain Orchestrator-specific rules in a local profile.
approved_by: product-owner
accepted_at: 2026-08-29
related:
  - ADR-0032
  - ADR-0051
  - ADR-0053
  - architecture.feature-module-standard
---

# ADR-0098: Adopt Organization Feature Module Standard v1

## Context

The existing Feature Module Standard combines a broadly reusable architecture
core with Orchestrator-owned topology, TypeScript packaging, runtime integration,
Foundation conformance, and accepted ADR details. Other Agent Teams repositories
need the reusable rules without copying Orchestrator policy or allowing central
changes to silently redefine product architecture.

The organization has accepted the language-neutral
`agent-teams.feature-module-standard` as a versioned immutable standard. The
Orchestrator must bind to one exact version while keeping local package identity,
materialization, dependency, technology, and enforcement authority.

## Decision

- Adopt organization Feature Module Standard `v1` at
  `agent-teams-ai/.github/docs/architecture/feature-module-standard/v1.md`, Git
  blob `d0bfff2033faf544fe65268c1dcdfd524d093015`, SHA-256
  `851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa`.
- Keep `architecture.feature-module-standard` as the stable local document ID,
  but change its responsibility to the Orchestrator adoption profile and local
  extensions.
- Record the exact adoption, scope, authorities, deviations, and enforcement in
  `architecture/feature-module-standard-profile.json`.
- Apply `v1` to production packages under `packages/**` and thin applications
  under `apps/**`. Repository tooling under `scripts/**` and `tooling/**` remains
  governed by the repository-tooling architecture.
- Retain package catalog, materialization, source-dependency, TypeScript
  publication, Awilix, Temporal, JetStream, runtime-gateway, and package-surface
  rules as Orchestrator-owned profile extensions.
- Declare no deviations from `v1` at adoption.
- Run the deterministic profile binding check in fast and complete quality gates.
  Run its negative conformance tests in the complete architecture gate.
- Do not adopt a successor standard or add a deviation implicitly. Either change
  requires a new accepted repository decision and an updated local profile.

## Consequences

- Other repositories can reuse one stable feature architecture without inheriting
  Orchestrator-specific package or technology choices.
- Orchestrator retains its existing stable document ID, internal relations, and
  package-catalog ownership coordinate.
- Central `v1` evolution cannot create silent local drift because its content
  digest and Git blob identity are pinned.
- Local extensions remain reviewable beside their enforcement and can evolve
  independently without forking the universal standard.
- Cross-repository publication order matters: the central immutable artifact must
  merge before a consumer link becomes reachable on the default branch.

## Rejected alternatives

- Keep the universal standard only in Orchestrator. This leaves authority in one
  consumer and encourages other repositories to depend on product policy.
- Copy a generalized document into every repository. Copies would drift and
  create several apparent normative authorities.
- Move the complete current document centrally. That would incorrectly centralize
  Orchestrator ADRs, package topology, TypeScript packaging, and runtime choices.
- Fetch an unpinned central document during every local gate. That would make a
  deterministic repository check depend on network availability and mutable
  remote state.
