---
id: OD-035
type: open-decision
status: open
owner: run-orchestration
summary: Select and qualify a lightweight durable workflow engine for the required Fully Local V1 Orchestrator Host profile.
related:
  - ADR-0027
  - ADR-0030
  - ADR-0114
  - ADR-0115
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

ADR-0115 requires Fully Local in V1. This engine decision remains open and must
be resolved for its local implementation and release gates. V1 scope does not
select a local Temporal service, OpenWorkflow, DBOS, or an in-memory scheduler.

## Constraints

- Domain and application packages import no workflow-engine library.
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
ADR-0114 requires the future local adapter to qualify the PostgreSQL backend;
SQLite support does not authorize a second local persistence engine. Scheduler
storage remains adapter-owned and cannot write business schemas or join a
bounded-context Unit of Work.

It is not yet an accepted production dependency. At that research date, its
published roadmap listed priority and concurrency controls, compensation, cron,
and OpenTelemetry as future work, manual retry and retention remained open,
and its upstream CI did not prove Windows behavior.

### Review evidence from 2026-10-22

This is a source/documentation review, not an executed qualification or a version
selection. Pin the candidate release before running the matrix below; the old
roadmap inventory alone cannot reject a newer release.

- The current [signals guide](https://openworkflow.dev/docs/signals) says an
  early signal is lost when no workflow is waiting. Persisted feature state and
  supported engine timers/wake-up mechanics must close that race. A signal is
  not the authoritative approval record.
- The [retry guide](https://openworkflow.dev/docs/retries) permits a step to run
  again after a worker crash. Operator rerun creates a fresh engine run without
  the previous idempotency key, deadline, or parent. Preserve business command
  identity and receipts across both paths; prove recovery across the commit gap.
- The [PostgreSQL backend](https://openworkflow.dev/docs/postgres) permits
  `runMigrations: false`. Qualify separate migration authority and a bounded
  worker pool instead of granting every worker startup DDL authority.
- Temporal documents [native Server binaries](https://docs.temporal.io/self-hosted-guide/deployment)
  as a deployment path. Its [SQLite embedded server](https://docs.temporal.io/self-hosted-guide/embedded-server)
  is limited to development and testing. A native production candidate must use
  the full PostgreSQL-backed service, not the SQLite development server.
- Native Windows feasibility remains unproved: Temporal's
  [Server contributor guide](https://github.com/temporalio/temporal/blob/main/CONTRIBUTING.md)
  directs Windows development through WSL2. This neither establishes the native
  product package nor proves it impossible. Test the full native service first.
- The current [Temporal TypeScript SDK main-branch requirements](https://github.com/temporalio/sdk-typescript/blob/main/README.md#requirements)
  name Node 20, 22, and 24. The repository's Node 26 quality-tooling pin is not
  evidence that a production Worker is supported. Qualify the exact SDK/runtime
  combination without changing existing pins through this open decision.

Reject the OpenWorkflow integration if lost signals, stale workers, or commit
gaps require building a repository-owned general scheduler outside its supported
durability mechanisms. For native Temporal, resolve the exact Windows binary,
PostgreSQL service, Worker, resource, and interrupted-upgrade combination before
large feature implementation. Both candidates still need the complete matrix.

### Additional candidate: DBOS

The same review admits the open-source DBOS TypeScript SDK with native
PostgreSQL to the qualification shortlist. The
[v5.3 release](https://github.com/dbos-inc/dbos-transact-ts/releases/tag/v5.3)
separates its optional enterprise integration. This is a candidate reference,
not an adopted dependency pin or proof that every current documentation API
exists in that release.

- [Workflow messages](https://docs.dbos.dev/typescript/tutorials/workflow-communication)
  are persisted and queued for later receipt, including idempotent sends from
  ordinary TypeScript. This addresses early arrival without making messages
  authoritative approval state.
- The [recovery guide](https://docs.dbos.dev/production/workflow-recovery)
  documents recovery when a single application process restarts without
  Conductor. Qualify one Supervisor-owned executor per owning workflow
  application first; do not infer automatic distributed failure takeover.
- [Configuration](https://docs.dbos.dev/typescript/reference/configuration)
  exposes separate schema, pool, and migration controls. Qualify these on the
  exact release with bounded connections and a worker role without DDL rights.
- [Conductor self-hosting](https://docs.dbos.dev/conductor/self-hosting/hosting-conductor)
  is proprietary, documented through containers, and normally validates a
  license online at startup. Conductor is excluded from this native baseline
  candidate; its recovery and retention capabilities cannot be attributed to
  the open-source SDK alone.

Run a short recovery and upgrade preflight before substantial integration:
early and duplicate approval, owner commit before engine checkpoint, paused
predecessor resuming after replacement, pending approval through N/N-1 update,
bounded history, and waiting-workflow admission without control starvation.
Use the actual native runtime with cloud configuration absent. A restartable
local executor does not authorize combining unrelated service owners or adding
a repository-owned recovery scheduler. OpenWorkflow remains the first full
qualification candidate; DBOS may change that order after this evidence exists.

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
12. absence of engine-specific types outside the local outbound adapter and
    composition root.

Shared PostgreSQL does not select a workflow engine or permit database-backed
ad hoc orchestration in domain code. The spike qualifies scheduler leases,
transactions, migration ownership, and recovery independently of business-state
persistence.

## Options

1. OpenWorkflow local adapter, the preferred spike candidate. It minimizes
   custom durability code but requires qualification and an upstream-risk exit
   strategy.
2. Bundle full Temporal Service locally with PostgreSQL. This maximizes hosted
   engine parity but adds a service, schemas, ports, resource consumption, and
   upgrade lifecycle. Supervisor can own the user setup; native packaging and
   recovery must demonstrate whether that cost is acceptable.
3. DBOS with PostgreSQL, subject to the open-source recovery and upgrade
   preflight above. It offers queued workflow messages but must prove native
   lifecycle behavior without Conductor or a custom recovery controller.

A repository-owned general durable scheduler is not recommended or selected.
It duplicates replay, retry, timer, migration, and recovery responsibility and
would need a separate accepted architecture decision.

## Acceptance criteria

- The complete spike matrix passes on all supported operating systems.
- Engine-specific state and APIs remain replaceable behind one adapter.
- Failure semantics match accepted Run Orchestration ownership and ADR-0027.
- Operational recovery and upgrade behavior are documented and executable.
- A dependency exit test proves persisted runs can be drained or migrated without
  changing domain state or public identities.
- The selected adapter supplies the evidence required for the Fully Local V1
  release target accepted by ADR-0115; target selection alone is not qualification.

## Resolution

Open. OpenWorkflow is the preferred candidate for the qualification spike, not a
committed dependency. A qualified durable adapter is required for Fully Local V1;
the candidate library is not mandatory merely because that profile is required.
