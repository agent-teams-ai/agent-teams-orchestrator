---
id: research.cross-dialect-persistence-tooling-2026-07-26
type: research
status: active
owner: platform/persistence
summary: Current evidence for reducing SQLite and PostgreSQL adapter duplication without hiding dialect semantics.
related:
  - ADR-0011
  - ADR-0025
  - ADR-0052
  - architecture.persistence
  - OD-003
---

# Cross-Dialect Persistence Tooling Review, 2026-07-26

## Question

Can a stable TypeScript library substantially unify the selected local
`node:sqlite` and hosted `node-postgres` implementations while preserving
capability-owned transactions, locking, exact values, migrations, and error
semantics?

## Required boundary

A library may reduce query construction, codecs, and connection boilerplate. It
must not become the repository contract or make use cases branch by dialect.
SQLite single-writer scheduling and PostgreSQL concurrent transactions remain
different infrastructure strategies behind one application semantic contract.

## Findings

### Drizzle

Current registry state:

- stable `drizzle-orm@0.45.2` and `drizzle-kit@0.31.10`;
- `drizzle-orm@1.0.0-rc.4` and `drizzle-kit@1.0.0-rc.4`;
- the stable ORM does not export `drizzle-orm/node-sqlite`;
- official `node:sqlite` documentation currently instructs installation of the
  release candidate;
- both `node:sqlite` and `node-postgres` are official adapters.

Drizzle has a similar typed SQL API across dialects and exposes raw SQL where a
capability needs PostgreSQL locking or SQLite pragmas. It intentionally has no
common table object: SQLite and PostgreSQL schemas use their own dialect modules.
It therefore reduces low-level boilerplate but does not safely produce one
repository implementation or one migration history.

This remains the strongest provisional candidate because both selected drivers
are first-party and Drizzle stays adapter-local. The RC must remain exactly pinned
and pass the existing SQLite/PostgreSQL conformance suite. Availability of a
compatible GA release must be rechecked before production installation.

### Kysely

`kysely@0.29.4` is stable, lightweight, dependency-free, and provides a strong
cross-dialect typed query API with raw SQL escape hatches. Its official SQLite
dialect uses `better-sqlite3`. Node built-in SQLite is listed as a community
dialect.

The current `kysely-node-sqlite@1.1.0` release is single-maintainer, was last
published in July 2025, and depends on `kysely@^0.28.3` rather than tracking the
current core minor. Adopting it would move a critical local driver boundary from
a first-party RC to a lagging community package or require owning a custom
dialect. Kysely is a credible fallback only if the project changes its SQLite
driver decision or accepts ownership of that dialect and its conformance.

### Prisma ORM

`prisma@7.9.0` is stable and maintains PostgreSQL and SQLite support. Its
maintained local SQLite JavaScript adapter uses `better-sqlite3`, not
`node:sqlite`. Prisma also introduces generated-client and schema-provider
workflow, and its default time mappings do not match the project's explicit
microsecond instant profile without adapter work.

Prisma can reduce CRUD code, but aggregate repositories already require explicit
state mapping, revisions, command receipts, outbox writes, fencing, and
capability-specific locking. Its generated model would add a second dominant
model without removing those responsibilities.

### Effect SQL

Released `@effect/sql-sqlite-node@0.53.0` currently depends on
`better-sqlite3`. The main Effect repository has migrated the package toward
Node's built-in `node:sqlite`, but that source state is not the current stable npm
artifact. Effect SQL offers a genuinely common effectful SQL and transaction API,
yet adopting it would introduce Effect runtime types and lifecycle throughout
persistence composition.

Reconsider it only after a stable `node:sqlite` release and an isolated adapter
spike. Effect types must still remain outside application and domain.

### Knex and entity ORMs

Knex is mature but does not provide first-party `node:sqlite` support or the
TypeScript precision of Drizzle and Kysely. Entity-oriented ORMs such as MikroORM
would encourage a persistence identity map and ORM entity model that the
aggregate-centered architecture does not need. Neither removes dialect-specific
concurrency and migration behavior.

## What can be unified safely

- aggregate repository and query-port semantics;
- canonical aggregate state and feature-owned mapper behavior;
- Unit of Work result and stable persistence error taxonomy;
- command receipt, outbox, revision, and fencing capability contracts;
- conformance fixtures and expected domain outcomes;
- platform connection, migration-runner, telemetry, and fault-injection
  primitives where the engine semantics are parameterized explicitly.

## What remains dialect-specific

- physical table and index declarations;
- immutable SQL migrations and online migration operations;
- connection and transaction lifecycle;
- SQLite WAL, busy, checkpoint, backup, and single-writer scheduling;
- PostgreSQL isolation, row locking, advisory locking, RLS, replicas, and
  unknown-commit reconciliation;
- driver codecs, SQLSTATE or SQLite error classification, and recovery;
- performance tuning and query plans.

## Recommendation

ADR-0052 makes the resulting architecture normative: separate SQLite and
PostgreSQL adapters behind one capability-owned port and one semantic conformance
suite.

Use pinned Drizzle 1.0 RC only as a provisional adapter-local toolkit if the
production dependency gate occurs before a compatible GA release. Do not create a
universal repository implementation or a project-owned SQL dialect abstraction.
If Drizzle readiness fails, implement the same narrow ports directly with
`node:sqlite` and `node-postgres`; that increases adapter code but preserves every
domain and application boundary.

## Sources

- [Drizzle Node SQLite](https://orm.drizzle.team/docs/sqlite/connect-node-sqlite)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Kysely dialects](https://www.kysely.dev/docs/dialects)
- [Kysely repository](https://github.com/kysely-org/kysely)
- [kysely-node-sqlite repository](https://github.com/spooky-finn/kysely-node-sqlite)
- [Prisma database drivers](https://www.prisma.io/docs/orm/core-concepts/supported-databases/database-drivers)
- [Prisma SQLite](https://www.prisma.io/docs/orm/core-concepts/supported-databases/sqlite)
- [Effect SQL repository](https://github.com/Effect-TS/effect/tree/main/packages/sql)
