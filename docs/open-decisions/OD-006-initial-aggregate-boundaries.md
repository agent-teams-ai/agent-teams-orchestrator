---
id: OD-006
type: open-decision
status: open
owner: architecture/domain
summary: Validate initial aggregate and consistency boundaries using concrete invariants and concurrency.
related:
  - ADR-0065
  - ADR-0079
  - ADR-0080
  - domain.modeling-standard
  - domain.contexts.orchestration-scope
  - OD-011
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-006: Initial Aggregate Boundaries

## Decision required

Validate candidate boundaries:

- `Team` versus `TeamRoster`;
- `Project` versus `WorkspaceRegistration`;
- `Task` versus dependency-graph ownership;
- `TaskSubscription` and work-execution process ownership;
- durable handoff identity, acceptance, rejection, supersession, deadline, and
  concurrency boundaries;
- Task-scoped discussion and comment growth/concurrency boundaries;
- Task-to-OrchestrationRun cardinality, retry authority, and late completion;
- remaining internal invariants of `OrchestrationRun`, immutable
  `RunPlanVersion`, `ParticipantActivation`, and `ManagedRuntimeBinding` after
  ADR-0065;
- active Run behavior when the referenced Team topology version changes;
- `Conversation`, append-only message records, audience snapshots, membership,
  subscriptions, per-recipient delivery, and inbox projections;
- `ApprovalRequest` versus reusable approval or grant state;
- feature-specific durable process-manager state;
- the exact consistency splits among `OrchestrationTenant`,
  `OrchestrationProject`, `ProjectAdmissionAuthority`, `RuntimeScopeBinding`,
  and `OrchestrationProjectDispositionProcess` after ADR-0080.

## Constraints

Boundaries must follow invariants, consistency, lifecycle, and concurrency rather
than nouns or folders. Avoid aggregates requiring global locks or unbounded
collections.

ADR-0065 already fixes the cross-context ownership:

- `OrchestrationRun` is the Run authority aggregate;
- plan versions are immutable and promoted by durable application process state;
- Work Coordination owns `WorkExecution`;
- Run Orchestration owns `WorkPlacement`;
- AR owns `RuntimeOperation`.

ADR-0080 separately fixes Orchestration Scope as the sole owner of stable
orchestration tenant and Project identity, coarse admission, Project-level
runtime bindings, and whole-Project disposition coordination. This decision may
split those responsibilities into focused aggregates and features, but cannot
move them back to Run Orchestration or recreate Tenant and Project Registry.

This decision cannot reopen those owners. It still validates exact entity,
aggregate, repository, and concurrency boundaries inside each owner.

OD-026 owns the strategic distinction among conversations, notifications, alerts,
and runtime delivery. This decision validates tactical aggregates only after that
ownership boundary is resolved.

Work handoff remains a typed Work Coordination concept rather than a Conversation
message or runtime command. Candidate data includes source and target, reason,
summary, priority, expected outcome, `contextRefs`, `artifactRefs`, deadline,
acceptance policy, provenance, and revision. This list is a discovery contract,
not an accepted aggregate shape.

## Current leading Run matrix

| Model | Leading tactical role |
|---|---|
| `OrchestrationRun` | Small aggregate root with no participant, activation, Work, runtime, or history collections |
| `RunPlanVersion` | Immutable domain artifact |
| `RunPlanTransitionProcess` | Application process state that requests a separate revision-checked Run promotion |
| `RunParticipant` | Run-scoped aggregate candidate for one concrete occupant |
| `ParticipantActivationProcess` | Application process state for one participant and plan generation |
| `ManagedRuntimeBinding` | Opaque application integration record, not imported AR state |
| `WorkExecution` | Work Coordination aggregate root |
| `WorkPlacementProcess` | Run-owned application process state |
| `RuntimeOperation` | AR aggregate outside this repository |

The unresolved proof is the exact repository, containment, cardinality, and
transaction boundary for `RunParticipant`, activation, and runtime-binding
records. No process manager may atomically persist its own state and another
aggregate. It commits a dispatch intent and invokes a revision-checked command in
a later local transaction.

## Resolution

Open.
