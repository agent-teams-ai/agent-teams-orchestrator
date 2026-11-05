---
id: domain.contexts.policy-risk
type: bounded-context
status: proposed
owner: policy-risk
summary: Proposed model boundary for trust, execution policy, risk, and limits.
blocked_by:
  - OD-011
  - OD-012
related:
  - architecture.context-map
  - OD-011
  - OD-012
  - OD-032
---

# Policy and Risk

Proposed scope: workspace trust decisions, execution and tool policy, risk
classifications, capability-profile selection, limits, and auditable policy
evaluations. Runtime enforcement remains owned by `ar`.

Dangerous actions will require product approvals. Risk and automation decisions
remain separate from the approval lifecycle and evidence owned by
[Approval Management](../approval-management/README.md). [OD-032](../../../open-decisions/OD-032-last-mile-side-effect-safety.md#deferred-dangerous-action-approval-research)
owns the deferred approval and dispatch research; this dossier does not select
approvers, mandate human approval for every action, or accept an enforcement
mechanism.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
