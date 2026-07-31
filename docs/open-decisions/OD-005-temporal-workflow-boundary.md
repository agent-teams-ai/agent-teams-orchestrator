---
id: OD-005
type: open-decision
status: open
owner: run-orchestration
summary: Select initial Run Orchestration workflows, worker topology, versioning, and reconciliation.
related:
  - ADR-0027
  - ADR-0067
  - architecture.extensions
  - domain.contexts.run-orchestration
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-005: Temporal Workflow Boundary

## Accepted constraints

ADR-0027 fixes Temporal as a replaceable Run Orchestration adapter. Business run
state remains authoritative in context persistence. Temporal client adapters
implement consumer-owned scheduling ports, Activity Workers invoke idempotent
application use cases, workflow code remains deterministic, and Temporal types do
not enter domain or application code.

The first official Temporal adapter and worker use the Temporal TypeScript SDK on
the repository's pinned Node.js baseline. A Go, Rust, or mixed-language workflow
worker is not the default and requires measured operational need plus a new ADR.
The exact worker process topology remains open.

## Decisions required

Define which concrete processes first become Temporal workflows and how their
activities, signals, queries, timers, workflow IDs, versioning, worker topology,
deployment, and reconciliation operate.

## Constraints

The selected design cannot change the ownership fixed by ADR-0027.

## Decision evidence

A Temporal Server and TypeScript SDK spike passed two independent 35/35 runs. It
proved worker process death and replay, timers, activity failure before and after
application commit, overlapping timeout retries, duplicate and stale signals,
product and workflow cancellation, late-completion fencing, bounded
continue-as-new histories, compatible workflow replay, pinned deployment routing,
and equivalence with the same in-process application command contract.

The evidence confirms:

- application persistence remains authoritative for business state;
- Temporal history is authoritative only for durable scheduling progress;
- the first workflow is one feature-specific Run Orchestration process manager,
  not a generic workflow engine;
- every mutating activity uses a stable application command ID, durable receipt,
  and expected revision;
- external clients use application APIs, not Temporal signals or queries;
- product cancellation and late-result fencing remain application behavior;
- representative history replay, pinned deployment routing, registration
  readiness, continue-as-new, and divergence reconciliation are mandatory.

`Worker.create()` did not prove that a pinned deployment build was registered in
the server. The first workflow start could return `FailedPrecondition`.
Deployment readiness therefore verifies build registration or retries an
idempotent start with the same stable workflow ID.

The retained `Temporal workflow boundary` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

Exact initial workflow state, signal schemas, history thresholds, retry budgets,
worker topology, rollout policy, HA or Cloud deployment, and reconciliation
operations remain unresolved.

## Current leading process matrix

The first in-process implementation should prove four independent feature-owned
process states:

- `RunPlanTransitionProcess`;
- `ParticipantActivationProcess`;
- `WorkPlacementProcess`;
- `RunClosureProcess`.

`ContextActivationProcess` is designed with Agent Context but may be implemented
in a later slice. `WorkPlacementProcess` is the leading first Temporal workflow
candidate because it proves cross-context commands, AR ambiguity, cancellation,
stale authority, and reconciliation without turning the whole Run into one
workflow.

There is no generic `RunWorkflow`, saga base class, business step DSL, or retry
engine. Shared scheduling infrastructure is limited to clocks, wake-up,
inbox/outbox, idempotency, dispatch records, ownership fencing, and deterministic
fixtures.

Application persistence remains authoritative for process state. An in-process
scheduler and Temporal may not coordinate the same process generation without a
scheduler-ownership fence.

ADR-0067 removes caller-specific readiness waits from process-manager ownership.
SDK `waitFor` observes a readiness snapshot and feed; it is not a Temporal or
in-process business workflow.

## Resolution

Open.
