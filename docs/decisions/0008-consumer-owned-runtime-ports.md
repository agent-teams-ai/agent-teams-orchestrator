---
id: ADR-0008
type: adr
status: superseded
supersedes: []
owner: integration/runtime
summary: Give runtime consumers narrow ports and keep the Runtime ACL stateless.
superseded_by:
  - ADR-0079
related:
  - ADR-0003
  - ADR-0028
  - OD-004
---

# ADR-0008: Consumer-Owned Runtime Ports and Stateless ACL

Clarifies ADR-0003.

## Context

Making Runtime Gateway the owner of capability ports, runtime bindings, or
normalized durable state would reverse Dependency Inversion and create a second
owner beside Run Orchestration.

## Decision

Run Orchestration application capabilities own the narrow runtime ports they
consume. A stateless Runtime ACL adapter implements those ports against `ar`.

Run Orchestration owns durable runtime bindings, desired state, observation
projections, inboxes, and cursors. `ar` owns runtime runs, sessions, processes,
leases, fencing, and provider cursors. The Runtime ACL owns translation and
non-authoritative technical connection state only.

## Consequences

- Domain and application code do not depend on an integration package.
- Multiple runtime ports may be implemented by one adapter without becoming one
  broad consumer interface.
- Runtime ingestion and command idempotency belong to explicit contracts.
- Runtime adapter replacement cannot move business state out of Run Orchestration.

## Rejected alternatives

- A single orchestrator-wide `AgentRuntimePort`.
- Runtime Gateway as a durable integration bounded context.
- Provider-specific runtime ports in orchestration application code.
