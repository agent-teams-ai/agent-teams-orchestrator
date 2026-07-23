# Testing Strategy

Status: **Accepted baseline**

## Test layers

### Domain tests

Fast, deterministic tests for:

- aggregate invariants;
- value-object validation;
- state transitions;
- domain events;
- policy edge cases.

They use no mocks for infrastructure because infrastructure is absent.

### Application tests

Test use cases through ports using deterministic fakes:

- transaction behavior;
- authorization and policy coordination;
- idempotency;
- optimistic concurrency;
- outbox creation;
- failure mapping.

### Contract tests

Validate:

- JSON Schema compatibility;
- event envelopes;
- SDK/server compatibility;
- runtime-adapter conformance;
- transport error mapping.

Each narrow runtime capability port has a conformance suite. The applicable suites
run against the fake runtime, legacy compatibility adapter, and `ar` adapter.
Capability discovery tests verify that an adapter cannot claim unsupported resume,
approval, streaming, or recovery behavior.

Runtime conformance also covers idempotency-key reuse, unknown command outcome,
event replay, duplicate and gap handling, runtime epochs, cursor persistence, and
snapshot reconciliation.

Each production persistence adapter runs:

- platform technical harnesses for transactions, crash simulation, migrations, and
  backup/restore;
- its context-owned semantic suite for aggregate, repository, query, and scope
  behavior;
- applicable capability suites for event outbox, command dispatch, inbox, tenant
  isolation, and projection cursors.

### Adapter integration tests

Test concrete adapters against disposable infrastructure:

- NATS JetStream;
- SQLite and PostgreSQL;
- Temporal test environment;
- local sidecar transport;
- `ar` test runtime.

### End-to-end tests

Use isolated sandbox projects and test identities. End-to-end tests verify only
critical workflows and recovery boundaries.

Never run agent launch or task execution tests against real user projects.

## Architecture tests

Automated checks must reject:

- forbidden imports;
- package dependency cycles;
- cross-context deep imports;
- broad package exports;
- provider branches in core;
- public SDK/transport contract imports in application or domain;
- transport types in domain;
- unversioned external contracts;
- context-owned storage or projections placed in global platform packages;
- process-wide resources instantiated below the application composition root;
- multiple process-owner implementations wired simultaneously;
- runtime ports owned or exported by the Runtime ACL;
- one event handler mutating multiple bounded contexts;
- cross-context foreign keys, joins, transactions, or table writes;
- broad `spi` or root package barrel exports;
- feature dependency cycles inside one bounded context;
- generic aggregate repositories or ORM entities in domain/application.

## Replay and simulation

Build a deterministic harness that can:

- replay integration events into projections;
- simulate duplicate and out-of-order delivery;
- inject runtime crashes and stale snapshots;
- verify retry and compensation policy;
- compare legacy and new runtime projections.

Replay tests are a reliability tool, not a commitment to event sourcing.

## Test doubles

Fakes model declared contracts and deterministic state. Mocks are reserved for
interaction boundaries where call ordering is itself the behavior. Tests must not
encode implementation details that prevent refactoring adapters.

## Quality gates

Before merging behavior:

- affected domain and application tests pass;
- contract schemas validate;
- architecture tests pass;
- changed adapters have focused integration coverage;
- migrations include rollback or forward-recovery verification;
- documentation and ADRs match the implementation.
