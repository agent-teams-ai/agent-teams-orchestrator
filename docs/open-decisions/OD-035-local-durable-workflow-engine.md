---
id: OD-035
type: open-decision
status: open
owner: run-orchestration
summary: Select and qualify a lightweight durable workflow engine for a future fully local Orchestrator Host profile.
related:
  - ADR-0027
  - ADR-0030
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - domain.contexts.run-orchestration
  - OD-005
  - OD-021
---

# OD-035: Local Durable Workflow Engine

## Decision required

Choose the implementation behind the Run Orchestration workflow scheduling ports
when the fully local profile is admitted. The choice must not affect domain
invariants, process-manager authority, public SDK contracts, or the hosted
Temporal adapter accepted by ADR-0027.

This decision does not require Fully Local in the first usable release. It keeps
that future profile implementable without introducing a local Temporal service or
an accidental in-memory scheduler in application code.

## Constraints

- Domain and application packages import neither OpenWorkflow nor Temporal.
- Feature-owned process state and decisions remain authoritative; an engine owns
  durable execution mechanics only.
- Local and hosted engines drive the same commands and observable business
  outcomes through engine-independent fixtures.
- SQLite local operation must survive process crash, restart, duplicate wake-up,
  cancellation, timer expiry, and code upgrade.
- No external service, Docker installation, or manual database setup is required
  for the future fully local Desktop profile.
- Windows, macOS, and Linux packaging and recovery must be qualified.
- Engine licensing must permit signed redistribution.

## Current preferred candidate

OpenWorkflow is the primary candidate for a disposable qualification spike. As of
2026-08-09, release `0.9.2` is Apache-2.0, supports Node and Bun, provides SQLite
and PostgreSQL backends, and implements durable steps, retries, signals, timers,
child workflows, cancellation, idempotency keys, and workflow versioning without
a separate workflow server.

It is not yet an accepted production dependency. The project is young, its
published roadmap still lists priority and concurrency controls, compensation,
cron, and OpenTelemetry as future work, manual retry and retention remain open,
and its upstream CI does not currently prove Windows behavior.

## Qualification spike

The spike implements one representative Team Activation process through the
consumer-owned workflow scheduling ports and proves:

1. deterministic replay and stable step identity across code changes;
2. crash before and after application command acceptance;
3. signal duplication, loss, late delivery, and cancellation races;
4. long timer recovery and clock discontinuity handling;
5. ambiguous activity outcome without blind side-effect retry;
6. worker lease loss, stale worker fencing, and orphan recovery;
7. SQLite busy, full, corrupt, backup, and restart behavior;
8. bounded history, retention, manual operational recovery, and observability;
9. N/N-1 workflow and persisted-state compatibility;
10. macOS, Linux, and Windows packaging and lifecycle behavior;
11. parity with the same domain command trace driven by the Temporal adapter
    model;
12. absence of OpenWorkflow types outside the local outbound adapter and
    composition root.

## Options

1. OpenWorkflow local adapter, the preferred spike candidate. It minimizes
   custom durability code but requires qualification and an upstream-risk exit
   strategy.
2. A narrow repository-owned durable scheduler. This removes a young dependency
   but duplicates difficult replay, retry, timer, migration, and recovery work.
3. Bundle Temporal Service locally. This maximizes hosted parity but adds an
   operationally heavy service, persistence, migrations, ports, and upgrade
   lifecycle inappropriate for a zero-configuration Desktop profile.

## Acceptance criteria

- The complete spike matrix passes on all supported operating systems.
- OpenWorkflow-specific state and APIs remain replaceable behind one adapter.
- Failure semantics match accepted Run Orchestration ownership and ADR-0027.
- Operational recovery and upgrade behavior are documented and executable.
- A dependency exit test proves persisted runs can be drained or migrated without
  changing domain state or public identities.
- The product owner separately admits the Fully Local profile into a release.

## Resolution

Open. OpenWorkflow is the preferred candidate for the qualification spike, not a
committed dependency or a requirement for the first usable release.
