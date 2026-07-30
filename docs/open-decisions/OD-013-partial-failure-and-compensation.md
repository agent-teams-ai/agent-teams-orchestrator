---
id: OD-013
type: open-decision
status: open
owner: run-orchestration
summary: Define policy for partial launch, stale completion, lost ownership, and compensation.
related:
  - ADR-0066
  - ADR-0065
  - ADR-0063
  - domain.contexts.run-orchestration
  - domain.contexts.work-coordination
  - domain.contexts.agent-communication
  - OD-032
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-013: Partial Failure and Compensation

## Decision required

Define orchestration behavior when one team member fails to start, one runtime lane
loses ownership, a message is accepted but not observed, or a task completes after
cancellation.

## Constraints

One participant failure must not automatically stop unrelated participants unless
explicit product policy requires it. Outcomes and compensation must be durable and
idempotent.

The ownership and reliability mechanism are no longer open:

- every Run plan version carries the immutable typed policy snapshot selected by
  ADR-0063;
- activation, continuity, completion, and replacement are independent policy
  dimensions;
- lifecycle, readiness, health, and completion assessment are not one state enum;
- participant requirements distinguish activation, continuity, completion, and
  replacement semantics;
- Work Coordination alone changes Task or Work lifecycle;
- Work Coordination owns `WorkExecution`; Run Orchestration owns feature-specific
  `WorkPlacement` process state for Run-to-Work policy;
- the process manager stores references, expected revisions, and process state,
  not a copied Work aggregate;
- each bounded context commits local state, inbox or receipt, and outbox in its
  own Unit of Work;
- compensation is a durable idempotent command, not a distributed rollback;
- unrelated participants continue unless explicit product policy issues their
  stop or cancel commands.

A three-run crash matrix passed 168/168 checks with real process restart before
and after every durable publish, inbox, domain commit, acknowledgement, reply, and
compensation boundary. A choreography-only comparison remained delivery-safe but
created two compensation policy owners, confirming that transport reliability
does not solve responsibility ownership.

The retained `Cross-context process manager` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

## Remaining product decisions

- compensatable Work types and exact compensating actions;
- fail-fast, isolate, continue, quorum, and participant-stop propagation;
- timeout, retry-budget, unknown-outcome, and operator-escalation rules;
- replan after stale Work revision and active-Run topology changes;
- terminal Run reopening versus successor Run.

OD-032 owns the general last-mile safety and ambiguous external-effect model.
This decision remains responsible for Run-specific continuation, compensation,
and participant policy rather than defining one shared action-execution
aggregate.

The current leading rules are:

- ADR-0066 fixes that the first valid Work Coordination commit decides completion
  versus cancellation, while later evidence remains auditable;
- one `WorkExecution` has one current placement in v1, and replacement creates a
  successor placement;
- terminal Run state is immutable, so renewed work uses a successor Run;
- business outcome may become terminal while bounded technical cleanup continues
  in a separately observable process;
- an unknown external outcome enters reconciliation and never triggers blind
  retry.

The remaining rules follow accepted authority and failure-isolation constraints
unless a future product requirement reopens them through a new decision.

## Resolution

Open.
