---
id: OD-003
type: open-decision
status: open
owner: platform/persistence
summary: Complete persistence operational policy, readiness, migration tooling, and backup design.
related:
  - ADR-0011
  - ADR-0047
  - ADR-0025
  - ADR-0048
  - ADR-0049
  - ADR-0050
  - ADR-0051
  - ADR-0052
  - architecture.persistence
  - research.cross-dialect-persistence-tooling-2026-07-26
---

# OD-003: Persistence Composition

## Accepted constraints

ADR-0011 selects one SQLite file per bounded context locally and one PostgreSQL
schema per bounded context initially when hosted. ADR-0047 fixes feature-owned
migration plans with context-level assembly and transactional versus
online-resumable steps. ADR-0025 selects Node.js 24 LTS,
`node:sqlite`, `node-postgres`, adapter-local Drizzle, capability-scoped Units of
Work, and a per-context local command lane. It rejects a repository-level database
worker and keeps external effects after commit.

ADR-0048 selects one authoritative persistence profile per context and separates
logical transfer from physical recovery. ADR-0049 fixes the initial exact-value
and microsecond-instant mapping. ADR-0050 requires capability-owned hosted
concurrency profiles and real concurrent PostgreSQL conformance.

ADR-0052 selects adapter-local Drizzle as the default toolkit and direct drivers
only as contingency. The initial `node:sqlite` dependency baseline is
`drizzle-orm@1.0.0-rc.4` and `drizzle-kit@1.0.0-rc.4`, pinned without version
ranges. Stable `0.45.2` does not expose the `node:sqlite` adapter. Installation
must recheck the current GA release, verify the actual
`drizzle-orm/node-sqlite` import, and run persistence conformance before changing
this decision's readiness state.

Node.js 24.18.0 still classifies `node:sqlite` as Stability 1.2, Release
Candidate. It is accepted only behind the asynchronous persistence adapter and
the SQLite/PostgreSQL conformance suites. Its API, synchronous execution model,
backup behavior, packaging, and failure classification cannot leak into domain or
application code.

If that readiness gate fails, a driver-level fallback such as `better-sqlite3`
may replace only the local persistence adapter behind the same ports and
conformance suite. The project does not maintain two local drivers in parallel by
default.

The 2026-07-26 cross-dialect tooling review found no stable library that satisfies
the accepted `node:sqlite`, `node-postgres`, exact-value, migration, and
capability-concurrency requirements while safely collapsing both repository
implementations. Drizzle remains the strongest provisional adapter-local toolkit.
Kysely lacks a current first-party `node:sqlite` dialect, Prisma's maintained
SQLite adapter uses `better-sqlite3`, and released Effect SQL has not yet shipped
its source migration to built-in SQLite.

## Decision evidence

An isolated parity spike on 2026-07-25 ran Node.js 24.18.0 with SQLite 3.53.1,
PostgreSQL 18.4, `pg` 8.22.0, and pinned `drizzle-orm` 1.0.0-rc.4. Twenty-five of
twenty-five scenarios passed across state, command receipt, outbox atomicity,
rollback, crash windows, restart, optimistic revision, fencing, and concurrent
idempotency.

The same probe confirmed that stable `drizzle-orm` 0.45.2 does not export
`drizzle-orm/node-sqlite`; the RC remains a provisional implementation candidate.
PostgreSQL `jsonb` reordered keys, and SQLite writer contention required
adapter-local classification.

A deliberately unyielding burst of 250 synchronous SQLite transactions completed
in approximately 574 ms and delayed a zero-delay timer for the same interval.
This does not select a Worker Thread by itself. It requires bounded command-lane
scheduling and an explicit latency budget before deciding whether to move the
complete bounded-context lane off the Host event loop.

A second isolated mixed-load spike ran 24/24 profiles with Node 24.18.0 and
SQLite 3.53.1. In-process execution remained viable with bounded admission and a
short scheduler quantum. Moving the complete bounded-context lane to a Worker
Thread reduced main-loop timer drift, but did not improve overload queueing and
introduced fairness requirements for feed and outbox work. Unbounded bursts
produced multi-second command latency in both modes. Worker promotion must
therefore be based on measured Host responsiveness after backpressure, never on
command latency alone. The retained `SQLite command-lane placement` fingerprint
is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

An isolated migration and backup spike then passed 16/16 scenarios for
`node:sqlite` and PostgreSQL 18.4. It proved immutable checksum enforcement,
atomic migration history and watermark updates, crash recovery, serialized
startup, SQLite online backup during bounded writes, PostgreSQL schema-scoped
dump/restore, and rejection of partial or too-new restores. It also showed that
the PostgreSQL advisory lock must precede metadata DDL and that SQLite needs a
cross-process bootstrap lock before WAL and migration setup. The retained
`Persistence migrations and backup` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

That evidence covers transactional migrations. ADR-0047 requires a separate
interruption, verification, and ambiguity matrix for non-transactional online
steps before those steps are production ready.

A multi-context SQLite barrier spike passed 25/25 scenarios in three full runs.
Three independent context command lanes produced one product backup generation
with distinct local watermarks and no writes after barrier acknowledgement.
Participant timeout aborted the generation without moving the active pointer.
Crash injection at every backup and restore stage proved durable journal
recovery, staged-set cleanup, partial activation rollback, and committed restore
completion.

The evidence selects a technical product backup coordinator over narrow
context-owned participant capabilities. The manifest explicitly denies a
cross-context transaction and global watermark. Restore defaults to an
all-or-nothing product set; selective context restore requires an explicit
operator mode and allowlist. The retained `Multi-context backup barrier`
fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

A failure-classification spike passed 16/16 scenarios across SQLite and
PostgreSQL. It proved that retry policy requires adapter-owned commit phase in
addition to SQLite codes or PostgreSQL SQLSTATE. Failure before commit was
`not-committed`; loss after commit dispatch was `unknown-outcome` and reconciled
by the original command ID without another mutation or outbox event. Corruption
entered controlled recovery, and PostgreSQL required a client-level error listener
in addition to query rejection handling. The retained
`Persistence failure ambiguity` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

A PgBouncer transaction-pooling spike passed 75/75 checks across three runs with
PostgreSQL 18.4, PgBouncer 1.25.2, and `node-postgres` 8.22.0. It proved that
transaction-local tenant binding, state plus receipt plus outbox atomicity,
physical-backend switching, protocol prepared statements, and whole-UoW retry can
preserve the direct PostgreSQL application semantics.

It also reproduced session-state leakage, SQL-level prepared-statement failure,
unreliable `LISTEN`, advisory-lock and temporary-table leakage, and statement-mode
incompatibility with the Unit of Work. PgBouncer is therefore an optional hosted
profile, not the default or an authorization boundary. The retained
`PgBouncer tenant safety` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

A PostgreSQL 18.4 failover and PITR spike passed 38/38 checks with exact
`node-postgres` 8.22.0. In an intentionally disconnected asynchronous profile,
all eight writes acknowledged after replication loss were absent after
promotion. A separate `synchronous_commit=remote_apply` profile preserved 12/12
acknowledged transactions in the tested single-host topology, with observed
commit latency of 23 ms minimum, 33 ms average, and 103 ms maximum. These numbers
are observations, not production SLOs or multi-zone proof.

The same matrix proved:

- primary-only default reads and required-LSN rejection for a lagging replica;
- `NOT_COMMITTED` before commit dispatch versus reconciliation-required
  `UNKNOWN_OUTCOME` after dispatch;
- one atomic state, command receipt, and outbox result after same-ID recovery;
- connection recreation, tenant rebinding, deployment-epoch advance, and
  old-primary fencing after promotion;
- physical base backup plus archived-WAL restore to a named point across all
  bounded-context schemas;
- restored context watermarks, inclusion of the selected atomic transactions,
  and exclusion of later transactions;
- fail-closed too-late, missing-WAL, and corrupted-WAL recovery.

Raw PostgreSQL accepted a target older than the base backup by recovering to the
earliest consistent point and becoming writable. The recovery coordinator must
therefore reject a too-early target against immutable backup metadata before
starting PostgreSQL. Physical PITR restores the cluster as a unit; selective
bounded-context restore remains a separate logical and reconciliation workflow.

## Decisions required

- the pre-production Drizzle readiness result and exact materialized dependency
  versions after checking for a compatible GA release;
- a pre-production `node:sqlite` stability, API, crash, backup, packaging, and
  conformance review against the pinned Node runtime;
- concrete capability Unit of Work and hosted concurrency profiles after initial
  aggregate discovery;
- migration contribution API, online-step state machine, and dialect execution
  tooling;
- WAL, checkpoints, busy timeout, and supported SQLite versions;
- PostgreSQL connections, schema qualification, relay leasing, and row security;
- PgBouncer restart, upgrade, HA, credential rotation, saturation, and
  managed-provider compatibility before enabling that optional profile;
- representative-size desktop backup pause budgets and remote artifact storage;
- hosted backup scheduling, immutable off-site WAL storage, restore authorization,
  production-volume RTO, and recurring restore drills;
- hosted RPO profile and degraded-write policy, automated promotion authority,
  and old-primary rejoin mechanism;
- outbox publication durability barrier: an asynchronous PostgreSQL profile can
  publish an outbox item to JetStream and later lose the containing transaction
  during promotion, leaving a ghost event or external effect; define which
  contracts require synchronous durability or a confirmed WAL/LSN barrier before
  relay eligibility, and restrict weaker profiles to explicitly rebuildable or
  loss-tolerant outputs;
- persistence conformance-kit ownership.

The production readiness suite must still cover real power-loss and filesystem
fault injection, PostgreSQL multi-replica failover and point-in-time recovery,
platform packaging, remote backup storage, and representative packaged-desktop
workload latency.

## Resolution

Open.
