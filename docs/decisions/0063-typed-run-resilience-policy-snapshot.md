---
id: ADR-0063
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: run-orchestration
summary: Use an immutable typed policy snapshot for Run activation, continuity, completion, and participant replacement.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - domain.contexts.run-orchestration
  - domain.contexts.team-topology
  - OD-005
  - OD-006
  - OD-013
---

# ADR-0063: Typed Run Resilience Policy Snapshot

## Context

A single `continueOnPartialFailure` flag cannot describe whether a participant is
required for initial readiness, may be lost after activation, contributes to
success, may be replaced, or belongs to a quorum. Encoding those concerns in one
Run state would also mix lifecycle, readiness, health, and terminal outcome.

Run behavior must remain deterministic after policy configuration changes and
must not be inferred independently by clients, adapters, or workflow engines.

## Decision

Every accepted immutable Run plan revision carries one immutable
`RunPolicySnapshot` composed of narrow value objects:

```text
ActivationPolicy
ContinuityPolicy
CompletionPolicy
ReplacementPolicy
```

The snapshot contains normalized product policy, policy decision references, and
the schema version required to evaluate it. It contains no Temporal, AR, provider,
transport, or database types. A policy change affecting an active Run requires an
explicit replan and a successor immutable plan revision; historical evaluations
keep their original snapshot. OD-006 still decides the exact aggregate boundary
and final names for `OrchestrationRun` and its plan revisions.

Each planned participant or quorum group has a typed `ParticipantRequirement`
covering independent dimensions:

```text
activation: required | optional
continuity: required | degradable
completion: required-for-success | contributing
replacement: same-slot | eligible-backup | manual-only
```

Product presets may produce these values, but `lite`, `standard`, `strict`,
`continueOnPartialFailure`, and similar convenience labels never become the
domain model.

Run Orchestration is the sole owner of policy evaluation and Run consequences.
Team Topology supplies versioned participant and role facts. Policy and Risk may
authorize or constrain selectable policy, but it does not transition a Run.
Temporal or an in-process scheduler invokes idempotent Run Orchestration commands
and cannot reinterpret the snapshot.

The model keeps separate observations:

- lifecycle: whether the Run is being created, active, closing, or closed;
- readiness: whether activation requirements are satisfied;
- health: current healthy, degraded, or failed evidence;
- completion assessment: whether required outcomes satisfy completion policy.

A participant failure updates participant state and Run health. It changes Run
readiness, continuity, or completion only through the corresponding policy
evaluation. Unrelated healthy participants continue unless a typed policy outcome
issues their cancellation.

Technical reattach or restart of the same product participant remains the same
`RunParticipant` with a successor runtime-binding generation. A new product retry
after terminal participant activation creates a successor
`ParticipantActivation`. Replacement of one role by another participant requires
policy authorization and an explicit Run replan when product topology changes.

## Consequences

- Partial failure no longer depends on scattered booleans or adapter behavior.
- Optional participants may fail while the Run remains usable and visibly
  degraded.
- Exact product defaults, quorum presets, compensation actions, and topology
  migration remain decisions under OD-013.
- Policy snapshots and plan versions add storage and migration cost.
- Tests can evaluate the same policy fixtures against in-process and Temporal
  scheduling.

## Rejected alternatives

- One `continueOnPartialFailure` boolean.
- One Run enum combining lifecycle, readiness, health, and outcome.
- Let each provider adapter decide whether participant failure is fatal.
- Re-evaluate active Runs against mutable current policy without explicit replan.
