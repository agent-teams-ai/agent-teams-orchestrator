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
  - ADR-0106
  - OD-021
  - architecture.persistence
  - research.cross-dialect-persistence-tooling-2026-07-26
---

# OD-003: Persistence Composition

## Accepted constraints

ADR-0106 selects native PostgreSQL for both the future Fully Local profile and
the server profiles, replacing ADR-0011's local SQLite topology. Each initially
uses one application database with context-owned schemas. A local Target owns
one durable bundled cluster under the Local Supervisor; Desktop is a client of
the local or server Host and never a second persistence authority.

The shared TypeScript persistence adapter uses asynchronous `node-postgres` and
adapter-local Drizzle. Context schemas, immutable SQL migrations, codecs, and
semantic suites are reused within a qualified capability matrix. SQLite,
PGlite, and a second dialect tree are not implementation fallbacks.

ADR-0106 preserves capability-scoped Units of Work and post-commit external
effects from ADR-0025; single authority and logical transfer from ADR-0048; and
adapter-local Drizzle with a direct-driver contingency from ADR-0052. It removes
their local SQLite-specific implementation requirements. ADR-0047 still governs
feature-owned migration plans and context-level assembly. ADR-0049's exact-value
and microsecond mappings apply through its PostgreSQL column. ADR-0050's real
concurrency evidence now applies to both profiles.

Native local PostgreSQL does not resolve lifecycle or production readiness.
Node `embedded-postgres` is the first qualification candidate for a Node
lifecycle substrate; Rust `postgresql_embedded` is considered only after an
independent Rust substrate choice. Exact wrapper and engine artifacts, signing,
offline packaging, persistent durability, and operational behavior require
qualification. The Desktop framework and production wrapper dependency remain
unselected. The existing server-first release and local materialization gates
are unchanged.

Current semantics live in the [persistence boundary](../architecture/persistence-boundary.md).
The [managed PostgreSQL lifecycle](../architecture/local-host-lifecycle.md#managed-postgresql-lifecycle)
owns process custody, bootstrap credentials, identity, shutdown, and activation;
this decision and OD-021 supply their remaining implementation evidence.

## Proposed launcher qualification, 2026-10-17

`embedded-postgres` remains the first qualification candidate under ADR-0106
for the existing Node Local Supervisor. The supplied executable evidence
supports that order; later source review identifies requirements still to close,
not a demonstrated production advantage for a replacement. The separate
comparison below establishes a tested Linux direct-tools contingency and one
wrapper shutdown limitation. Standard PostgreSQL tools behind the same component
adapter remain available if maintained wrapper fixes cannot satisfy its lifecycle.
This comparison selects no production
dependency, Desktop framework, or new lifecycle substrate.

### Supplied executable evidence

The product-owner-supplied report *Bundled PostgreSQL options: research and
executable comparison*, dated 2026-10-03, reports these isolated Linux results
with Node 24.21.0 and one SQL client. Build and dependency assets were staged
before the runs; runtime network namespaces contained only loopback.

| Observed behavior | Node `embedded-postgres` | Rust `postgresql_embedded` |
|---|---|---|
| Wrapper and actual engine | 18.4.0-beta.17; PostgreSQL 18.4 | 0.21.0; PostgreSQL 18.6 |
| Offline first start | Passed with staged npm platform payload | Passed with fresh bundled archive extraction |
| Drizzle transaction rollback | Passed | Passed |
| Receipt and outbox in one transaction | Passed | Passed |
| Deliberately discarded completed reply | Reconciled | Reconciled |
| Persistent reopen | Passed | Passed |
| Effective `fsync`, `full_page_writes`, `synchronous_commit` | All on | All on |
| Graceful shutdown and owned postmaster cleanup | Passed | Passed |
| Control-loop timer during slow SQL | 22 ticks | 24 ticks |

The timer used `pg_sleep(0.25)` and a 10 ms interval. It measures that blocking
boundary, not agent capacity, general fairness, or comparative throughput.
Windows lifecycle, signed installers, interrupted updates, power-loss durability,
backup restore, and major upgrades remain outside this comparison's evidence.
The supplied report text does not include its linked raw artifacts. Its original
experiments were not rerun; the following comparison has a separate harness and
scope. The second supplied report,
*Hosted full-Internet default: implementation and qualification*, dated
2026-10-03, qualifies hosted worker networking, not bundled PostgreSQL.

### Same-payload lifecycle comparison, 2026-10-17

A new disposable Linux comparison used Node 26.11.1, `pg` 8.22.0, and the same
`embedded-postgres` 18.4.0-beta.17 Linux payload for both launch paths. Actual
PostgreSQL was 18.4. Exact tarball integrity, binary and launcher digests,
the dependency lock, source, and sanitized results are retained with the review artifact.
Both paths used an existing unprivileged UID, separate private data roots,
loopback TCP only, SCRAM, and authenticated cluster identity. Effective `fsync`,
`full_page_writes`, and `synchronous_commit` were all on.

| Observed lifecycle behavior | Configured wrapper behind a guard | Direct tools |
|---|---|---|
| Initialization and bootstrap-file removal | Passed | Passed |
| Authenticated startup and committed sentinel | Passed | Passed |
| Graceful stop and persistent reopen of the same cluster | Passed | Passed |
| Owned postmaster process crash and committed-data recovery | Passed | Passed |
| Occupied test port rejects startup and preserves its listener | Passed | Passed |
| Final owned process cleanup | Passed | Passed |
| Separate raw-wrapper diagnostic after the startup child exited | `stop()` did not resolve within 1,000 ms | Not applicable |

The guarded common paths passed six checks each. The failed raw-wrapper
diagnostic remains a reported limitation. The guard avoids calling `stop()` when
the owned postmaster has already exited, but the package's global exit hook
still calls raw `stop()` outside that guard. A maintained fix or qualified
lifecycle integration is required before production adoption. Occupied-port
startup also rejected with an undefined value; PostgreSQL diagnostics remained
available through the configured log callback.

With controlled umask `022`, the wrapper created a mode-`0644` bootstrap file and
the direct adapter created mode `0600`. Both files belonged to the unprivileged
UID inside a mode-`0700` parent and were removed. This reproduced the mode
difference, not secret disclosure. File access and cleanup on failed
initialization remain qualification work.

The direct path used foreground `postgres` startup and `pg_ctl` fast shutdown;
it did not test a background server outliving its Supervisor. Network namespace
isolation was unavailable, so this is not another offline qualification. The
process-crash check was not a power-loss or interrupted-transaction test. Windows,
macOS, packaging, missing executables, startup hangs, Supervisor death, backups,
upgrades, and capacity were not tested. Independent cleanup found no remaining
fixture processes or database directories. The comparison demonstrates no
database-performance or overall production-reliability advantage for either
launcher.

The reproducible harness, frozen dependency lock, sanitized JSON and logs,
provenance, and independent cleanup evidence are supplied in
`postgres-launcher-comparison-20261017.zip`. SHA-256:
`a9f79bd315665b4e7c9b1279719ad579974e95a44b046e209dfb44b2d7bbf8da`.

### Qualification options

Scores are subjective engineering judgments out of ten for this repository.
Confidence measures recommendation fit for the existing lifecycle substrate;
reliability estimates the qualified lifecycle integration, not a measured failure
rate or a different SQL engine.
Complexity includes packaging, operations, and maintenance; higher is worse.
The Node scores retain the supplied report's planning assessment. The Rust fit
score reflects the additional substrate choice, not a lower package quality.
The direct adapter now has a bounded Linux implementation and evidence; its
scores remain provisional estimates for the missing product integration.
Table order is qualification priority, not production adoption. Every option
still requires the accepted lifecycle and recovery evidence.

| Qualification role | Option | Confidence | Reliability | Complexity |
|---|---|---|---|---|
| First Node candidate | `embedded-postgres` with a small hardened adapter and maintained upstream fixes | 8/10 | 7/10 | 6/10 |
| Tested Linux contingency for wrapper limitations | Node Supervisor adapter using `initdb`, foreground `postgres`, and `pg_ctl` with existing binary artifacts | 7/10 | 7/10 | 6–7/10, provisional |
| Conditional alternative | `postgresql_embedded` after an independent Rust substrate decision | 5/10 | 8/10 | 8/10 |

### Source review and remaining qualification

The [npm registry](https://registry.npmjs.org/embedded-postgres/latest) reported
`embedded-postgres` 18.4.0-beta.17, while the
[PostgreSQL version policy](https://www.postgresql.org/support/versioning/)
listed 18.6 as the current PostgreSQL 18 minor release. Reusable artifacts
include [Theseus 18.6.0](https://github.com/theseus-rs/postgresql-binaries/releases/tag/18.6.0)
and [embedded binary bundle 18.6.0](https://github.com/zonkyio/embedded-postgres-binaries/releases/tag/v18.6.0).
These are review-time candidates, not selected release payloads. Their exact
per-platform binaries, helper tools, dependencies, signatures, and offline
installation remain unqualified. Consuming a Theseus binary does not require
introducing its Rust wrapper.

The [reviewed Node source](https://github.com/leinelissen/embedded-postgres/blob/8c8c16d1b81bec8ae3315d59a050654086a85e23/packages/embedded-postgres/src/index.ts)
is a separate source-audit pin, not proof of byte identity with the tested npm
artifact. Defaults are configurable and the reported fixture replaced the
development credentials and fixed port. Initialization creates its own temporary
password file without an explicit
owner-only mode; effective exposure depends on directory protections and the
process file-creation mask. Public `initdbFlags` can add tool arguments, but they
cannot suppress the wrapper's creation of its own password file. There is also
no public option to disable the global exit hook. Readiness from stderr,
missing bounded process handling, and Windows forced termination also need
qualification. These are source-review risks, not reproduced secret disclosure
or data-loss bugs. The separate npm-payload comparison above reproduces the
bootstrap mode and raw stop-after-exit behavior; it does not prove that this
GitHub source pin is byte-identical to that npm payload.
If hardening replaces most initialization, startup, shutdown, and exit handling,
direct tools avoid maintaining a parallel launcher fork.

The [Rust release](https://github.com/theseus-rs/postgresql-embedded/releases/tag/v0.21.0)
remains 0.21.0. Its
[launcher](https://github.com/theseus-rs/postgresql-embedded/blob/a995b73d5b0b220f96b03634ec8cdfe117996c26/postgresql_embedded/src/postgresql.rs)
uses `pg_ctl`, but temporary-data defaults and the `-F` startup option require
explicit persistent configuration and effective durability verification. Its
[bundler](https://github.com/theseus-rs/postgresql-embedded/blob/a995b73d5b0b220f96b03634ec8cdfe117996c26/postgresql_embedded/build/bundle.rs)
can reuse existing output before selecting a requested archive. Another language
and executable boundary need an independent benefit; the package alone supplies
no reason to replace the Node Supervisor.

Standard tools still require product custody. PostgreSQL documents that
[`pg_ctl`](https://www.postgresql.org/docs/18/app-pg-ctl.html) starts a background
server and that an operation can continue after its timeout. The server can
outlive both the tool's Node child-process handle and the Supervisor. Completion
therefore requires authenticated cluster identity and owned data-root checks,
with reconciliation before another start. Fast shutdown is clean; immediate
termination requires crash recovery.
[`pg_isready`](https://www.postgresql.org/docs/18/app-pg-isready.html) does not
require correct credentials and cannot establish that identity. A direct adapter
must itself create a protected bootstrap password file before invoking
[`initdb`](https://www.postgresql.org/docs/18/app-initdb.html), preserve existing
data, and verify the effective durability settings required by persistence.

The bounded next qualification checks the Node wrapper against the remaining
lifecycle requirements in disposable data roots on Windows and a supported
POSIX platform. Reuse the same-payload evidence above for its exact Linux inputs;
do not rerun it as a substitute for closing the untested lifecycle cases.
Qualify offline restart, bootstrap-file access and failed-initialization cleanup,
foreign database identity, spawn failures, startup hangs, idempotent stop after
exit, global exit-hook integration, and Supervisor death with a surviving server.
Record actual binary hashes and SQL settings for each qualified platform.
Keep the wrapper only if supported APIs and small maintained fixes satisfy the
contract; otherwise qualify direct tools. This experiment neither proves power-loss
durability nor replaces packaging, backup, upgrade, or workload qualification.

## Decision evidence

The following experiments retain their original dates, versions, and results.
Their SQLite evidence describes the former local design and does not qualify
native local PostgreSQL. The cross-dialect toolkit baseline is historical;
production dependency review evaluates the actual PostgreSQL imports and
supported versions rather than requiring a `node:sqlite` adapter.

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
- exact native PostgreSQL engine, wrapper, platform artifacts, driver, and
  configuration tuple, including collation and extension compatibility;
- concrete capability Unit of Work and PostgreSQL concurrency profiles after initial
  aggregate discovery;
- migration contribution API, online-step state machine, and PostgreSQL execution
  tooling;
- local WAL, checkpoints, resource bounds, total connection budgets, relay
  leasing, and row-security implementation;
- native bootstrap and custody qualification with OD-021, including source-audit
  risks recorded by ADR-0106, interrupted updates, and major-version compatibility;
- PgBouncer restart, upgrade, HA, credential rotation, saturation, and
  managed-provider compatibility before enabling that optional profile;
- one initial local backup artifact and retention policy, representative-size
  pause budgets, protected blob and key recovery, and remote artifact storage;
- restored authority and receipt reconciliation before dispatch resumes, with no
  blind external retry or implicit rollback of later accepted writes;
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
