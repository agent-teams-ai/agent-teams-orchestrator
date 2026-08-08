---
id: ADR-0069
type: adr
status: accepted
superseded_by: []
owner: integration/runtime
summary: Keep AR execution identity, custody, and process continuity opaque behind the Runtime Published Language.
approved_by: product-owner
accepted_at: 2026-07-30
related:
  - ADR-0003
  - ADR-0008
  - ADR-0028
  - architecture.runtime-boundary
  - OD-004
supersedes:
  - ADR-0026
---

# ADR-0069: Opaque Runtime Execution Identity

## Context

ADR-0026 correctly rejected an orchestrator copy of the AR domain, but it still
named `ExecutionAttempt`, `attemptId`, and successor-attempt behavior as if those
were stable parts of the Runtime Published Language. AR owns that internal
consistency model and may refine its terminology and relationships independently.

The orchestrator needs durable correlation and reconciliation without acquiring a
second source of truth for provider processes, custody, generations, operations,
output feeds, capacity, or credentials.

## Decision

The orchestrator consumes only the versioned Runtime Published Language owned by
AR. Runtime session, command, feed, and observation references are opaque and
non-authoritative unless the Published Language explicitly states otherwise.

AR exclusively owns:

- execution identity, custody, epochs, private fences, and continuity rules;
- provider runtime instances, processes, session bindings, and recovery;
- runtime operations, dispatch records, output-feed segmentation, and stale
  observation rejection;
- capacity allocation, provider accounts, credentials, permissions, sandboxing,
  and technical enforcement.

The orchestrator stores product-owned desired state, runtime bindings,
correlation, source cursors, and normalized published observations. It does not
import or recreate AR aggregate names, infer process continuity, or decide whether
reattach, restart, takeover, or recovery creates an internal successor.

AR may publish an observable `executionEpoch` for diagnosis and stale-observation
correlation. It is not an authority token. Private execution fences never cross
the Runtime Published Language, Runtime ACL, product SDK, event bus, or logs.

Runtime mutation remains a durable command workflow. Command acceptance, provider
side effect, runtime continuation, and final observation are distinct outcomes.
Ambiguous outcomes are reconciled through published command identity and
observations rather than blind retries.

Control and output feeds remain separate resumable sources. A convenience merged
view cannot claim one durable cursor or global ordering unless a future Published
Language explicitly defines them.

## Consequences

- AR can evolve execution aggregates without orchestrator domain migrations.
- The Runtime ACL maps published semantics instead of mirroring AR internals.
- Orchestrator recovery depends on versioned outcomes, not provider-process
  assumptions.
- Cross-repository contract fixtures become mandatory for every published runtime
  identity or lifecycle change.

## Rejected alternatives

- Standardize AR internal execution aggregate names in orchestrator contracts.
- Infer runtime continuity from process IDs, epochs, output feeds, or transport
  connection lifetime.
- Expose private fences, provider accounts, or credential custody through the
  product SDK.
- Treat runtime command acceptance as proof that a provider side effect completed.
