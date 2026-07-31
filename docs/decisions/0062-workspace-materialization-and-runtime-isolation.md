---
id: ADR-0062
type: adr
status: accepted
owner: architecture/domain
summary: Separate execution-workspace materialization from runtime security isolation and compose them through explicit requirements.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - ADR-0003
  - architecture.runtime-boundary
  - architecture.security
  - domain.contexts.workspace-registry
  - OD-011
---

# ADR-0062: Workspace Materialization and Runtime Isolation

## Context

A Git worktree reduces accidental source conflicts between concurrent
participants. It does not restrict filesystem access, processes, network access,
credentials, hooks, shared Git metadata, caches, or operating-system authority.
Calling a worktree a sandbox would create a false security guarantee.

The orchestrator must support shared directories, Git worktree implementations,
clones, snapshots, remote workspaces, containers, and stronger isolation without
encoding every combination in one growing enum or coupling Run Orchestration to
Git.

## Decision

Model four independent concerns:

```text
WorkspaceRegistration
ExecutionWorkspaceAllocation
WorkspaceAccessAndConsistency
RuntimeIsolationRequirement
```

`WorkspaceRegistration` identifies a project workspace and its versioned binding.
It never grants trust, access, or runtime authority.

`ExecutionWorkspaceAllocation` is the durable Workspace Registry resource that
allocates a usable workspace view for one declared sharing scope. It records
normalized guarantees, lifecycle, opaque materialization reference, source
binding generation, and cleanup state. Its lifecycle is independent from an AR
runtime session. It is a separate aggregate from `WorkspaceRegistration` because
allocation generation, lease, concurrent provisioning, release, and cleanup have
their own consistency boundary.

`WorkspaceAccessAndConsistency` carries orthogonal requirements such as
read-only versus read-write, live versus pinned snapshot, and shared-allowed
versus change-isolated. It does not select a security sandbox.

`RuntimeIsolationRequirement` describes the security properties required by
Policy and Risk, such as filesystem scope, process isolation, network policy,
capability limits, and required attestation. It never requests a Git worktree by
name.

Responsibility is explicit:

- Workspace Registry owns registration, binding generations,
  `ExecutionWorkspaceAllocation`, materialization lifecycle, release, and cleanup
  reconciliation.
- Run Orchestration requests an allocation satisfying normalized requirements and
  stores only its opaque reference in participant process state.
- Access Control decides whether the actor may use the registered workspace.
- Policy and Risk decides trust classification and required allocation and
  runtime-isolation properties, then evaluates returned evidence.
- A workspace outbound adapter implements materialization mechanics. Git
  worktree, clone, snapshot, and remote-workspace implementations are replaceable
  adapters, not domain entities.
- AR owns runtime sandbox, mount, process, filesystem, network, and capability
  enforcement. It returns provider-neutral enforcement observations or an
  isolation attestation without importing Workspace Registry aggregates.

The composition root validates that selected workspace and AR adapters can jointly
satisfy the requested guarantees. A worktree may be used inside a sandbox, but
neither is inferred from the other. If a required guarantee cannot be enforced,
participant activation fails before provider execution.

Durable product state records normalized guarantees and opaque references rather
than filesystem paths, process IDs, container IDs, or Git implementation details.
Adapter kind may appear in protected diagnostics, but it is not authority.

Cleanup uncertainty remains owned by Workspace Registry. A Run may close while an
allocation cleanup case continues, but a possibly live writable allocation cannot
be silently reused until reconciliation proves it safe.

## Consequences

- Worktree support cannot be mistaken for a security boundary.
- Git, snapshot, container, VM, and remote-workspace implementations remain
  replaceable.
- Run Orchestration coordinates references without owning workspace or sandbox
  state.
- Capability negotiation must validate supported combinations before activation.
- Workspace cleanup and runtime cleanup have separate durable outcomes.

## Rejected alternatives

- One `isolationMode` enum containing worktree, sandbox, container, and VM.
- Put Git worktree creation inside Run Orchestration.
- Let AR own workspace registration or Git materialization lifecycle.
- Treat a separate checkout as proof of filesystem or process isolation.
- Store raw paths or container identifiers as cross-context authority.
