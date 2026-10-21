---
id: ADR-0103
type: adr
status: accepted
owner: migration/desktop
approved_by: product-owner
accepted_at: 2026-10-21
summary: Admits scoped server Team, Run, planned Work and direct-message implementation under the runtime migration mandate.
related:
  - contract.migration.desktop-first-slice.v1
  - architecture.implementation-readiness-gates
  - architecture.migration-boundary
  - ADR-0071
  - ADR-0076
  - ADR-0079
  - ADR-0087
  - ADR-0100
  - ADR-0101
  - OD-004
  - OD-006
  - OD-010
  - OD-012
  - OD-026
  - OD-027
---

# ADR-0103: First Sandbox Runtime Migration Slice Admission

## Context

The owner has authorized the A-F provider/runtime/core/Desktop migration while
preserving full teams. The canonical Orchestrator currently admits a
side-effect-free Team draft pilot; its first production slice has five blocking
readiness gates. Implementing E inside Desktop or treating B fixtures as a new
business kernel would violate those boundaries. A scoped admission must instead
name concrete owners, public contracts and rejecting failure evidence before
production adapters exist.

The [first-slice contract](../contracts/desktop-runtime-migration-admission-v1.md)
contains exact owner-separated proposed Protobuf, desktop/fork oracle identities,
request retention, authorization, Run cancellation, planned Work placement,
Conversation delivery, Observation and target/feed semantics. Its evidence matrix
separates admission models from the production conformance that follows admission.

## Decision

Admit implementation only for a new explicitly test-only server Project, one
existing canonical Agent and profile version, one Team version and Run, Task
creation and metadata edit, planned Run-owned Work placement, direct human/member
messages and their authorized read projections. The server Host remains the
business authority and the runtime remains execution owner. This advances scoped
Team S3/S4. Canonical dossier status accepts only the named sandbox feature in
each of the six owning contexts; broader discovery stays explicitly excluded.
Catalog and LikeC4 keep the strategic dossier IDs. This uses the supported
owner-status and Plan/Apply path without an admission-registry extension.

The exact contract is `contract.migration.desktop-first-slice.v1`, fixture version
`desktop-first-slice/v1`. Feature-owned Protobuf golden sources precede production
materialization. Public Connect JSON, direct SDK, MCP and Desktop adapters all
invoke the same owning use cases; their transport DTOs never become domain models.
One feature transaction commits its receipt, Operation, business change and outbox.
There is no cross-context Unit of Work, second business kernel or dual writer.

Run Orchestration owns activation, planned Work placement, runtime dispatch and
cancellation processes, immutable source Team/Run-policy references, occupancy
and opaque runtime references. Work Coordination alone creates/edits Tasks and
changes Work lifecycle. Planned placement does not dispatch Work, set assignment
or complete a Task. Agent Communication alone commits direct dialogue and delivery
intent. Agent Context owns the minimum immutable manifest; Execution Observation
owns authorized normalized Activity and protected diagnostic payload.

The first scheduler is an in-process adapter over durable feature process state.
It does not change identity, retry, timer, cancellation or reconciliation semantics
that a later Temporal adapter must preserve. Runtime uncertainty is reconciled by
stable runtime command identity; it never authorizes a second provider handoff.

Client target generation, command descriptor, UUIDv4 request identity, finite
validity and declared receipt/reuse horizons remain distinct from server Operation
and runtime identity. After accepted or unknown outcomes the facade uses the same
recorded owner. Revoke, foreign scope, stale ETag, missing tool, expired command,
stale target and uncertain stop are rejecting or explicit unknown outcomes.

The server synthetic authority adapter binds exactly one sandbox principal and
Project. It is a test adapter, not a new authentication platform or qualified
product-authority provider. Existing context-owned persistence, security,
classification, eventing and server-composition standards remain unchanged.

This scoped admission does not resolve the unrelated remainder of OD-004, OD-006,
OD-010, OD-012, OD-026 or OD-027. It makes their bounded first-slice choices
reviewable together. The owner's explicit A-F implementation mandate and root technical review on
2026-10-21 authorize this scoped admission. The root review accepted the exact
contract, failure fixtures, identity, clock, planned-placement and Conversation
activation corrections. This records that mandate; successful fixtures alone do
not establish approval. Broader unresolved choices remain with their owners.

## Consequences

- The smallest useful implementation can begin with actual server application
  handlers and fake runtime after scoped admission; provider credentials are not
  a prerequisite to prove persistence, replay and Desktop compatibility.
- Real storage transactions, process restart, SDK/Connect/MCP/facade parity and
  Desktop CDP remain implementation conformance. Admission fixtures do not claim
  those results, provider execution or deployment qualification.
- Desktop live reads and mutations move together for the new Team; unsupported
  capabilities return typed errors. Legacy Teams retain their original owner.
- Group/cross-team dialogue, status/assignment/dependency transitions, completion,
  approvals, review, OpenCode/Codex parity, archives and all other A-F capabilities
  remain required backlog. This increment does not retire the fork.
- Fully Local, local-device connectivity, scheduler-platform replacement,
  commercial capability and global retention defaults remain outside this scope.

## Rejected alternatives

- Embed a second core in Desktop or create a private per-Desktop Host sidecar:
  contradicts the accepted server-first deployment and single authority.
- Let SDK/native task or message tools write legacy files: preserves a second
  writer and permits a timeout to duplicate product effects.
- Admit the full roadmap or accept every context dossier to unblock a sandbox:
  invents decisions unrelated to the owner's bounded migration.
- Require live provider execution or complete production adapters before schema
  admission: creates a circular gate and prevents meaningful synthetic evidence.

## Evidence

The [contract evidence matrix](../contracts/desktop-runtime-migration-admission-v1.md#conformance-fixtures)
links the typed model/property fixtures and exact Protobuf sources. Run
`pnpm specs:model`, `pnpm docs:protocol:check` and `pnpm architecture:check` under
the pinned repository runtime. `buf build` checks the proposed wire source bundle.
Admission checks passed under Node 26.11.1 and pnpm 11.18.0:
`pnpm docs:protocol:check`, `pnpm architecture:check`, `pnpm typecheck`, and
`pnpm specs:model` (32 tests, including 22 scoped fixtures and 100 seeded property
traces). Foundation's 16 mandatory quality identities passed in `check:fast`;
its single spelling failure was corrected and the full documentation chain
rerun successfully. Buf 1.69.0 built all six golden Protobuf sources. These
results admit implementation; no deployment qualification or provider outcome
is asserted.
