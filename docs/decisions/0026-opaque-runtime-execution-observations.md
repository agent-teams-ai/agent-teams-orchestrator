---
id: ADR-0026
type: adr
status: superseded
owner: integration/runtime
summary: Consume AR execution identity and lifecycle as opaque observations without mirroring its internal domain.
related:
  - ADR-0003
  - ADR-0008
  - ADR-0028
  - OD-004
  - architecture.runtime-boundary
superseded_by:
  - ADR-0069
---

# ADR-0026: Opaque Runtime Execution Observations

## Context

The agent runtime distinguishes sessions, execution attempts, custody epochs,
capacity allocation, provider accounts, credentials, and technical authority. The
orchestrator needs enough of those facts to coordinate product behavior, but
copying their internal relationships would create a second runtime domain and a
second source of truth.

Reattachment also makes a simple `new fence means new attempt` rule incorrect. A
new authority epoch may take custody of the same live provider process, while a
new process or provider invocation creates a successor attempt.

## Decision

The orchestrator depends only on the versioned Runtime Published Language owned by
AR. Runtime session references, attempt references, output-feed references, and
observable execution epochs are opaque at the orchestrator boundary.

AR-internal concepts such as `ExecutionSlot`, `ExecutionCustodyEpoch`,
`RuntimeAllocationRef`, `ProviderAccount`, and `CredentialCustody` do not become
orchestrator aggregates, entities, repositories, or public SDK models. The
orchestrator stores only the product-owned runtime binding, desired state,
normalized observations, source cursors, and opaque references required for
reconciliation.

The boundary preserves these published semantics:

- reattachment to the same live provider process may retain `attemptId` while
  advancing the observable `executionEpoch` and AR-internal fence;
- a new provider process or invocation creates a successor execution attempt;
- `executionEpoch` is diagnostic observation, not authority;
- the internal execution fence never crosses the Runtime Published Language or
  Runtime ACL;
- runtime account allocation, capacity leases, and credential custody remain AR
  responsibilities.

The orchestrator may express provider-neutral capability, policy, budget, and
placement constraints. It does not select raw credentials or mutate runtime
capacity ownership.

Runtime mutations are durable command workflows, not synchronous provider effects.
The orchestrator commits desired state and command-dispatch intent before calling
AR. AR command acceptance, provider side effect, runtime continuation, and final
observation are distinct outcomes. Ambiguous outcomes are reconciled by command
identity and runtime observations rather than blindly retried.

Control and output feeds remain separate resumable sources. An optional merged
view cannot be used as a durable source unless the Runtime Published Language
later defines an explicit resume vector and ordering semantics.

The orchestrator does not assume that allocation, account, custody, or
`ExecutionSlot` identities are published. If AR explicitly publishes a
provider-neutral correlation reference for an accepted use case, the Runtime ACL
preserves it as opaque and non-authoritative.

## Consequences

- AR can refine its aggregate model without forcing an orchestrator domain
  migration.
- Reattachment does not incorrectly fragment attempts or output feeds.
- Capacity and credential security have one technical owner.
- Runtime ACL mappings remain explicit and testable.
- Orchestrator recovery depends on published outcomes, not provider process
  assumptions.

## Rejected alternatives

- Mirror the AR execution aggregate hierarchy in Run Orchestration.
- Treat every fence or epoch change as a new attempt.
- Expose execution fences, provider accounts, or credentials through the product
  SDK.
- Treat AR command acceptance as proof that the provider side effect completed.
