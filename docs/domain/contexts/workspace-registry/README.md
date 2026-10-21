---
id: domain.contexts.workspace-registry
type: bounded-context
status: proposed
owner: workspace-registry
summary: Proposed model boundary for project workspace registration and binding generations.
blocked_by:
  - OD-011
related:
  - ADR-0062
  - architecture.context-map
  - OD-011
  - OD-019
---

# Workspace Registry

Proposed scope: project-scoped workspace registrations, binding generations,
location references, execution-workspace allocations, materialization lifecycle,
release, cleanup reconciliation, metadata, and lifecycle facts.

Git worktree, clone, snapshot, and remote-workspace mechanics belong to replaceable
outbound adapters. Trust decisions and runtime sandbox enforcement remain outside
this context. An `ExecutionWorkspaceAllocation` records normalized guarantees and
an opaque materialization reference, never a claim that a worktree is a sandbox.

## Presentation and execution-resource terminology

A frontend Workspace may select a Target and authorized Tenant/Project or save a
view. It does not own Tasks, Teams, organizational hierarchy, or access grants.
Those capabilities do not move into this technical context because they share a
screen label.

[OD-019](../../../open-decisions/OD-019-public-resource-identity-and-scope.md#collaboration-identity-and-workspace-presentation)
compares Execution Workspace and Execution Directory for this materialization
resource. The Directory candidate must retain opaque allocation identity and
normalized guarantees, including remote materializations; it must not expose an
arbitrary caller-supplied path as authority. Execution Environment risks confusion
with AR-owned processes, network policy, and sandbox enforcement.

The owner-requested rename remains undecided. Current ADR-0062 names
`WorkspaceRegistration` and `ExecutionWorkspaceAllocation` stay unchanged until
the specific terminology and any public migration are accepted. Registration,
allocation cleanup, and runtime isolation keep their separate owners throughout.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
