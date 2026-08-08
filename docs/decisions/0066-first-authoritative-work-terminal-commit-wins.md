---
id: ADR-0066
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: work-coordination
summary: Resolve concurrent Work completion and cancellation by the first valid terminal commit in Work Coordination.
approved_by: product-owner
accepted_at: 2026-07-30
related:
  - ADR-0065
  - domain.contexts.work-coordination
  - OD-013
  - OD-032
---

# ADR-0066: First Authoritative Work Terminal Commit Wins

## Context

Completion evidence and a cancellation command may race while an agent, client,
broker, or runtime is disconnected. Provider timestamps, broker delivery order,
and observer arrival order cannot provide one reliable cross-system ordering.

Letting cancellation always override completion would make terminal Work mutable.
Letting a provider timestamp decide would transfer business authority to AR or an
external provider. A configurable race policy would multiply terminal semantics
before a proven product requirement exists.

## Decision

Work Coordination is the only authority that commits the terminal business state
of `WorkExecution`. The first valid revision-checked terminal commit wins:

```text
completion commits first
  -> WorkExecution is completed
  -> later cancellation is too late

cancellation commits first
  -> WorkExecution is cancelled
  -> later completion cannot reopen or complete it
```

Every completion and cancellation command has a stable idempotency identity and
expected Work revision. Repeating the same command returns its retained outcome.
A different terminal command after the winning commit returns a typed
already-terminal or too-late outcome with a safe reference to the authoritative
result.

Provider occurrence times, client clocks, JetStream sequence, and message arrival
order remain evidence only. They never override the Work Coordination commit
order.

A completion observed after cancellation is retained as immutable late-outcome
evidence under the owning retention and disclosure policy. It may support audit,
review, reconciliation, or an explicit successor command, but it does not mutate
the terminal `WorkExecution`.

Cancellation fences new placement effects before technical cleanup is requested.
AR cancellation acknowledgement, failure, or outcome-unknown affects cleanup and
health evidence, not the already committed Work terminal state. Compensation, if
the business requires it, is a new explicit idempotent command rather than a
rollback of the winning commit.

## Consequences

- Completion and cancellation races are deterministic under retries, delayed
  observations, process restarts, and at-least-once delivery.
- Work terminal state is monotonic and owned by one bounded context.
- Late provider work may still consume resources after business cancellation, so
  fencing and technical reconciliation remain mandatory.
- Clients must handle typed too-late outcomes rather than assuming cancellation
  always succeeds.
- A future alternative policy requires a new ADR and explicit public contract
  versioning.

## Rejected alternatives

- Cancellation always wins, including after committed completion.
- Provider or source timestamps decide the race.
- Broker ordering decides the race.
- A configurable race policy in the first version.
- A distributed transaction between Work Coordination, Run Orchestration, and AR.
