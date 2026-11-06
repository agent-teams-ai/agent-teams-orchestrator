---
id: ADR-0116
type: adr
status: accepted
owner: run-orchestration
summary: Select full native Temporal for Fully Local behind engine-independent owned ports while retaining release qualification gates.
approved_by: product-owner
accepted_at: 2026-10-23
related:
  - ADR-0027
  - ADR-0060
  - ADR-0091
  - ADR-0093
  - ADR-0114
  - ADR-0115
  - architecture.deployment-profiles
  - architecture.extensions
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - architecture.reliability
  - architecture.testing
  - domain.contexts.run-orchestration
  - OD-005
  - OD-021
  - OD-035
  - OD-040
---

# ADR-0116: Native Temporal for Fully Local Durable Workflows

## Context

ADR-0115 requires native Fully Local in V1 alongside Managed SaaS and Standalone
Self-Hosted. ADR-0027 already makes Temporal a replaceable Run Orchestration
execution adapter. The remaining choice was whether local operation should use
the same engine family or introduce a different PostgreSQL-backed engine.

The product owner explicitly approved the researched recommendation and its
recording as an accepted ADR on 2026-10-23. This record resolves OD-035's engine
selection; it does not claim that the native product is implemented or qualified.

### Retained research

The complete [OD-035 research dossier](../open-decisions/OD-035-local-durable-workflow-engine.md#executed-research-on-2026-10-23)
retains the comparison, reproduction commands, primary sources, estimates, and
limitations. Its [immutable pre-adoption snapshot](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/ac15a5437407f4a561b311afcbcea1e9e1208e22/docs/open-decisions/OD-035-local-durable-workflow-engine.md)
records the recommendation before this approval. The [evidence manifest](../research/evidence/od035-2026-10-23/manifest.json)
and [native matrix](../research/evidence/od035-2026-10-23/native-ci/matrix.json)
preserve exact source and result hashes, original JSON, and explicit skips.

Three parallel GPT-6.1 `xhigh` candidate investigations and cyclic peer review
compared OpenWorkflow 0.11.0, DBOS OSS 5.3.0, and full Temporal Server 1.32.1 with
TypeScript SDK 1.24.0. The [corrected native CI run](https://github.com/agent-teams-ai/agent-teams-orchestrator/actions/runs/39988635688)
executed all three candidates on Linux, macOS, and Windows. Temporal matched
eleven assertions on Linux, eleven on macOS, and ten on Windows with one
explicit POSIX suspension-probe skip. These are component end-to-end findings,
including expected negative controls, rather than comparable reliability scores.

The evidence demonstrates full native Temporal execution with PostgreSQL,
persisted timers through Worker and service death, receipt-protected retries,
compatible patch replay, incompatible replay rejection, and continuing control
progress with parked workflows. It does not establish complete product E2E,
signed installation, safe upgrades, history maintenance, or production capacity.

## Decision

### Selected engine and profile composition

Use the **full native Temporal Service backed by PostgreSQL** for durable
workflow execution in Fully Local V1. Local and hosted profiles use the Temporal
engine family behind their owned adapters. The local implementation requires
neither a cloud account nor Docker, WSL, or a manually operated database. The
SQLite development server and an in-memory scheduler are not production local
implementations.

The Local Supervisor owns availability, binary staging, protected endpoints,
resource custody, bounded restart, and activation of the admitted native
components. Temporal schema setup and upgrade run through the engine adapter
with explicit migration authority; ordinary service and Worker credentials do
not acquire that authority. Context-owned business schemas, migrations, and
transactions retain their existing owners. Temporal execution history is stored
separately from authoritative business state.

Keep the accepted service-role boundaries. The research Worker process does not
select a new business-service topology or one Worker per Agent. OD-005 owns the
first production workflow, exact versioned contracts, Worker placement, and
reconciliation design. Shared Temporal infrastructure does not make Run
Orchestration the owner of other bounded contexts' process managers.

The exercised versions are evidence pins, not a perpetual production version
policy. Each release must identify and qualify its exact engine, SDK, Node,
PostgreSQL, native artifact, and operating-system combination. The research's
PostgreSQL 18.4 execution is not an upstream support certification.

### Independence from the engine

Consumer-owned application ports express the required scheduling capabilities
using owned values and explicit failure semantics. Domain and application code,
public SDKs, and product contracts import no Temporal, DBOS, or OpenWorkflow
types. Engine clients, Workflows, Activities, history formats, native identifiers,
and versioning APIs remain in adapters and composition.

Owning features retain business process state, approval consequences, command
identity and receipts, cancellation cutoffs, generations, retries, escalation,
compensation, reconciliation, and externally visible progress. Workflow history
is authoritative only for engine execution progress. Workflow definitions invoke
idempotent application use cases without duplicating aggregates or invariants.

Product commands commit through ordinary application inbound ports. Business
state and the applicable notification intent commit in the owning transaction;
outbox delivery and feature reconciliation close the gap before an engine wake.
Cross-context notifications retain their published contracts and separate
transactions. An engine acknowledgement is not a business command receipt.
Application receipts and applicable ownership fences protect repeated attempts
and resumed predecessors. External effects require their own idempotency or
explicit unknown-outcome reconciliation; engine retries cannot provide
exactly-once external execution.

Local and hosted compositions reuse the owned business implementations, public
identities, PostgreSQL migrations, and behavioral conformance suite. Profile
selection changes infrastructure and lifecycle at composition, without local
business-rule branches. Shared command scenarios must prove equivalent owned
outcomes under duplicate notification, crash, cancellation, and upgrade.

Replacement must preserve authoritative state and public identities through
qualified drain, reconciliation, and a fenced handoff with one mutation owner.
It does not promise portable engine histories, automatic cross-engine failover,
or cross-Target synchronization. Do not introduce a generic workflow DSL,
unowned workflow package, or custom general recovery scheduler to implement
this boundary. Feature-owned outbox delivery and reconciliation remain required.

### Implementation and release obligations

OD-035 is resolved by this selection. OD-005, OD-021, and OD-040 retain their
separate unresolved scope. The reserved local packages remain deferred until
their exact implementation-start policy is satisfied. ADR-0103's bounded sandbox
admission remains unchanged. Selecting this engine does not materialize a
production package, qualify a deployment, or relax the mandatory V1 profiles.

The selected implementation must meet these binding qualification conditions:

1. Shared local/hosted business conformance through the actual role transports,
   trusted scope, outbox, cancellation cutoffs, stale-generation fencing, and
   ambiguous external outcomes, including active work during cancellation.
2. Signed native install, update, uninstall, offline launch, protected endpoints,
   restricted users, port conflicts, suspend/resume, and restart for every
   released OS/architecture and supported hardware class.
3. Representative N/N-1 histories, safe patching and old Worker availability,
   sequential supported Temporal server/schema upgrades when users skip Desktop
   releases, interrupted upgrades, and a verified rollback or restore procedure.
4. PostgreSQL failure, disk exhaustion, storage errors, contention, and actual
   backup/restore with separate migration and runtime authority.
5. Long timers and clock changes; measured Continue-As-New thresholds, bounded
   history and retention, receipt retention, observability, and manual recovery.
6. Measured local resource budgets and the accepted concurrent-agent target on
   the applicable profile, with bounded pools, separate control admission, and
   bounded cancellation and shutdown latency. Parked waits are not active-agent
   load qualification.
7. Redistribution and notices for the exact engine, SDK bridge, database, and
   transitive native artifacts, plus a dependency-exit test preserving one
   mutation owner and authoritative state.

These are implementation and release conditions, not reasons to leave the
engine selection unresolved. Deployment qualification remains blocked under the
existing ADR-0091/0093 and OD-039 framework until its evidence is available.

## Consequences

- One engine family reduces semantic differences between hosted and local
  workflow execution while preserving an explicit replacement boundary.
- Temporal's demonstrated replay safeguards and supported execution mechanisms
  are preferred over additional engine-specific recovery and history policies.
- Fully Local carries a separate native service, schema lifecycle, resource
  overhead, and a more demanding installer and updater. Those costs must be
  measured on supported hardware rather than inferred from a CI snapshot.
- Engine independence requires owned conformance and exit evidence. It does not
  require implementing or maintaining a second production engine now.
- Historical accepted ADRs remain unchanged. This record extends ADR-0027,
  ADR-0114, and ADR-0115 by resolving their explicitly deferred local choice.

## Rejected alternatives

- **DBOS OSS with PostgreSQL:** credible lighter alternative, with demonstrated
  buffered messages and recovery without Conductor. It adds a second engine's
  version, executor, queue-admission, and history-maintenance policies. It is
  not selected as a simultaneous default or automatic fallback. If Temporal
  cannot meet an agreed installation or resource budget, reconsider DBOS through
  an explicitly accepted successor ADR and qualified migration.
- **OpenWorkflow with PostgreSQL:** a possible fit for explicitly bounded
  processes, but the measured lost early signals, step-attempt cap, recurring
  version restriction, replay behavior, and control admission impose additional
  constraints for this orchestrator.
- **Temporal development server or custom local engine:** neither satisfies the
  selected full-service lifecycle and qualification contract. A custom generic
  scheduler would create another recovery protocol to maintain.
- **Direct domain coupling or portable-history promises:** coupling sacrifices
  ownership and replacement; history translation and automatic engine failover
  are unqualified mechanisms outside this decision.
