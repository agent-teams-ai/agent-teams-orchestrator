---
id: ADR-0014
type: adr
status: accepted
owner: platform/persistence
summary: Keep migrations feature-owned while assembling one deterministic bundle per bounded context.
related:
  - OD-003
---

# ADR-0014: Feature-Owned Migrations with Context-Level Assembly

## Context

Feature-owned vertical slices require persistence artifacts to stay with the
feature that owns their behavior. Allowing every feature to run migrations
independently would nevertheless create competing locks, non-deterministic order,
and partial context startup.

## Decision

Each feature owns its tables, indexes, schema fragments, semantic migration IDs,
and dialect-specific migration implementations inside its outbound persistence
adapter.

Each bounded context assembles those contributions into one deterministic,
validated migration manifest and exposes one migration entry point. The context
assembly defines ordering, validates dependencies and compatibility, and uses one
runner and migration lock. It does not redefine feature schemas or migration SQL.

The application composition root invokes context migration entry points. Features
never run migrations independently.

Released migration history is immutable. A semantic migration ID maps to the
applicable dialect implementations without requiring identical SQL.

The context migration authority acquires its deployment lock before metadata
bootstrap. Migration SQL, checksum history, and the applied version watermark
commit atomically. Restore validation checks the assembled manifest and watermark;
feature migration runners never validate or activate restores independently.

## Consequences

- Feature behavior and persistence remain colocated.
- Context startup has one ordered migration authority.
- SQLite and PostgreSQL can use different implementations of the same semantic
  migration.
- A feature can be moved only with an explicit data and migration-history plan.
- Context composition gains a small assembly responsibility but no schema
  ownership.

## Rejected alternatives

- A global infrastructure folder owning all feature schemas and migrations.
- Independent feature migration runners and locks.
- Letting the process composition root discover and reorder individual migration
  files.
- Regenerating or editing released migration history.
