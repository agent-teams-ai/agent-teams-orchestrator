# ADR-0011: Context-Isolated SQLite and PostgreSQL Topology

Status: **Accepted**

## Context

The orchestrator must run with zero manual database setup on desktop and scale on
hosted infrastructure. Persistence must preserve bounded-context ownership without
forcing one database technology into domain/application code.

## Decision

Use one SQLite database file per bounded context for desktop/local deployments.

Use one PostgreSQL database with one schema per bounded context for the initial
hosted deployment. All SQL is schema-qualified. Cross-context foreign keys, joins,
writes, and transactions are prohibited in both profiles.

Each context owns separate SQLite and PostgreSQL persistence adapters, schema
definitions, and dialect migrations behind the same domain-specific repository,
query, and transaction semantics.

The application composition root selects the persistence profile once at startup.

## Consequences

- Desktop requires no separately installed database server.
- Physical SQLite files reinforce context ownership.
- Hosted PostgreSQL supports pooling and horizontal workers.
- Multi-context desktop backup requires a mutation barrier and versioned manifest.
- SQL schema and migration duplication is accepted where dialect semantics differ.
- Adapter conformance suites prevent semantic drift.
- Extracting a context does not require changing domain/application contracts.

## Rejected alternatives

- One shared SQLite file for every bounded context.
- PostgreSQL as an auto-managed desktop sidecar.
- A local-first sync database as authoritative orchestration storage.
- One universal ORM schema pretending SQLite and PostgreSQL are identical.
