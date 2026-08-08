---
id: ADR-0052
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/persistence
summary: Use adapter-local Drizzle by default while keeping only irreducible SQLite and PostgreSQL behavior separate.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0011
  - ADR-0025
  - ADR-0047
  - ADR-0050
  - architecture.persistence
  - research.cross-dialect-persistence-tooling-2026-07-26
  - OD-003
---

# ADR-0052: Adapter-Local Drizzle and Bounded Dialect Duplication

## Context

The local profile uses Node built-in SQLite while the hosted profile uses
PostgreSQL. Their physical schemas, transaction execution, concurrency, locking,
backup, and recovery semantics differ. Pretending those differences do not exist
would move dialect branching into generic repositories or application code.

Implementing every query, binding, row type, and codec directly against both
drivers would create avoidable adapter maintenance. The tooling review found
Drizzle to be the only current candidate with first-party support for both
selected drivers and the required raw SQL escape hatches.

## Decision

Drizzle is the default query, schema, and adapter-local persistence toolkit for
both SQLite and PostgreSQL implementations.

The initial pre-GA dependency baseline is exactly pinned:

```text
drizzle-orm@1.0.0-rc.4
drizzle-kit@1.0.0-rc.4
```

No caret, tilde, or floating release-candidate range is allowed. If a compatible
GA release exists when the first production persistence package materializes, the
dependency-readiness review evaluates and pins that GA version instead. An
upgrade never regenerates released migrations.

Direct `node:sqlite` and `node-postgres` repository implementations are a
contingency, not a second implementation maintained in parallel. They are used
only when Drizzle fails the import, exact-value, migration, crash, or semantic
conformance gate and the failure cannot be isolated safely.

### Shared semantic surface

The following remain one authoritative implementation:

- domain aggregates, entities, value objects, and invariants;
- application use cases and capability-owned repository ports;
- capability-scoped Unit of Work semantics;
- canonical aggregate rehydration state and feature-owned pure mapping;
- stable persistence outcomes and application error taxonomy;
- command receipt, revision, fencing, inbox, and outbox semantics;
- repository and query conformance fixtures;
- expected domain outcomes across local and hosted profiles.

Shared code stays inside the owning feature unless it is a proven
domain-independent platform primitive. It uses composition and pure functions,
not repository inheritance or a service locator.

### Irreducible dialect surface

The following remain separate:

- `sqlite-core` and `pg-core` table and index declarations;
- immutable dialect-specific SQL migrations;
- connection, transaction, and commit-ambiguity handling;
- SQLite WAL, busy, checkpoint, backup, and single-writer behavior;
- PostgreSQL isolation, row locks, advisory locks, RLS, replicas, and failover;
- dialect-specific codecs, query plans, errors, and recovery;
- SQL whose semantics or correctness proof differs by engine.

Repository implementations may look structurally similar, but no abstraction is
created merely to remove matching lines. A shared extraction requires identical
meaning, failure behavior, transaction assumptions, and tests in both profiles.
Otherwise the duplication is an explicit compatibility boundary.

### Layout

```text
features/<feature>/
  application/
    ports/outbound/
      <aggregate>-repository.ts
  adapters/outbound/persistence/
    <aggregate>-state-mapper.ts
    sqlite/
      schema.ts
      <aggregate>-repository.ts
      migrations/
    postgres/
      schema.ts
      <aggregate>-repository.ts
      migrations/
  tests/
    persistence-conformance/
```

This is a logical example, not permission to create empty directories.

### Duplication review

The estimated duplicated physical persistence surface is not a contractual
percentage. After the first two real repository pairs, architecture review records
measured duplicate blocks and classifies each as:

1. domain or application duplication that must be removed;
2. dialect-neutral adapter behavior that should be extracted locally;
3. irreducible dialect behavior that remains separate with paired conformance.

Repeated code is extracted only after the third proven use or earlier when it
already represents one named technical invariant. Clone reduction cannot weaken
transaction, locking, exact-value, or recovery semantics.

Drizzle imports and types remain inside persistence adapters and tooling.
Domain, application, Published Language, SDK, and public contracts cannot depend
on Drizzle.

## Consequences

- Most feature behavior, mapping, and verification remains shared.
- Physical database differences stay visible and testable.
- Drizzle reduces manual query, binding, schema, and row-typing work.
- The release-candidate risk is contained by exact pinning and conformance.
- Replacing Drizzle affects persistence adapters without changing domain or
  application contracts.
- Some schema, migration, query, and operational duplication remains intentional.

## Rejected alternatives

- Maintain Drizzle and direct-driver repositories simultaneously.
- Put `if (dialect)` branches in domain, application, or one universal repository.
- Create `Repository<T>`, a base repository hierarchy, or an orchestrator-owned
  SQL dialect framework.
- Share one physical schema or migration file when engine semantics differ.
- Switch to Prisma, Kysely community Node SQLite, or Effect SQL only to make both
  adapters appear identical.
