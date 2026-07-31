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
---

# Workspace Registry

Proposed scope: project-scoped workspace registrations, binding generations,
location references, execution-workspace allocations, materialization lifecycle,
release, cleanup reconciliation, metadata, and lifecycle facts.

Git worktree, clone, snapshot, and remote-workspace mechanics belong to replaceable
outbound adapters. Trust decisions and runtime sandbox enforcement remain outside
this context. An `ExecutionWorkspaceAllocation` records normalized guarantees and
an opaque materialization reference, never a claim that a worktree is a sandbox.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
