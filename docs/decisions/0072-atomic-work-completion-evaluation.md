---
id: ADR-0072
type: adr
status: accepted
owner: work-coordination
summary: Evaluate one immutable Work completion candidate atomically while keeping Work Coordination as the sole terminal authority.
approved_by: product-owner
accepted_at: 2026-07-31
related:
  - ADR-0025
  - ADR-0066
  - domain.contexts.work-coordination
  - OD-027
---

# ADR-0072: Atomic Work Completion Evaluation

## Context

Work may require execution settlement, typed evidence, dependency satisfaction,
review, product approval, or an authorized manual decision before it succeeds.
Those facts can arrive late, be duplicated, refer to superseded artifacts, or
race cancellation and rework.

Putting every review round and gate update inside the Work aggregate creates a
contention hotspot and unbounded history. Letting a process manager decide
completion moves business invariants into scheduler code and would give local and
Temporal implementations different authority. Creating a separate evaluation
eventually would leave an avoidable gap because Work and its completion
evaluation belong to one bounded context and persistence boundary.

## Decision

Work Coordination remains the only authority that commits a terminal Work
outcome. ADR-0066 still decides terminal races: the first valid revision-checked
terminal commit wins.

A published `CompletionPlanRevision` contains only registered, versioned typed
gate definitions and named routes. User JavaScript, arbitrary workflow steps, and
an unrestricted Boolean DSL are prohibited. Presets such as manual, reviewed,
approved, and verified automatic completion are configurations of the same gate
catalog.

`RequestWorkCompletion` pins the exact plan revision and constructs an immutable
completion candidate containing at least:

```text
completionEpoch
completionBasisRevision
candidateDigest
artifact revision or digest
CompletionPlanRevision
```

`completionBasisRevision` changes only when completion-relevant Work facts
change. Display metadata, labels, or unrelated projection changes do not
invalidate an evaluation.

When the plan contains only transaction-local pure gates, Work Coordination may
use a synchronous fast path. It evaluates the same policies and atomically
creates the same immutable `WorkResolutionRecord` without manufacturing an empty
long-running evaluation.

When any gate requires asynchronous or multi-step evidence, one
`CompletionEvaluation` aggregate is created for one immutable candidate.
`WorkItem.activeCompletionEvaluationRef` and the new evaluation are persisted in
the same context-scoped Unit of Work. There is no eventual interval in which one
exists without the other.

`CompletionEvaluation` owns:

- pinned candidate and plan identities;
- required gate instances and accepted typed facts;
- readiness, rejection, withdrawal, expiry, and supersession;
- revision checks and decision references.

It does not own reviewer assignment, approval policy, runtime settlement,
artifact content, or raw evidence. Those remain with their current or future
authorities. Work Coordination consumes narrow typed facts through consumer-owned
ports and ACLs. This does not accept Review Management as a bounded context.

A feature-owned process manager owns only delivery obligations, timers, retries,
child command IDs, and reconciliation cursors. It cannot mark an evaluation ready
or complete Work by itself.

Finalization loads and checks Work and its active evaluation in one transaction,
using a stable lock or CAS order of `WorkItem` followed by
`CompletionEvaluation`. It verifies epoch, basis revision, candidate digest, plan
revision, active reference, and readiness; marks the evaluation applied; commits
the Work terminal transition; creates the immutable resolution record; and
appends outbox records atomically.

One evaluation represents one immutable candidate. Material rework supersedes
the old evaluation and creates a new one. Reopening terminal Work increments
`completionEpoch`; stale facts and evaluations can remain audit evidence but
cannot mutate the reopened Work.

Manual override is an explicit typed decision against a gate that can be waived
gate. It never fabricates a review or approval outcome and cannot bypass tenant
scope, authorization, idempotency, terminal-state, revision, or candidate
integrity checks. Raw logs, agent text, LLM confidence, and sampled telemetry are
not sufficient completion evidence.

## Consequences

- Work terminal authority and concurrency remain deterministic.
- Async evidence and review traffic do not make WorkItem an unbounded hotspot.
- Local scheduling and future Temporal workflows coordinate the same domain
  commands instead of reimplementing completion policy.
- The synchronous path remains ergonomic for simple manual Work.
- Candidate digests, retention, gate invalidation, and two-aggregate transaction
  tests add implementation cost.
- Review Management and Automation and Scheduling remain open strategic
  candidates without packages or package-catalog entries.

## Rejected alternatives

- Keep all completion rounds and gate progress as entities inside WorkItem.
- Let a process manager or Temporal workflow decide business completion.
- Create CompletionEvaluation eventually through an integration event.
- Treat runtime completion, board columns, review state, or agent text as Work
  terminal authority.
- Require a long-running evaluation for a transaction-local manual completion.
