---
id: ADR-0081
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/tooling
summary: Use the versioned Foundation Plan, Apply, and Recover protocol for library package boundaries while keeping Orchestrator topology authority local.
approved_by: product-owner
accepted_at: 2026-08-08
related:
  - ADR-0038
  - ADR-0039
  - ADR-0059
  - architecture.feature-module-standard
  - architecture.repository-tooling
---

# ADR-0081: Foundation-Owned Package Scaffolding Protocol

## Context

The repository-local package generator duplicated deterministic rendering,
filesystem publication, and recovery concerns that are shared across Agent Teams
repositories. Keeping that implementation after Foundation gained a qualified
generic library-boundary Recipe would create two mutation engines and allow their
bytes or failure behavior to diverge.

The Orchestrator must still own package identities, roles, paths, owner documents,
feature acceptance, project references, and dependency policy. Moving those facts
into Foundation would reverse the dependency and turn reusable tooling into a
product architecture authority.

## Decision

Use exact registry dependency `@agent-teams/engineering-foundation@0.8.0` and its
closed definitions:

```text
ScaffoldProfile  foundation.node-typescript-pnpm-esm@1
Recipe           foundation.node-typescript-library-boundary@1
```

`architecture/foundation/scaffolding.yaml` is the consumer-owned Composition. It
admits only library roles and binds Foundation to the local package catalog and
owner documents. Applications are not passed through the library Recipe; a future
application Recipe requires separate evidence and adoption.

The repository command is a thin adapter with three explicit phases:

```text
plan --id <catalog-id>
apply --plan <repository-relative-plan>
recover
```

There is no one-shot Plan-and-Apply command. Plan files live in ignored local
state by default and must be reviewed before Apply. Apply executes the exact saved
bytes and re-verifies source-bound authority. Recover never runs unrelated
topology validation because a pending journal must remain recoverable even while
other repository state is invalid.

The adapter keeps one consumer-specific precondition: planning rejects an existing
target root. After Apply, the same reviewed change must add the accepted first
feature slice and root project reference before repository topology can pass.

`platform.local-host-control` is the sole real donor. Qualification proves exact
legacy boundary bytes, synthetic role and path variance, authority staleness,
replay, journal recovery, tamper rejection, and filesystem boundary rejection.
The consumer suite runs on Linux, macOS, and Windows in CI.
The machine-readable record is
`architecture/foundation/scaffolding-qualification.yaml` with statuses
`IMPLEMENTED` and `ORCHESTRATOR_QUALIFIED`. Agent Runtime is not a prerequisite or
a second donor.

## Consequences

- Foundation owns one reusable compiler, recipe renderer, filesystem transaction,
  and recovery protocol.
- Orchestrator keeps all product topology and acceptance facts as data.
- The old local renderer and atomic writer are removed after parity evidence
  passes; no permanent fallback generator remains.
- A Foundation upgrade that changes recipe bytes requires an explicit exact-
  version update and refreshed consumer qualification.
- Nx may later call the same protocol but cannot own a second template set.

## Rejected alternatives

- Keep both generators as permanent fallbacks.
- Move Orchestrator roles, contexts, paths, or owner documents into Foundation.
- Require Agent Runtime or another unfinished product repository as a second donor.
- Generate applications through the library Recipe.
- Add a one-shot command that hides the reviewed Plan boundary.
