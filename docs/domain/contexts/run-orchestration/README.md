---
id: domain.contexts.run-orchestration
type: bounded-context
status: proposed
owner: run-orchestration
summary: Proposed model boundary for durable execution coordination and recovery policy.
related:
  - architecture.context-map
  - architecture.runtime-boundary
  - OD-005
  - OD-006
  - OD-013
---

# Run Orchestration

Proposed scope: orchestration-run lifecycle, desired execution plans, business
checkpoints, retry, escalation, completion, compensation, runtime bindings, and
desired-versus-observed reconciliation. Technical execution remains owned by
`ar`.

The accepted context relationship keeps a feature-owned
`WorkExecutionProcessManager` here. It owns Run-to-Work process policy and stores
references, expected Work revisions, checkpoints, and process state. Work
Coordination remains the only owner of Task or Work lifecycle. Reliable messages
do not authorize either context to infer the other's policy.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
