---
id: ADR-0047
type: adr
status: accepted
superseded_by: []
owner: platform/persistence
summary: Assemble feature-owned migrations into context plans with transactional and online-resumable steps.
approved_by: product-owner
accepted_at: 2026-07-26
supersedes:
  - ADR-0014
related:
  - ADR-0011
  - ADR-0025
  - architecture.persistence
  - OD-003
---

# ADR-0047: Resumable Context Migration Plans

## Context

Feature-owned persistence artifacts must remain beside their behavior, while each
bounded context needs one deterministic migration authority and deployment lock.
ADR-0014 required every migration SQL operation, checksum record, and version
watermark to commit atomically. That guarantee is valid for transactional steps
but cannot cover operations such as PostgreSQL `CREATE INDEX CONCURRENTLY`,
external backfills, or long-running verification that cannot execute inside the
same database transaction.

Treating every change as one transaction would either make large hosted tables
unavailable or encourage operators to bypass migration ownership manually.

## Decision

Each feature owns its schema fragments, semantic migration IDs, compatibility
metadata, and dialect-specific migration implementations inside its outbound
persistence adapter.

The bounded context assembles those contributions into one immutable,
deterministic migration plan and exposes one migration entry point. The context
migration authority acquires its deployment lock before metadata bootstrap.
Features never run migrations or acquire deployment locks independently.

A migration plan contains explicit step kinds:

```text
transactional
  -> execute SQL
  -> verify immediate postconditions
  -> record checksum and completed watermark in one transaction

online-resumable
  -> persist immutable intent and execution generation
  -> execute one idempotent non-transactional operation
  -> reconcile ambiguous outcome
  -> verify postconditions
  -> record completed watermark
```

Online-resumable steps use durable states such as `planned`, `running`,
`verifying`, `completed`, and `failed`. Their operation identity, generation,
preconditions, postconditions, retry classification, and recovery instructions
are immutable after release. Process loss never causes blind re-execution.

Only a completed step advances the context compatibility watermark. A binary
refuses normal application traffic when a required step is incomplete, failed,
newer than supported, or cannot be reconciled safely. Expand, migrate, verify,
and contract phases are separate semantic migrations where compatibility requires
coexistence.

Drizzle Kit may generate candidate SQL. Released SQL and migration plans are the
reviewed source of execution truth and are never regenerated or edited in place.

## Consequences

- Feature ownership and one context-level migration authority remain intact.
- Large hosted indexes and backfills can run without pretending to be atomic.
- Migration recovery becomes an explicit state machine with operational tests.
- The runner is more capable than a simple ordered SQL loop, but remains technical
  platform code and contains no bounded-context business rules.

## Rejected alternatives

- Force every hosted schema change into one transaction.
- Let operators run non-transactional SQL outside the migration ledger.
- Give each feature an independent runner or migration lock.
- Mark an online operation complete before verifying its postconditions.
