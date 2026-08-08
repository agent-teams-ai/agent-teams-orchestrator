---
id: ADR-0025
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/persistence
summary: Use capability-scoped units of work and per-context local command lanes over replaceable persistence adapters.
related:
  - ADR-0011
  - ADR-0047
  - ADR-0050
  - OD-003
  - architecture.persistence
---

# ADR-0025: Context-Scoped Unit of Work and Local Command Lanes

## Context

The local profile uses embedded SQLite while the hosted profile uses PostgreSQL.
Both must expose the same application semantics without leaking a driver, ORM,
transaction handle, or deployment mode into domain and application behavior.

`node:sqlite` uses a synchronous connection API. Moving only repositories behind a
Worker Thread would turn one application transaction into a sequence of RPC calls
and make rollback, cancellation, and transaction ownership harder to reason about.
A global Unit of Work would instead erase feature and bounded-context ownership.

## Decision

The runtime baseline is Node.js 24 LTS, with `>=24.18.0 <25` enforced by repository
tooling. The first local persistence adapter uses `node:sqlite`. The first hosted
adapter uses PostgreSQL through `node-postgres`.

Drizzle is adapter-local query and schema tooling. Drizzle types, generated models,
and migration APIs never cross an outbound persistence adapter. The selected
versions are pinned exactly in the lockfile and verified by import, migration, and
conformance tests. Because the `node:sqlite` Drizzle adapter is pre-GA at the time
of this decision, production readiness requires an explicit dependency review;
changing or removing Drizzle must not affect application ports.

Every mutating domain capability owns a capability-scoped Unit of Work port. It
exposes only the repositories, command receipts, outbox records, dispatch records,
and projections required by that capability. It does not expose a generic SQL
transaction or a repository registry.

The bounded context assembles those Unit of Work implementations over one
context-local transaction coordinator. It may share connection and transaction
primitives between its features, but there is no global Unit of Work and no
transaction spanning bounded contexts.

The local SQLite profile serializes mutating use cases through one command lane per
bounded context:

```text
async application input
  -> bounded-context command lane
  -> application use case
  -> capability-scoped Unit of Work
  -> DatabaseSync transaction
  -> commit
  -> post-commit dispatch
```

Network, provider, NATS, Temporal, filesystem, and webhook side effects are
forbidden inside the transaction. The transaction records complete outbox or
durable command-dispatch intent; a dispatcher performs the effect after commit.

The hosted PostgreSQL adapter may execute independent commands concurrently, but
it must preserve the same revision, idempotency, transaction, and command-outcome
semantics.

A separate database worker is not the default. If measurement shows unacceptable
event-loop latency, the extraction unit is the complete bounded-context command
lane, including its use case and Unit of Work. Individual repositories are not
converted into transaction-token RPC services.

Both in-process and Worker implementations use bounded admission and a
time-budgeted fair scheduler. Moving the lane does not solve overload and cannot
starve feed or outbox capabilities behind command batching.

## Consequences

- Feature persistence remains colocated with the feature that owns the behavior.
- SQLite and PostgreSQL share application semantics without sharing ORM entities.
- One local writer removes avoidable SQLite write races while optimistic revisions
  still protect semantic concurrency.
- The application boundary remains asynchronous even when local execution uses a
  synchronous database API.
- A future Worker Thread or service extraction preserves one transaction owner.
- Drizzle pre-GA risk is contained inside replaceable adapters and conformance
  tests.

## Rejected alternatives

- One global Unit of Work shared by all bounded contexts.
- Passing raw database transactions through application services.
- Running every repository call through a separate persistence worker RPC.
- Calling external dependencies before the local transaction commits.
- Branching application behavior on SQLite versus PostgreSQL.
