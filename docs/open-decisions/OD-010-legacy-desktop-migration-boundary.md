---
id: OD-010
type: open-decision
status: open
owner: migration/desktop
summary: Inventory desktop contracts and define capability cutover, rollback, and sequencing.
related:
  - ADR-0029
  - architecture.runtime-boundary
  - architecture.migration-boundary
  - research.legacy-electron-opencode-behavior-audit-2026-07-30
  - research.pre-implementation-gate-critique-2026-07-30
  - OD-015
---

# OD-010: Legacy Desktop Migration Boundary

## Accepted constraints

ADR-0029 fixes a compatibility facade and strangler rollout. Existing desktop IPC
and shared DTO behavior remain stable while one capability at a time moves behind
the new orchestrator. The legacy system and new orchestrator never write or
supervise the same runtime capability concurrently.

## Decision required

Inventory and map the exact IPC and DTO surface, including team creation,
provisioning progress, runtime snapshots, tasks, messages, and logs. Define
capability cutover, rollback, contract tests, and sequencing around the active
hosted-web refactor.

## Constraints

Migration must avoid overlapping active hosted-web refactoring where possible.
There must be no dual runtime writer or dual process owner.

## Current evidence

An isolated compile and runtime facade spike was pinned to Desktop commit
`082bf7e8fd426578905efaab97645bd6ef98b31c`. It imported the exact hosted-branch
`TeamsAPI`, `TeamCreateRequest`, `TeamProvisioningProgress`, and
`TeamAgentRuntimeSnapshot` types without changing production Desktop code.

The representative facade passed type checking and 10 runtime assertions for:

- launch acceptance and recoverable operation identity mapping;
- status query plus live progress callback parity;
- unsubscribe, missed-event recovery through query, and reconnect;
- runtime snapshot projection;
- explicit cancellation and client cleanup.

The same pinned inventory found:

- 86 methods on the broad legacy `TeamsAPI`;
- 79 methods referenced by renderer or cross-process feature code;
- 33 methods already accessed through feature-owned renderer adapters;
- 47 methods with 104 remaining direct calls outside feature adapters.

Provisioning create/launch/status/cancel, runtime observation, task-board
mutations, team view reads, and message-page reads already have useful narrow
feature ports. Message writes, process control, provider preflight, generic
`onTeamChange`, and most log surfaces remain directly coupled. The in-progress
hosted HTTP client is not a replacement yet: 45 team methods explicitly reject
browser use and at least 20 return degraded placeholders in the pinned snapshot.

The spike also confirmed three migration requirements:

1. `TeamCreateRequest` has no durable request identity. The facade must persist
   its SDK `requestId` before first send rather than adding retry guesses to the
   renderer DTO.
2. `TeamProvisioningProgress` has no cursor or sequence. The facade owns SDK
   checkpointing and query-based reconciliation.
3. `extraCliArgs`, permission switches, worktree switches, process details, and
   similar legacy fields need explicit migration-only mappings; they cannot
   silently enter the public SDK.

This evidence supports starting with the already isolated provisioning and
runtime-observation ports. Exact cutover order, message ownership, log
projections, generic change-event replacement, and task-board authority remain
open.

A later read-only audit refreshed the hosted branch to
`f7fb783a60e984b648a01e2bba9d01f3d52746da` and inspected the legacy OpenCode
orchestrator. It confirmed:

- the frontend remains coupled mainly to IPC and shared DTO behavior;
- `TeamsAPI` is a migration facade, not a target SDK interface;
- runtime snapshot assembly is an heuristic compatibility projection whose
  anti-flicker policy stays in the renderer;
- OpenCode process ownership, readiness, execution proof, credentials, provider
  delivery ledger, and recovery belong behind AR;
- product messages cross Agent Communication and an AR runtime-input ACL rather
  than one provider-specific delivery service;
- hosted HTTP, Electron IPC, Connect, and direct SDK paths need one capability
  conformance suite;
- fixed board columns remain a projection over Work Coordination rather than its
  canonical lifecycle.

The exact evidence and disposition matrix are in the
[legacy behavior audit](../research/legacy-electron-opencode-behavior-audit-2026-07-30.md).

## Current leading cutover

Migration proceeds by capability cohort. Provisioning create, progress, status,
cancel, and diagnostics move as one reliability group rather than unrelated
methods.

Each scope uses a durable route generation:

```text
LEGACY
  -> FREEZING
  -> reconcile legacy in-flight commands
  -> establish snapshot and watermark
  -> compare-and-swap route generation
  -> NEW
```

The selected owner and command identity are persisted before execution. An
unknown outcome is reconciled by that owner and is never repeated through the
other implementation. Active legacy commands finish under the legacy owner.
Rollback changes routing only for commands not yet accepted. Shadow comparison
is allowed for reads, never mutations.

Gate evidence requires a versioned compatibility fixture bundle that runs in
both repositories. Hosted capability support is explicit; transport stubs and
placeholder responses do not count as parity.

## Resolution

Open.
