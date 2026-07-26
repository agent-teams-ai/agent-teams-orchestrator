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
  - architecture.sdk-transports
  - OD-012
---

# OD-019: Public Resource Identity and Scope

## Decision required

Define stable public identifiers and resource references for tenants, projects,
workspaces, teams, tasks, runs, messages, approvals, and runtime bindings;
determine which scope is explicit in paths or requests; and define how clients
select and validate authorization context.

## Constraints

- every team, task, run, message, and runtime binding is project-scoped;
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

## Resolution

Open.
