---
id: ADR-0050
type: adr
status: accepted
owner: platform/persistence
summary: Require every mutating capability to declare and prove its hosted concurrency strategy.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0025
  - ADR-0045
  - architecture.persistence
  - OD-003
  - OD-024
---

# ADR-0050: Capability-Owned Hosted Concurrency

## Context

The local SQLite profile serializes mutations through one bounded-context command
lane. Hosted PostgreSQL executes independent commands concurrently. Local success
therefore cannot prove absence of write skew, lost updates, duplicate admission,
or over-reservation under hosted concurrency.

A single global isolation level would either be too weak for critical invariants
or unnecessarily expensive for unrelated capabilities.

## Decision

Every mutating capability documents one hosted concurrency profile beside its
aggregate and Unit of Work design. The profile names:

- protected invariant and conflicting command set;
- aggregate revision and expected-revision behavior;
- database constraint or conditional write used as defense in depth;
- lock scope and deterministic acquisition order where locking is required;
- transaction isolation level;
- retryable SQLSTATE outcomes and complete-Unit-of-Work retry limit;
- idempotency receipt and unknown-commit reconciliation behavior;
- starvation, deadlock, timeout, and overload outcomes;
- equivalent local and hosted conformance scenarios.

Allowed mechanisms include aggregate compare-and-swap revisions, unique or check
constraints, atomic conditional updates, `SELECT ... FOR UPDATE`, and
`SERIALIZABLE` transactions. The capability selects the smallest mechanism that
proves its invariant. Repository adapters do not choose policy implicitly.

A serialization or deadlock retry repeats the complete idempotent Unit of Work
with the same logical command ID after rollback. Failure after commit dispatch is
an unknown outcome and is reconciled through the durable command receipt; it is
never retried blindly.

Consumption Governance must prove concurrent reserve, capture, release, expiry,
and multi-scope limit scenarios. Multi-row locking uses deterministic scope and
identity order. A stale revision, reservation fence, or expired authority causes
no balance or provider side effect.

## Consequences

- SQLite's single-writer convenience cannot hide hosted race conditions.
- Concurrency behavior remains owned by the capability protecting the invariant.
- PostgreSQL-specific mechanisms stay inside adapters while the conflict semantics
  remain visible to application and domain design.
- Conformance requires real concurrent PostgreSQL tests, not only SQLite or an
  in-memory emulator.

## Rejected alternatives

- One repository-wide isolation level as the complete concurrency policy.
- Assume optimistic revisions alone protect every multi-row invariant.
- Retry an individual repository call inside an active Unit of Work.
- Treat local command-lane tests as proof of hosted correctness.
