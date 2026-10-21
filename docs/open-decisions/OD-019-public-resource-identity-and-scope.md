---
id: OD-019
type: open-decision
status: open
owner: platform/control-api
summary: Define stable public resource identity and tenant, project, and workspace scoping.
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
  - domain.contexts.workspace-registry
  - research.pre-implementation-gate-critique-2026-07-30
---

# OD-019: Public Resource Identity and Scope

## Decision required

Define stable public identifiers and resource references for tenants, projects,
workspaces, teams, tasks, runs, messages, approvals, and runtime bindings;
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

A frontend **Workspace** may be a navigation or saved-view concept over the
selected Target and authorized Tenant/Project. That label creates no additional
isolation boundary, permission owner, Task store, or parent of Project identity.
Company and department structure belongs to the organizational model in OD-023.
If a later Workspace requires an independent lifecycle or scope, this decision
must define that need before it becomes a new resource.

The owner requested reconsideration of the technical execution-resource name.
ADR-0062 currently separates registration, materialization allocation, access and
consistency, and AR runtime isolation. The following alternatives concern naming
that filesystem materialization; they do not rename accepted IDs or expand its
authority. Selection, exact public names, and any migration remain open.

| Candidate | Meaning and tradeoff | Confidence /10 | Complexity /10 | Reliability /10 | Estimated production TS LOC |
|---|---|---|---|---|---|
| Execution Workspace | Retains the current broad name for shared, cloned, snapshot, and remote materializations; requires distinguishing frontend Workspace. | 9 | 2 | 9 | 0–200 |
| Execution Directory | Makes the filesystem purpose clearer; must still represent an opaque managed materialization, including remote views, rather than an arbitrary caller-supplied path. | 8 | 3 | 8 | 200–800 |
| Execution Environment | May suggest ownership of processes, network policy, or sandbox enforcement that remains AR-owned; requires a narrower definition to avoid that confusion. | 4 | 6 | 5 | 400–1,200 |

These are planning judgments, not measured reliability. The ranges cover bounded
handwritten TypeScript naming and adapter changes after selection, excluding UI,
tests, generated code, and implementation of the underlying workspace capability.
The range depends on which public surfaces exist at adoption. This documentation
change adds no production TypeScript and preserves `WorkspaceRegistration` and
`ExecutionWorkspaceAllocation` until a specific rename is accepted.

## Resolution

Open.
