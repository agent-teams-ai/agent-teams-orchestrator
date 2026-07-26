---
id: domain.contexts.index
type: index
status: active
owner: architecture/domain
summary: Index of proposed and accepted bounded-context domain dossiers.
related:
  - architecture.context-map
  - domain.modeling-standard
  - OD-011
---

# Bounded Context Dossiers

These dossiers are strategic domain artifacts, not package declarations. Every
context remains proposed until the Full DDD acceptance gate is satisfied.

| Context | Status | Dossier |
|---|---|---|
| Identity Registry | Proposed | [Identity Registry](identity-registry/README.md) |
| Access Control | Proposed | [Access Control](access-control/README.md) |
| Tenant and Project Registry | Proposed | [Tenant and Project Registry](tenant-project-registry/README.md) |
| Workspace Registry | Proposed | [Workspace Registry](workspace-registry/README.md) |
| Team Topology | Proposed | [Team Topology](team-topology/README.md) |
| Work Coordination | Proposed | [Work Coordination](work-coordination/README.md) |
| Run Orchestration | Proposed | [Run Orchestration](run-orchestration/README.md) |
| Agent Communication | Proposed | [Agent Communication](agent-communication/README.md) |
| Policy and Risk | Proposed | [Policy and Risk](policy-risk/README.md) |
| Approval Management | Proposed | [Approval Management](approval-management/README.md) |

## Dossier rule

Use the [bounded-context template](../../templates/bounded-context.md) and
[Full DDD modeling standard](../modeling-standard.md). Add an artifact only after
discovery produces real language, invariants, scenarios, or ownership evidence.

When a context package is created, this dossier remains its strategic entry point
and links to package and feature documentation. It must not duplicate colocated
implementation details.
