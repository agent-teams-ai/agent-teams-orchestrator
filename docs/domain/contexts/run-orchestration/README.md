---
id: domain.contexts.run-orchestration
type: bounded-context
status: proposed
owner: run-orchestration
summary: Proposed model boundary for durable execution coordination and recovery policy.
blocked_by:
  - OD-005
  - OD-006
  - OD-013
related:
  - ADR-0063
  - ADR-0064
  - ADR-0065
  - ADR-0067
  - architecture.context-map
  - architecture.runtime-boundary
  - OD-005
  - OD-006
  - OD-013
---

# Run Orchestration

Proposed scope: `OrchestrationRun` authority, immutable `RunPlanVersion`
artifacts, `RunPlanTransitionProcess`, resilience-policy snapshots, Run
participants and activation, `ManagedRuntimeBinding`, business checkpoints,
retry, escalation, completion, compensation, Work placement, and
desired-versus-observed reconciliation. Technical execution remains owned by
`ar`.

ADR-0065 fixes the following consistency boundaries:

- `OrchestrationRun` is the small authority aggregate;
- `RunPlanVersion` is an immutable validated artifact;
- `RunPlanTransitionProcess` stages and promotes plan versions;
- `RunParticipant` is stable product identity while `ParticipantActivation`
  tracks one activation lifecycle;
- `WorkPlacement` is feature-owned durable application process state in this
  context;
- `WorkExecution` and all Task or Work lifecycle changes remain in Work
  Coordination;
- `RuntimeOperation` remains in AR.

`WorkPlacement` stores opaque Work references, expected revisions, participant
and binding references, checkpoints, and process state. It never copies the Work
aggregate. Reliable transport does not authorize either bounded context to infer
the other's policy.

The creation path is staged rather than one synchronous launch:

```text
CreateRun
  -> promote validated RunPlanVersion
  -> activate participants and establish runtime bindings
  -> place accepted WorkExecution
  -> request AR RuntimeOperation
  -> reconcile outcome back to Work Coordination
```

Runtime liveness, context application, pending interaction, participant
readiness, Run health, and completion assessment are independent facts.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
