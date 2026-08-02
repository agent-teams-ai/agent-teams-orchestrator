---
id: domain.contexts.team-topology
type: bounded-context
status: proposed
owner: team-topology
summary: Proposed model boundary for agent-team composition, roles, and roster invariants.
blocked_by:
  - OD-006
  - OD-011
related:
  - ADR-0076
  - architecture.context-map
  - OD-006
  - OD-011
---

# Team Topology

Proposed scope: project-scoped teams, members, roles, declared capabilities,
topology versions, and roster invariants. Tasks and runtime processes remain
outside this context.

Team Topology owns create-only, clone, and template-instantiation capabilities.
It does not own organizational placement or Run activation. The Run
Orchestration `team-activation` feature may request Team creation through a
narrow application boundary but never imports or mutates the Team aggregate
directly.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
