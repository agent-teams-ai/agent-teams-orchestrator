---
id: architecture.migration-boundary
type: architecture
status: accepted
owner: migration/desktop
summary: Normative compatibility, ownership, cutover, rollback, and legacy-code rules for desktop migration.
related:
  - ADR-0029
  - OD-010
  - OD-015
---

# Migration Boundary

## Compatibility boundary

Desktop integration moves through a compatibility facade around the existing IPC
and shared DTO surface. Frontend DTOs remain client compatibility contracts; they
do not become orchestrator domain, application, Runtime Published Language, or
public SDK models.

Every mapped capability declares:

- current IPC methods, DTO variants, progress events, errors, and cancellation;
- legacy owner and target bounded context or integration owner;
- synchronous and asynchronous observable behavior;
- idempotency, ordering, retry, timeout, and recovery semantics;
- target SDK/API mapping;
- cutover and rollback control;
- deletion criteria for the legacy path.

The compatibility facade owns migration-only reliability state that the legacy
DTO never modeled. Before its first durable SDK command, it allocates and
persists a stable `commandId` and enough routing state to recover the operation
after a client or Host crash. A timeout never causes the facade to allocate a new
identity and try the other owner.

Legacy progress callbacks are convenience notifications, not a durable feed. The
facade checkpoints the SDK cursor separately, deduplicates by SDK event identity,
and reconciles through operation lookup after reconnect before emitting the
cursor-less `TeamProvisioningProgress` DTO. The renderer does not become
responsible for SDK cursor semantics merely to preserve the old callback shape.

Provider CLI switches, raw arguments, process IDs, pane details, and similar
legacy fields remain migration-private mappings or Desktop projections until an
owning context accepts their product semantics. Preserving a legacy field does
not make it a public SDK field.

## Single-owner cutover

One capability has one authoritative writer and one process owner at any moment.
Routing selects either the legacy implementation or the new implementation before
a mutation begins. It cannot retry the same mutation through the other owner after
an ambiguous outcome.

Shadow reads may compare projections. Shadow commands may validate serialization
only when they cannot produce a side effect. Runtime start, input, approval,
cancel, resume, task mutation, and message delivery are never dual-written.

## Legacy code disposition

Every legacy module is classified before reuse:

```text
behavioral oracle
contract fixture source
re-derived algorithm
temporary compatibility adapter
obsolete
```

Classification never authorizes copying legacy domain/application structure into
the new core. New behavior follows accepted Ubiquitous Language, invariants,
ownership, ports, and transaction boundaries.

## Verification and rollback

A capability can switch only after:

- legacy compatibility fixtures pass;
- new domain and application tests pass;
- adapter conformance passes;
- crash, duplicate, stale, cancellation, and restart behavior is verified;
- runtime capabilities use isolated sandbox projects;
- the rollback route is known and does not create dual ownership.

Rollback changes routing for new commands. It does not blindly replay operations
whose outcome is unknown. Existing durable operations continue under their
recorded owner or enter explicit reconciliation.

## Task board

The current desktop board remains a compatibility integration during the first
orchestration migration. Work Coordination owns canonical task semantics. OD-015
still decides field authority, identifier mapping, offline conflicts,
reconciliation, staged cutover, and deletion of legacy board ownership.
