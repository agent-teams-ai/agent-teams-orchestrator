---
id: OD-023
type: open-decision
status: open
owner: agent-organization
summary: Refine Agent Organization aggregates, relationships, lifecycle, persistence, and concurrency semantics.
related:
  - ADR-0044
  - ADR-0111
  - architecture.context-map
  - OD-011
  - domain.contexts.team-topology
  - OD-019
  - OD-048
---

# OD-023: Agent Organization Detailed Model

## Decision required

Define exact aggregate boundaries, commands, events, relationship-type governance,
move/archive/delete/restore semantics, federation, persistence indexes, and
concurrency/recovery behavior inside the ADR-0044 strategic boundary.

## Accepted baseline

ADR-0044 establishes:

- Agent Organization is a tenant-scoped bounded context;
- an Organization may place project-qualified Team references from that tenant;
- semantic Groups are OrganizationalUnits with stable identity and lifecycle;
- an Organization may expose multiple named, cycle-free structures;
- matrix semantics use another structure or typed non-containment relationships;
- Team Topology, the configured product authority provider, and process-owning
  contexts retain their authority.

## Confirmed constraints

- Organization hierarchy is semantic product state, not a UI-only tree.
- A group that owns responsibility, policy bindings, process references, or an
  independent lifecycle is a domain subject, not a presentation folder.
- Hierarchy supports arbitrary semantic nesting while deployments may enforce
  explicit safety limits for depth, size, and mutation cost.
- Team Topology remains authoritative for teams and memberships. Agent
  Organization stores opaque, scope-qualified team references.
- Containment must reject direct, indirect, and concurrent cycles.
- Organizational placement does not implicitly grant security permissions.
- Structural mutations require explicit optimistic concurrency and idempotency.
- `PrincipalId`, `AgentProfileId`, organization-node identity, team identity, and
  runtime identity remain separate namespaces.

## Model under refinement

The accepted strategic model uses a tenant-scoped `Organization` with one or more
named `OrganizationStructure` trees. A semantic `OrganizationalUnit` has stable identity
and lifecycle and may contain child units and `TeamPlacement` references. A
presentation-only `GroupingNode` is optional and must never acquire hidden domain
behavior. Matrix organization is represented by multiple structures or explicit
typed relationships, not by weakening containment into an unrestricted graph.

Exact aggregate and transaction boundaries remain open until the required
scenarios are event-stormed.

## Growth from one team to company structures

The product direction supports a small team first, then companies, departments,
and nested organizational teams without requiring a new layer for every size.
A default view may show one Project and its Team directly. Existing Organization,
Structure, Unit, and TeamPlacement concepts support later organization-wide views
over project-qualified Teams; they do not require nested Tenants or duplicate
Task, Team, Project, or permission authorities.

The terms describe different responsibilities:

| Term | Meaning and owner |
|---|---|
| Customer organization | Platform's customer relationship; it is not automatically an Orchestrator Organization or IAM organization. |
| Tenant | Isolation and lifecycle scope supplied by the configured authority and mapped to stable Orchestrator scope identity. It is not a department or navigation folder. |
| Organization, Structure, Unit | The accepted tenant-scoped semantic organization model: company structures, departments, and matrix relationships. Exact human membership bindings remain open. |
| Project | Operational scope for Teams, Tasks, Runs, and workspace resources. Their owning contexts keep lifecycle authority. |
| Operational Team | Saved collaboration composition owned by Team Topology; an organizational placement does not recursively expand its roster. |
| Frontend Workspace | Navigation or a saved view over an authorized Target and Tenant/Project, under OD-019. |
| Execution Directory | Selected technical term for the registered and allocated filesystem resource owned by Workspace Registry under [ADR-0111](../decisions/0111-human-collaboration-and-execution-directory-terminology.md); exact public API spelling and any migration remain open under OD-019. |

One Platform customer organization may already own several Tenants under
[Platform ADR-0007](https://github.com/agent-teams-ai/agent-teams-platform/blob/83d761b84e23bb6d1e9c446f3666951e94fa90d8/docs/decisions/0007-platform-strategic-context-map-and-first-project-management-slice.md).
Those customer ownership constraints do not make every company, department,
semantic Organization, IAM group, or deployment the same resource. The complete
binding model remains an explicit cross-system design. No new Employee or human
Organization aggregate is accepted by this vocabulary map.

An organizational unit called a team may contain other units and Team placements.
This does not make an operational Team contain another Team or recursively
expand its executable roster. That alternative changes Team versions, duplicate
Agent checks, coordinator selection, and Run snapshots and requires a separate
decision with [OD-048](OD-048-mixed-human-and-ai-team-participation.md).

| Model under consideration | Confidence /10 | Complexity /10 | Reliability /10 | Estimated production TS LOC |
|---|---|---|---|---|
| Existing units and project-qualified Team placements | 9 | 5 | 9 | 2,500–6,000 |
| Recursive operational Team rosters | 4 | 8 | 6 | 5,000–12,000 additional to base Team/Run support |

These judgments estimate one bounded hierarchy/placement slice or the additional
recursive-roster behavior. They exclude UI, tests, generated code, federation,
and base service infrastructure; exact aggregate boundaries may change the cost.
The existing units/placements model is the lean candidate. Tactical acceptance
still requires the scenarios below and does not follow from a view label.

Mixed teams retain separate human principal and Agent identities. ADR-0111
accepts human membership in several Teams; OD-048 retains the exact membership
contracts and qualification. The current Agent one-Team invariant is unchanged.
Cross-organization collaboration, especially
across Tenants or authority realms, remains future work here: no shared aggregate,
implicit access inheritance, or cross-tenant transfer is admitted by this direction.

A future guest collaboration requires explicit target-scope authority under the
owning policy. Membership plus bounded grants is a candidate for standalone
collaboration; its exact guest contract remains open. Platform's accepted
organization-owned Tenant semantics require both membership and Tenant access.
Guest access alone does not establish federation, cross-installation identity,
shared lifecycle, or cross-tenant Work execution. The
[collaboration research](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md)
preserves the alternatives and related Platform constraints.

## Required scenarios

- concurrent moves of the same subtree;
- moving a unit beneath its descendant;
- cross-project team placement in a tenant organization;
- team archival, project archival, and orphaned placements;
- organization archival with active runs, tasks, budgets, and approvals;
- one team represented in multiple structures;
- permissions whose evaluation depends on organization facts;
- import of the legacy graph with ambiguous or missing identities;
- federation between independently governed organizations;
- a single-Team view grows into department structures without changing Team identity;
- an organizational team label never silently expands an operational Run roster.

## Acceptance criteria

- the Ubiquitous Language distinguishes Organization, Structure, Unit, Group,
  Placement, Relationship, Team, Project, and Tenant;
- every lifecycle and invariant has exactly one owner;
- hierarchy mutations have transaction, revision, ordering, and recovery rules;
- security consumers define freshness and fail-closed behavior;
- SQLite and PostgreSQL persistence strategies preserve identical semantics;
- event-storming examples cover the required scenarios before package creation.

## Resolution

Open.
