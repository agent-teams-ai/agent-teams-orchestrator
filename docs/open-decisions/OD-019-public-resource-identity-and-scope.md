---
id: OD-019
type: open-decision
status: open
owner: platform/control-api
summary: Define stable public resource identity and tenant, project, and Execution Directory scoping.
related:
  - ADR-0015
  - ADR-0017
  - ADR-0020
  - ADR-0023
  - ADR-0079
  - ADR-0080
  - ADR-0071
  - architecture.sdk-transports
  - domain.contexts.orchestration-scope
  - OD-012
  - OD-048
  - ADR-0062
  - ADR-0111
  - domain.contexts.workspace-registry
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-019: Public Resource Identity and Scope

## Decision required

Define stable public identifiers and resource references for tenants, projects,
Execution Directories, teams, tasks, runs, messages, approvals, and runtime bindings;
determine which scope is explicit in paths or requests; and define how clients
select and validate authorization context.

## Constraints

- every team, task, run, message, and runtime binding is project-scoped;
- external Platform or standalone authority IDs, stable Orchestrator scope IDs,
  and AR runtime IDs remain separate namespaces joined by explicit bindings;
- public identity is not reconstructed from filesystem paths, process IDs,
  provider session names, or display names;
- authorization context is explicit and cannot be changed by request payload
  ambiguity;
- identifiers remain transport-neutral and language-neutral;
- SDK convenience defaults cannot weaken hosted tenant isolation.
- public identities are opaque strings and resource names express tenant/project
  ownership hierarchy;
- public ETags are opaque and do not expose aggregate or database revisions;
- page tokens and operation names remain scoped to the resource hierarchy.
- an Operation name is server-generated and carries opaque kind, route, and
  server identity components without exposing database keys or requiring a
  central Operation write registry;

## Current leading first-slice resources

```text
project scope
  runs
    participants
  workExecutions
  operations
```

`Run`, public `Operation`, and `WorkExecution` are independent resources.
Participants are run-scoped read-only resources with independent pagination.
Plan transitions, activation processes, runtime bindings, Work placements, and AR
runtime operations remain private implementation concepts.

`WorkExecution` remains project-scoped so placement may move between Runs without
changing business identity. Operations are feature-owned and exposed through a
composition-owned static routing facade rather than a central repository.

ADR-0080 already fixes stable non-reusable `OrchestrationTenant` and
`OrchestrationProject` identities plus private Project-level
`RuntimeScopeBinding` ownership. This open decision selects their public resource
representation and whether bindings receive any public surface; it cannot move
identity authority or binding lifecycle to a transport, SDK, or Run aggregate.

## Collaboration identity and Workspace presentation

The product direction includes mixed human and AI teams and human manual Tasks.
[OD-048](OD-048-mixed-human-and-ai-team-participation.md) owns the remaining
membership, assignment, and Run participation choices. Public references must
distinguish a human principal, Agent, Team member, Task assignee, Run participant,
and AR runtime identity. An Agent profile or display name cannot mint a principal;
Team membership alone does not grant permission. Exact reference shapes remain
open here with the authority-provider contract in OD-012.

The frontend keeps **Workspace** as its navigation or saved-view label over the
selected Target and authorized Tenant/Project. That label creates no additional
isolation boundary, permission owner, Task store, or parent of Project identity.
Company and department structure belongs to the organizational model in OD-023.
If a later Workspace requires an independent lifecycle or scope, this decision
must define that need before it becomes a new resource.

[ADR-0111](../decisions/0111-human-collaboration-and-execution-directory-terminology.md)
records the owner's selection of **Execution Directory** for the technical
filesystem resource. It includes shared directories, worktrees, clones, snapshots,
and remote filesystem views. Its identity remains opaque; the term does not make
an arbitrary caller-supplied path authoritative or require a local directory.

ADR-0062 continues to separate registration, materialization allocation, access
and consistency, and AR runtime isolation. `WorkspaceRegistration`,
`ExecutionWorkspaceAllocation`, and `WorkspaceAccessAndConsistency` retain their
existing names and meanings. Workspace Registry retains registration,
materialization, release, and cleanup ownership; AR retains runtime enforcement.
The selected term does not add a security guarantee or merge those lifecycles.

Exact public resource spelling, reference shapes, scope representation, and any
API, package, code, or persisted-state rename or migration remain open. The
terminology decision admits no implementation. The earlier naming comparison is
preserved in the [research record](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md#workspace-and-task-views).

## Resolution

Partially resolved: ADR-0111 selects Execution Directory for the technical
resource and retains Workspace for the UI. Public identity and scope contracts,
exact API spelling, and any migration remain open.
