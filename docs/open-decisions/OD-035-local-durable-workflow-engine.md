---
id: OD-035
type: open-decision
status: open
owner: run-orchestration
summary: Select and qualify a lightweight durable workflow engine for the required Fully Local V1 Orchestrator Host profile.
related:
  - ADR-0027
  - ADR-0030
  - ADR-0106
  - ADR-0112
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - domain.contexts.run-orchestration
  - OD-005
  - OD-021
---

# OD-035: Local Durable Workflow Engine

## Decision required

Choose the implementation behind the Run Orchestration workflow scheduling ports
for the required Fully Local V1 profile. The choice must not affect domain
invariants, process-manager authority, public SDK contracts, or the hosted
Temporal adapter accepted by ADR-0027.

ADR-0112 requires Fully Local in V1. This engine decision remains open and must
be resolved for its local implementation and release gates. V1 scope does not
select a local Temporal service, OpenWorkflow, or an in-memory scheduler.

## Constraints

- Domain and application packages import neither OpenWorkflow nor Temporal.
- Feature-owned process state and decisions remain authoritative; an engine owns
  durable execution mechanics only.
- Local and hosted engines drive the same commands and observable business
  outcomes through engine-independent fixtures.
- Native PostgreSQL local operation must survive process crash, restart, duplicate wake-up,
  cancellation, timer expiry, and code upgrade.
- No external service, Docker installation, or manual database setup is required
  for the fully local Desktop profile.
- Windows, macOS, and Linux packaging and recovery must be qualified.
- Engine licensing must permit signed redistribution.

## Current preferred candidate

OpenWorkflow is the primary candidate for a disposable qualification spike. As of
2026-08-09, release `0.9.2` is Apache-2.0, supports Node and Bun, provides SQLite
and PostgreSQL backends, and implements durable steps, retries, signals, timers,
child workflows, cancellation, idempotency keys, and workflow versioning without
a separate workflow server.

That dated inventory remains evidence, not a current dependency-readiness review.
ADR-0106 requires the future local adapter to qualify the PostgreSQL backend;
SQLite support does not authorize a second local persistence engine. Scheduler
storage remains adapter-owned and cannot write business schemas or join a
bounded-context Unit of Work.

It is not yet an accepted production dependency. At that research date, its
published roadmap listed priority and concurrency controls, compensation, cron,
and OpenTelemetry as future work, manual retry and retention remained open,
and its upstream CI did not prove Windows behavior.

## Qualification spike

The spike implements one representative Team Activation process through the
consumer-owned workflow scheduling ports and proves:

1. deterministic replay and stable step identity across code changes;
2. crash before and after application command acceptance;
3. signal duplication, loss, late delivery, and cancellation races;
4. long timer recovery and clock discontinuity handling;
5. ambiguous activity outcome without blind side-effect retry;
6. worker lease loss, stale worker fencing, and orphan recovery;
7. PostgreSQL contention, full disk, corruption, backup, and restart behavior
   under the managed local lifecycle;
8. bounded history, retention, manual operational recovery, and observability;
9. N/N-1 workflow and persisted-state compatibility;
10. macOS, Linux, and Windows packaging and lifecycle behavior;
11. parity with the same domain command trace driven by the Temporal adapter
    model;
12. absence of OpenWorkflow types outside the local outbound adapter and
    composition root.

Shared PostgreSQL does not select a workflow engine or permit database-backed
ad hoc orchestration in domain code. The spike qualifies scheduler leases,
transactions, migration ownership, and recovery independently of business-state
persistence.

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
- The selected adapter supplies the evidence required for the Fully Local V1
  release target accepted by ADR-0112; target selection alone is not qualification.

## Resolution

Open. OpenWorkflow is the preferred candidate for the qualification spike, not a
committed dependency. A qualified durable adapter is required for Fully Local V1;
the candidate library is not mandatory merely because that profile is required.
