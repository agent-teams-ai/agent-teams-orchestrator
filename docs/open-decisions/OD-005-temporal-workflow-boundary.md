---
id: OD-005
type: open-decision
status: open
owner: run-orchestration
summary: Select initial Run Orchestration workflows, worker topology, versioning, and reconciliation.
related:
  - ADR-0027
  - architecture.extensions
  - domain.contexts.run-orchestration
---

# OD-005: Temporal Workflow Boundary

## Accepted constraints

ADR-0027 fixes Temporal as a replaceable Run Orchestration adapter. Business run
state remains authoritative in context persistence. Temporal client adapters
implement consumer-owned scheduling ports, Activity Workers invoke idempotent
application use cases, workflow code remains deterministic, and Temporal types do
not enter domain or application code.

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

## Resolution

Open.
