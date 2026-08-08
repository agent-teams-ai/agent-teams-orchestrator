---
id: ADR-0048
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/persistence
summary: Select exactly one authoritative persistence profile per bounded context and transfer data through logical contracts.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0011
  - ADR-0025
  - architecture.persistence
  - OD-003
---

# ADR-0048: Single Persistence Authority and Logical Transfer

## Context

The product runs locally with SQLite and in hosted deployments with PostgreSQL.
A Desktop client may also connect to a hosted orchestrator. Treating local and
hosted tables as bidirectionally synchronized replicas would create dual-write,
conflict-resolution, schema-coupling, and partial-transfer failure modes that do
not belong in ordinary persistence adapters.

Physical disaster recovery and business-level context transfer also have
different consistency and compatibility semantics.

## Decision

Every bounded context has exactly one authoritative persistence store in one
running deployment profile:

- local authority uses the context's SQLite file;
- hosted authority uses the context's PostgreSQL schema;
- a Desktop connected to a hosted orchestrator uses hosted authority; any local
  copy is an explicitly disposable cache or client-owned state, never a second
  business write model.

Application and domain code do not inspect the selected profile. Composition
selects adapters implementing the same context-owned ports and semantic
conformance suite.

Local-to-hosted or hosted-to-local movement is an explicit logical export/import
operation. It uses versioned context transfer records, stable identities,
checksums, compatibility metadata, idempotent receipts, validation, and
reconciliation. It does not copy ORM rows, attach databases, or infer ownership
from physical table names.

Continuous offline collaboration, if required later, is a separately modeled
synchronization capability with conflict semantics. It is not added implicitly to
repositories or the Unit of Work.

Recovery surfaces are distinct:

```text
local disaster recovery
  -> verified context SQLite artifacts plus product backup manifest

hosted disaster recovery
  -> PostgreSQL cluster base backup plus continuous WAL and PITR

bounded-context transfer or selective repair
  -> logical export/import plus validation and reconciliation
```

A PostgreSQL schema dump is a logical transfer artifact, not schema-scoped PITR.
Broker state is either included in a coordinated product recovery plan or rebuilt
from retained authoritative feeds and outboxes under a separately proven
reconciliation procedure.

## Consequences

- SQLite and PostgreSQL remain replaceable physical adapters without dual-master
  ambiguity.
- Connected Desktop operation cannot silently fork hosted business state.
- Physical backup, logical transfer, and disposable caching have separate
  contracts and failure handling.
- Offline-first synchronization remains possible but requires its own domain and
  product decision.

## Rejected alternatives

- Generic bidirectional SQLite-to-PostgreSQL table synchronization.
- Dual writes from one application command to local and hosted databases.
- Treat a local cache as an aggregate repository fallback.
- Describe a schema dump as point-in-time disaster recovery.
