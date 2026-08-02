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

## Resolution

Open.
