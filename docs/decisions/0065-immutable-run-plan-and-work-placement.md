---
id: ADR-0065
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: run-orchestration
summary: Keep Run authority, immutable planning, participant activation, Work placement, and runtime execution as distinct consistency boundaries.
approved_by: product-owner
accepted_at: 2026-07-30
related:
  - ADR-0063
  - ADR-0067
  - architecture.public-control-contracts
  - architecture.runtime-boundary
  - domain.contexts.run-orchestration
  - domain.contexts.work-coordination
  - OD-005
  - OD-006
  - OD-013
---

# ADR-0065: Immutable Run Plan and Work Placement

The `CreateRun.readinessTarget` paragraph below is retained as decision history
and partially superseded by ADR-0067. The current contract separates durable
`CreateRun` completion from readiness observation and waiting.

## Context

Creating a Run, validating a plan, activating participants, placing Work, and
executing provider input do not share one consistency boundary. Combining them
inside one launch service or aggregate would reproduce the legacy provisioning
coupling, make partial failure difficult to reason about, and force a future
Temporal adapter to own business policy.

The public API also needs one clear meaning for `CreateRun`: durable acceptance
must not be confused with every participant becoming ready or an agent starting
its first provider operation.

## Decision

Use the following distinct models:

| Model | Owner | Purpose |
|---|---|---|
| `OrchestrationRun` | Run Orchestration domain | Small authority aggregate for Run lifecycle, current promoted plan, authority generation, cancellation, and outcome |
| `RunPlanVersion` | Run Orchestration domain artifact | Immutable validated plan containing topology reference, policy snapshot, requirements, and placement intent |
| `RunPlanTransitionProcess` | Run Orchestration application | Durable process state for staging, validating, and atomically promoting one plan version |
| `RunParticipant` | Run Orchestration domain | Stable product participant identity and role within the Run |
| `ParticipantActivation` | Run Orchestration domain | Product activation lifecycle for one participant under one promoted plan |
| `ManagedRuntimeBinding` | Run Orchestration domain | Product-side desired state and opaque references to AR execution capabilities |
| `WorkExecution` | Work Coordination domain | Business execution of Work, including its lifecycle and expected Work revision |
| `WorkPlacement` | Run Orchestration application | Durable placement of one `WorkExecution` onto an eligible Run participant |
| `RuntimeOperation` | AR | Provider-visible technical unit of input or work |

`RunPlanVersion` has identity and validation rules but is not a second mutable
authority aggregate. `OrchestrationRun` alone promotes a staged plan version by
compare and swap. Initial planning is the transition from no promoted plan to
version one. Replanning stages and validates a successor before atomic promotion.
Rolling migration of active placements is deferred; the default is staged
successor plus atomic promotion, with an explicitly quiesced fallback.

`CreateRun` is an asynchronous public command. Its acceptance transaction creates
the Run, feature-owned Operation, command receipt, and required outbox work. A
successful `CreateRun` Operation means that the requested Run reached its declared
creation target; it does not imply that all participants are ready or that Work
has reached a provider. The request declares its readiness target rather than
overloading one success state.

The normal lifecycle is:

```text
CreateRun accepted
  -> OrchestrationRun created
  -> RunPlanVersion staged and validated
  -> plan atomically promoted
  -> ParticipantActivation records created
  -> workspace, runtime-capability, and context requirements reconciled
  -> ManagedRuntimeBinding established through capability-specific AR ports
  -> participant readiness evaluated from product policy and runtime evidence
  -> WorkExecution accepted by Work Coordination
  -> WorkPlacement selects an eligible participant
  -> AR RuntimeOperation requested with stable effect identity
  -> runtime outcome observed
  -> Work Coordination receives a revision-checked business outcome command
```

The stages are independently observable and retryable. Lifecycle, readiness,
health, pending interaction, and completion assessment remain separate axes.
Runtime process liveness, runtime-session availability, context-application
receipt, pending technical permission, and product participant readiness are
different facts. Run Orchestration derives product readiness using the immutable
policy snapshot from ADR-0063; AR and provider adapters never decide it.

Work Coordination alone mutates Work and Task lifecycle. Run Orchestration owns
placement policy, participant eligibility, and placement recovery. It stores
opaque Work references and expected revisions rather than copying the Work
aggregate. AR alone creates and recovers `RuntimeOperation`; a public orchestrator
`Operation` and an AR `RuntimeOperation` are unrelated identities.

The initial implementation proves one vertical slice with SQLite, an in-process
scheduler, transactional outbox, fake AR, Connect, and the TypeScript SDK.
JetStream, Temporal, Centrifugo, PostgreSQL, A2A, and a real provider are added
through conformance slices after the core semantics pass without them.

## Consequences

- Responsibility follows domain invariants rather than launch-step order.
- A partial participant failure can degrade a Run without corrupting unrelated
  participants or Work.
- Temporal may schedule `RunPlanTransitionProcess` and placement reconciliation
  later without becoming the owner of Run state.
- More durable identities and process states are required, but each remains
  bounded and feature-owned.
- Exact readiness targets, replan migration policy, and compensation presets
  remain under OD-005, OD-006, and OD-013.

## Rejected alternatives

- One mutable `Run` aggregate containing plans, participants, Work, runtime
  sessions, and provider operations.
- A broad launch service that performs all steps synchronously.
- Let AR or a provider adapter decide product readiness and partial-failure
  policy.
- Let Run Orchestration mutate Task or Work lifecycle directly.
- Treat successful runtime process creation as successful `CreateRun`.
