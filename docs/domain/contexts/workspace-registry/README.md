---
id: domain.contexts.workspace-registry
type: bounded-context
status: proposed
owner: workspace-registry
summary: Proposed model boundary for project Execution Directory registration, allocation, and binding generations.
blocked_by:
  - OD-011
related:
  - ADR-0062
  - ADR-0111
  - architecture.context-map
  - OD-011
  - OD-019
---

# Workspace Registry

Proposed scope: project-scoped Execution Directory registrations
(`WorkspaceRegistration`), binding generations, location references, execution
allocations (`ExecutionWorkspaceAllocation`), materialization lifecycle, release,
cleanup reconciliation, metadata, and lifecycle facts.

Mechanics for shared directories, Git worktrees, clones, snapshots, and remote
filesystem views belong to replaceable outbound adapters. Trust decisions and
runtime sandbox enforcement remain outside this context. An
`ExecutionWorkspaceAllocation` records normalized guarantees and an opaque
materialization reference, never a claim that a worktree is a sandbox.

## Presentation and execution-resource terminology

A frontend Workspace remains the navigation or saved-view label over a selected
Target and authorized Tenant/Project. It does not own Tasks, Teams,
organizational hierarchy, or access grants. Those capabilities do not move into
this technical context because they share a screen label.

[ADR-0111](../../../decisions/0111-human-collaboration-and-execution-directory-terminology.md)
selects Execution Directory as the technical filesystem resource term, including
shared, cloned, snapshot, and remote materializations. It retains opaque identity
and normalized guarantees rather than treating an arbitrary caller-supplied path
as authority. It does not require a local directory or imply ownership of
AR-managed processes, network policy, or sandbox enforcement.

ADR-0062 names `WorkspaceRegistration`, `ExecutionWorkspaceAllocation`, and
`WorkspaceAccessAndConsistency` stay unchanged, as do this context's identity,
owner, and catalog paths. Registration, allocation cleanup, and runtime isolation
keep their separate owners. [OD-019](../../../open-decisions/OD-019-public-resource-identity-and-scope.md#collaboration-identity-and-workspace-presentation)
still owns exact public resource spelling, scope representation, and any API,
package, code, or persisted-state rename or migration. The terminology selection
does not admit implementation or complete this dossier's discovery gate.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
