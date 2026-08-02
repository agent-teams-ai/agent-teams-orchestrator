---
id: OD-023
type: open-decision
status: open
owner: agent-organization
summary: Refine Agent Organization aggregates, relationships, lifecycle, persistence, and concurrency semantics.
related:
  - ADR-0044
  - architecture.context-map
  - OD-011
  - domain.contexts.team-topology
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

## Required scenarios

- concurrent moves of the same subtree;
- moving a unit beneath its descendant;
- cross-project team placement in a tenant organization;
- team archival, project archival, and orphaned placements;
- organization archival with active runs, tasks, budgets, and approvals;
- one team represented in multiple structures;
- permissions whose evaluation depends on organization facts;
- import of the legacy graph with ambiguous or missing identities;
- federation between independently governed organizations.

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
