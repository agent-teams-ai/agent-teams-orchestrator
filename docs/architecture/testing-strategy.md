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

The same `AgentRuntimePort` conformance suite must run against the fake runtime,
legacy compatibility adapter, and `ar` adapter.

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
- transport types in domain;
- unversioned external contracts;
- multiple process-owner implementations wired simultaneously.

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
