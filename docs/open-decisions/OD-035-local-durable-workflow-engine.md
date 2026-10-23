---
id: OD-035
type: open-decision
status: open
owner: run-orchestration
summary: Compare executed native workflow spikes and qualify an engine-independent durable adapter for the required Fully Local V1 profile.
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

## Current qualification order

The executed research on **2026-10-23** changes the recommended order to:

1. **Full native Temporal with PostgreSQL**, the first production-qualification
   candidate. It preserves the hosted engine and has the strongest demonstrated
   workflow replay safeguards, at the cost of a separate local service and its
   lifecycle.
2. **DBOS OSS with PostgreSQL**, the alternative if the measured native Temporal
   resource or installation budget is unacceptable. Its buffered messages and
   single-executor recovery worked without Conductor.
3. **OpenWorkflow with PostgreSQL**, suitable for further consideration only
   after an explicitly bounded process and reconciliation design addresses its
   observed signal, history, versioning, and admission constraints.

This replaces the earlier OpenWorkflow-first **research preference**, not an
accepted architecture decision. OD-035 remains open. Research dependencies are
pinned development tooling; no production adapter or dependency is selected by
this document. A production choice still requires owner approval and an ADR.

### Deployment profiles already accepted

[ADR-0115](../decisions/0115-canonical-fully-local-v1-adoption.md) and the
[deployment profiles](../architecture/deployment-profiles.md) already require
these V1 targets:

| Profile | Deployment and lifecycle | Workflow decision |
| --- | --- | --- |
| Managed SaaS | Hosted service roles and managed infrastructure | Hosted Temporal remains accepted by ADR-0027. |
| Standalone Self-Hosted | Customer-operated service roles and infrastructure | The hosted Temporal adapter remains the reference implementation. |
| Fully Local | Local Supervisor manages native PostgreSQL, NATS, service roles, and applicable Dapr processes | OD-035 selects the local workflow adapter and its lifecycle. |

Connected operation remains future scope. The profiles reuse owned business
implementations, public contracts, PostgreSQL migrations, inboxes, outboxes, and
command receipts. Composition selects infrastructure and lifecycle adapters;
application logic must not branch on the deployment profile. Fully Local does
not collapse the accepted separate service roles into one application process.
Desktop selects a Target and uses its Host API. Selecting a hosted Target does
not start unused local infrastructure or authorize silent data synchronization,
failover, or migration.

[ADR-0027](../decisions/0027-temporal-as-run-orchestration-adapter.md) already
makes Temporal replaceable. Native PostgreSQL and its local lifecycle approach
are accepted by [ADR-0114](../decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md);
this engine comparison does not reopen those decisions.

## Executed research on 2026-10-23

### Scope and evidence

Three parallel GPT-6.1 agents at `xhigh` researched one candidate each, followed
by a cyclic cross-review: DBOS reviewed OpenWorkflow, OpenWorkflow reviewed
Temporal, and Temporal reviewed DBOS. The review added a missing Temporal patch
marker assertion and corrected the interpretation of OpenWorkflow's recurring
schedule version validation before the final evidence was retained.

These are real engine-to-PostgreSQL component end-to-end spikes of a small Team
Activation process: persist approval, wait, invoke activation, record an owned
receipt, and recover through process failures. They use actual child processes,
actual `SIGKILL`, PostgreSQL transactions, persisted engine state, and native
binaries. They do not use mock engines, SQLite, Docker, Conductor, or a cloud
account. They do not exercise the complete product's Host, Dapr, NATS, AR,
identity, or external provider integration.

| Component | Executed pin | Scope |
| --- | --- | --- |
| OpenWorkflow | `0.11.0` | PostgreSQL backend, Node worker |
| DBOS TypeScript SDK | `5.3.0` | OSS SDK and PostgreSQL, without Conductor |
| Temporal | Server `1.32.1`, TypeScript SDK `1.24.0` | Full service with default and visibility PostgreSQL stores; separate Worker |
| PostgreSQL | `18.4`, distributed by `embedded-postgres@18.4.0-beta.17` | Native Linux x64; durability settings enabled |
| Initial research runtime | Node `24.19.0`, TypeScript `7.0.2`, `pg@8.23.1` | Recorded executions; repository quality tooling keeps its existing Node lane |

The shared database had `fsync`, `full_page_writes`, and `synchronous_commit`
enabled. The research distribution pin is not a qualified production PostgreSQL
package. Temporal's [persistence guide](https://docs.temporal.io/temporal-service/persistence)
currently lists actively tested PostgreSQL versions through 16; this actual
PostgreSQL 18.4 run is local evidence, not an upstream support certification.

Retained evidence:

- [OpenWorkflow assertions and observations](../research/evidence/od035-2026-10-23/openworkflow/results.json)
- [DBOS assertions and observations](../research/evidence/od035-2026-10-23/dbos/results.json)
- [Temporal assertions and observations](../research/evidence/od035-2026-10-23/temporal/results-linux-x64.json)
- [Temporal native artifacts and SDK targets](../research/evidence/od035-2026-10-23/temporal/artifact-evidence.json)
- [Native CI matrix and original platform results](../research/evidence/od035-2026-10-23/native-ci/matrix.json)
- [Source and evidence manifest](../research/evidence/od035-2026-10-23/manifest.json)

A passing assertion can mean an **expected negative control was reproduced**.
For example, a lost OpenWorkflow signal, a stranded DBOS version, or a rejected
Temporal replay is not a successful production behavior. Counts across the
harnesses are not comparable reliability measurements. These fixtures exercise
comparable business invariants; they are not yet a shared production contract
suite or identical event-trace oracle.

### Native cross-platform execution

The reviewed [native CI run](https://github.com/agent-teams-ai/agent-teams-orchestrator/actions/runs/39988635688)
executed the retained source at commit
`e6037277984c9b408ff45bf9a840369a71a7af3c`, using Node `24.21.0` and the frozen
repository toolchain. All nine jobs passed actual result and cleanup inspection.
Original JSON bytes and artifact digests are retained in the matrix evidence.

| Candidate | Linux x64 | macOS arm64 runner | Windows x64 |
| --- | --- | --- | --- |
| OpenWorkflow | 18 assertions matched | 18 assertions matched | 17 matched, 1 explicit skip |
| DBOS OSS | 15 assertions matched | 15 assertions matched | 13 matched, 2 explicit skips |
| Full native Temporal | 11 assertions matched | 11 assertions matched | 10 matched, 1 explicit skip |

Windows skips are the POSIX `SIGSTOP`/`SIGCONT` predecessor-suspension probes.
They are not passes. Resource snapshots are excluded from assertion counts.
The Windows Temporal result includes the actual full native service, PostgreSQL,
Worker/service termination, persisted timer recovery, patching, and incompatible
replay rejection. It does not depend on WSL, Docker, or the development server.

The first matrix exposed a bootstrap defect before any Windows engine ran:
direct PostgreSQL startup rejected the administrative runner token, while the
distribution's `async-exit-hook` dependency converted the failure into exit zero.
Those job conclusions were rejected as evidence. The corrected fixture uses
upstream `pg_ctl` restricted-process startup, explicit access to its owned
directory, UTF-8 initialization, and an explicit exit status after cleanup.
A deliberate bootstrap-failure control passed in all nine corrected jobs.
The original failure summaries remain in the evidence set.

Independent binary inspection identifies Linux PostgreSQL as ELF x86-64 and
macOS PostgreSQL as a universal Mach-O binary with both x86_64 and arm64 slices.
The macOS version string alone had misleading x86_64 build metadata. Windows
uses the pinned x64 package and reports x86_64; independent PE inspection is not
part of this fixture. These results establish the tested runtime combinations,
not signed installation, supported Windows ARM64, or release qualification.

### Results that affect the choice

| Scenario | OpenWorkflow 0.11.0 | DBOS 5.3.0 | Temporal 1.32.1 / SDK 1.24.0 |
| --- | --- | --- | --- |
| Approval arrives before the workflow waits | Raw signal lost, as documented; persisted approval plus a durable timeout and fresh read recovers. | Message retained until receipt; duplicate delivery does not duplicate the owned mutation. | Signal retained in workflow history; duplicate delivery does not duplicate the owned mutation. |
| Approval commits but the sender dies before notifying the engine | Zero signal sends; supported timeout and authoritative reread recover. | The waiting workflow does not advance until the feature outbox dispatches the saved wake. | Zero signal sends; supported timer and authoritative reread recover. |
| Worker dies after business COMMIT, before engine checkpoint | Callback attempted again; owned receipt keeps one mutation. | Callback attempted again; owned receipt keeps one mutation. | Activity attempted again; owned receipt keeps one mutation. |
| Durable timer through restart | Short timer survives worker kill. | Short timer survives executor kill. | Five-second timer survives both Worker and full service kill. |
| Compatible update with pending approval | Stable named steps resume; old and new explicit versions can coexist. | Explicit compatible application version resumes; patching preserves old and new paths. | Patched Worker replays the old history and records the new patch on new runs. |
| Unsafe code update | Renaming a completed step under the same version executes its callback again. | Default source hash leaves old work pending; forced incompatible steps raise `DBOSUnexpectedStepError`. | Inserting an unpatched timer produces a nondeterminism failure; a compatible Worker restores progress. |
| Paused predecessor resumes after replacement | Old callback reaches the application; generation fence rejects its stale effect. | Old callback reaches the application; receipt and separate generation-fence probes protect acceptance. | Old activity reaches the application; receipt protects the same command. Generation fencing is not separately qualified here. |
| Cancel while waiting | No activation; an additional active-callback probe requires the feature cancellation cutoff. | Wait cancels, and late delivery plus restart does not activate. | Wait cancels and owned state remains cancelled. Active-activity cancellation is not qualified here. |
| Waiting processes and control progress | Fifteen parked waits release one worker slot. A separate twenty-run pending backlog delays an awakened control until all twenty finish. | Eighty waits remain live with bounded pools; two waiting workflows occupy a queue limit of two. A separate control queue progresses. | Eighty waits release workflow-task slots; a control workflow and cancellation progress with concurrency four. |
| Separate runtime migration authority | Separate setup migration; runtime `fromPool` skips migrations. Least-privilege database-role qualification remains open. | Actual runtime DDL denied while execution succeeds. | Actual service and Worker DDL denied after separate schema setup while execution succeeds. |
| Bounded history and maintenance | Hard limit of 1,000 total step attempts per run reached; no qualified continue-as-new path. | Explicit OSS history deletion works; automatic retention and safe indefinite history growth are not qualified. | Native history limits and Continue-As-New are documented; rollover and retention are not exercised in this spike. |

In every commit-gap probe, the one accepted business effect is guaranteed by the
**feature transaction and command receipt**. No engine turns an external,
non-idempotent action into exactly-once execution. A lease or activity timeout
also does not stop a paused process from resuming user code. AR fences and
provider idempotency remain necessary at their owning boundaries.

### OpenWorkflow: low setup cost, material process constraints

The [signals guide](https://openworkflow.dev/docs/signals) explicitly states
that a signal sent with no waiter is lost. The spike forced both the
read-before-wait race and a sender death after approval COMMIT. Supported durable
wait timeouts and fresh reads repaired both without a custom scheduler.

However, the [retry guide](https://openworkflow.dev/docs/retries) caps each run
at **1,000 total step attempts**. A fresh read plus a wait consumes at least two
attempts per polling round. The fixture's 250 ms polling interval would exhaust
that budget in roughly two minutes of uninterrupted waiting; this is a property
of that fixture interval, not a universal two-minute OpenWorkflow limit. A
longer interval trades wake latency for lifetime and still needs a finite bound.
The limit is per workflow run, not a limit of 1,000 agents.

A second spike used the supported persisted recurring scheduler to reconcile
finite workflows after an outage. It worked, so a repository-owned general
scheduler is not inherently required. The exact release rejects a recurring
schedule whose workflow specification includes a version with
`Recurring schedules require an unversioned workflow`. A stable unversioned
reconciliation entrypoint, versioned child routing, retention across many short
runs, and control admission would need their own qualification.

[Versioned workflow registration](https://openworkflow.dev/docs/versioning)
keeps incompatible versions separate. Missing old versions remain pending with
backoff. Stable step names matter: changing a completed step's name under the
same workflow version runs it again without an incompatibility rejection.

The backlog probe also showed ordinary pending runs being selected before an
already-due running control in the same namespace. Isolated namespaces or other
supported admission arrangements might address this, but are not qualified by
this result. Lower service count does not eliminate these integration duties.

### DBOS: credible lightweight alternative with explicit executor ownership

The [communication API](https://docs.dbos.dev/typescript/tutorials/workflow-communication)
retained early messages. The [recovery mechanism](https://docs.dbos.dev/production/workflow-recovery)
recovered a restarted local executor without Conductor. Recovery must match the
application, executor identity, and application version. The baseline therefore
requires one Supervisor-owned live executor per owning workflow application;
it does not prove automatic distributed takeover.

The [upgrade mechanism](https://docs.dbos.dev/typescript/tutorials/upgrading-workflows)
needs a deliberate product policy. A default workflow-source hash changed during
a compatible edit and left an old approval pending until the old code returned.
An explicit compatible application version and `DBOS.patch` both worked. Setting
one fixed version forever would remove a useful safety barrier; an incompatible
step insertion under that version failed in the negative control.

[Queue concurrency](https://docs.dbos.dev/typescript/tutorials/queue-tutorial)
counts waiting pending workflows, not just currently executing callbacks.
Two human approvals filled a limit-two queue and kept a third workflow enqueued.
A separate control queue restored progress. This must shape admission and cancel
handling; a low queue limit is not automatically a low active-agent limit.

OSS explicit history deletion worked while owned state and receipts survived.
This does not establish unattended retention, and deleting engine history can
remove engine-level deduplication. Feature receipt retention needs its own
policy. [Self-hosted Conductor](https://docs.dbos.dev/conductor/self-hosting/hosting-conductor)
is proprietary and normally checks its license online at startup; an air-gapped
arrangement requires vendor engagement. None of its recovery or retention
capabilities are credited to this OSS baseline.

### Temporal: stronger reuse, greater local lifecycle responsibility

The spike ran **the full native service** with PostgreSQL, default and visibility
schemas, and a separate TypeScript Worker. It did not use the
[SQLite embedded development server](https://docs.temporal.io/self-hosted-guide/embedded-server).
The [official 1.32.1 release](https://github.com/temporalio/temporal/releases/tag/v1.32.1)
contains Linux, macOS, and Windows native artifacts. The Windows archive was
checksum-verified and contains `temporal-server.exe` and `temporal-sql-tool.exe`.
The earlier contributor-guide WSL reference is not evidence that native Windows
Server distribution is absent.

Artifact availability is not execution or installer qualification. The SDK's
native bridge includes Windows x64 but no Windows ARM64 target; the selected
research PostgreSQL distribution likewise has a Windows x64 package. A Windows
ARM64 product needs an explicit supported architecture/emulation policy.

[Workflow versioning](https://docs.temporal.io/develop/typescript/workflows/versioning)
correctly distinguishes compatible patched histories from an unpatched
nondeterministic update. This is Worker-code compatibility only. It does not
prove server binary upgrades, schema rollback, or interrupted installation.

The local cost is concrete: a server process, Worker, two engine stores,
loopback endpoints, namespace management, migration authority, resources,
retention, and upgrade sequencing. The
[server upgrade guide](https://docs.temporal.io/self-hosted-guide/upgrade-server)
requires sequential minor upgrades rather than arbitrary skipped-version jumps.
Desktop users may skip several application releases, so the Supervisor must
execute and recover the required intermediate service/schema upgrades. Hiding
installation from the user does not remove this engineering obligation.

[History limits](https://docs.temporal.io/workflow-execution/limits) and
[Continue-As-New](https://docs.temporal.io/develop/typescript/workflows/continue-as-new)
provide a supported history-bounding strategy. Do not infer one unbounded
workflow for a whole organization or unlimited per-Run fan-out from that API.
The advantage here is a supported mechanism plus one engine family shared with
the hosted profiles, not unlimited execution history.

### Resource and scale interpretation

The saved samples include readiness, resident memory, database connections, and
control latency. They are single observations on a shared research machine with
PostgreSQL already running. Temporal's Worker includes development-time workflow
bundling. Downloads, migrations, database memory, production bundles, sustained
load, and operating-system lifecycle costs are not comparable in these samples.
Do not use them as a performance ranking or approved resource budget.

Eighty waiting workflows is useful admission evidence, not the accepted target
of thousands of simultaneously running agents. Agent count, workflow count,
active activities, per-Run fan-out, queue slots, and database connections need
separate budgets and load qualification.

## Required engine-independent boundary

Preserve ADR-0027 through the local choice:

- The feature owns approvals, process decisions, run identity, cancellation
  cutoff, generation, command receipts, and externally visible progress.
- A consumer-owned scheduling port expresses the feature's required start,
  wake, timer, and cancel semantics using application-owned values. A successful
  engine send is not an accepted business command or completed business action.
- The outbound engine adapter maps those requests to engine workflow IDs,
  messages, timers, and versions. The inbound Worker invokes owned idempotent
  application use cases. Engine SDK types, decorators, contexts, and history
  formats stay inside adapters and composition.
- Approval acceptance and its wake intent commit in the owning transaction.
  The feature outbox dispatches the wake idempotently. Where a candidate needs
  reconciliation, use supported durable engine mechanics against owned state;
  do not introduce a general repository scheduler or a cross-context transaction.
- Stable business command identity, cancellation cutoffs, and applicable fences
  protect retries, resumed predecessors, manual recovery, and engine replacement.
- Engine schema, migrations, credentials, resource pools, and history retention
  remain separate from owned business storage, even on the same PostgreSQL server.
- A shared contract fixture must assert business outcomes under the same fault
  schedule for each implemented adapter. Candidate SDK unit tests alone do not
  prove cross-profile parity.

Replaceability does **not** mean histories are portable or that engines can be
swapped automatically during an outage. Qualify either draining pinned old
versions, or explicit reconciliation from owned business checkpoints under one
mutation owner. Preserve public IDs, receipts, generations, and ambiguous
external outcomes. A generic workflow DSL or an emulated cross-engine replay
runtime is outside this proposal.

## Comparative engineering judgment

Higher reliability means expected robustness **after qualification**, higher
confidence means stronger present evidence, and higher complexity means harder
implementation and operations. These are judgment calls, not measured uptime,
benchmark scores, or commitments.

| Local candidate | Reliability / 10 | Confidence / 10 | Complexity / 10 | Integration lines | Test lines | Configuration lines |
| --- | --- | --- | --- | --- | --- | --- |
| Full native Temporal + PostgreSQL | 9 | 7 | 8 | 1,500–3,200 | 2,200–4,500 | 200–500 |
| DBOS OSS + PostgreSQL | 8 | 7 | 6 | 900–2,000 | 1,800–3,600 | 80–240 |
| OpenWorkflow + PostgreSQL | 7 | 6 | 7 | 1,100–2,400 | 2,200–4,200 | 80–240 |

The estimates cover one representative process adapter, its engine-specific
lifecycle integration, recovery/version handling, and tests. They exclude the
shared PostgreSQL/NATS/Dapr package, general Supervisor implementation, complete
product business features, external provider adapters, generated code, and vendor
binaries. The ranges have substantial uncertainty. Executed fixture line counts
are evidence size, not estimates of production completeness. Maintaining a
second engine adds recurring parity and upgrade work beyond initial line count.

Temporal leads because the demonstrated behavior fits the accepted hosted
architecture and avoids maintaining different durability semantics locally.
DBOS becomes preferable if a representative native package fails an approved
Temporal installation or resource budget and DBOS passes the remaining gates.
OpenWorkflow's simpler service topology currently comes with more feature-level
constraints, so it no longer leads this qualification order.

## Reproduce the research

The committed [native bootstrap](../../scripts/research/od035/bootstrap/run-native.ts)
creates a disposable native PostgreSQL cluster, runs one engine's actual
process fixture, and stops and removes its owned cluster. Run as a normal OS
user; PostgreSQL does not run as root. Node `24.21.0` is the repository's explicit
compatibility lane used by the native CI workflow. The original evidence records
its actual Node `24.19.0` execution separately.

```bash
pnpm install --frozen-lockfile --config.engine-strict=true --strict-peer-dependencies
pnpm research:od035:check
pnpm research:od035 openworkflow
pnpm research:od035 dbos
pnpm research:od035 temporal
```

The first install and Temporal artifact download require network access. The
engines run against local PostgreSQL without a cloud service; this is not an
offline signed-installer demonstration. Temporal release archives and migration
sources are checksum-pinned. Do not upload private generated server configuration
or database credentials. The
[native research workflow](../../.github/workflows/od035-native-research.yml)
runs each candidate on Linux, macOS, and Windows and retains only public JSON
results. POSIX `SIGSTOP` probes explicitly skip native Windows; the result is
not counted as passed there. The reviewed run above qualifies only its recorded
runtime combinations and fixture source; later source changes require new
execution evidence.

## Remaining production qualification gates

The selected candidate must pass these gates under the managed native product
lifecycle, not just the disposable process fixture:

1. The same owned business command trace across local and hosted adapters,
   including role transport, trusted scope, outbox delivery, cancellation races,
   stale generation fencing, and ambiguous external action outcomes.
2. Signed packaging, clean install, upgrade, uninstall, restricted OS users,
   port conflicts, restart, suspend/resume, and offline launch on every released
   OS/architecture. Native runtime CI alone does not prove those properties.
3. N/N-1 Worker histories and persisted state, missing old code, skipped desktop
   releases, interrupted service/schema upgrades, backup before destructive
   transitions, and an explicit supported rollback or restore procedure.
4. PostgreSQL process failure, contention, full disk, storage errors, corrupt
   or partial state, and verified backup/restore. Existing database detection
   in the research initializer is not an interrupted-migration recovery design.
5. Long timers and clock discontinuities; supported history rollover or finite
   process bounds; retention, receipt retention, manual recovery, and observability.
6. The accepted concurrent-agent target with separate per-Run and global budgets,
   bounded pools, control admission, resource use, and termination latency.
7. Dependency licensing and signed redistribution review, including the exact
   engine, SDK native bridge, PostgreSQL artifacts, and transitive notices.
8. An exit test that drains or reconciles persisted processes without changing
   public identities, losing authoritative state, or creating a second mutation
   owner. Reject an integration that requires a custom general recovery scheduler.

## Resolution

Open. Proceed with full native Temporal as the first production-qualification
candidate and retain DBOS OSS as the alternative. The research materially reduces
engine-semantic uncertainty, but does not accept a production dependency or
certify a Fully Local release. Resolve OD-035 through an owner-approved ADR after
the remaining target-specific evidence is available.
