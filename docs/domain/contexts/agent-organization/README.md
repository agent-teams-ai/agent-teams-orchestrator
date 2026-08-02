---
id: domain.contexts.agent-organization
type: bounded-context
status: proposed
owner: agent-organization
summary: Strategic model boundary for tenant-scoped organizations, semantic units, structures, and team placements.
blocked_by:
  - OD-023
related:
  - ADR-0044
  - ADR-0076
  - architecture.context-map
  - OD-023
---

# Agent Organization

## Domain vision

Provide stable, semantic organization of agent teams across projects without
absorbing team, task, runtime, budget, policy, or authorization ownership.

## Scope

### Owns

- tenant-scoped Organization identity and lifecycle;
- named OrganizationStructure identity and topology revision;
- semantic OrganizationalUnit identity, nesting, and lifecycle;
- project-qualified TeamPlacement references;
- typed organizational relationships and published structure facts.

### Does not own

- tenant/project identity;
- team identity, roster, roles, or runtime sessions;
- task, run, budget, approval, or policy lifecycle;
- access grants inferred from hierarchy.

## Initial Ubiquitous Language

- `Organization`: one tenant-owned organizational domain.
- `OrganizationStructure`: one named cycle-free containment view.
- `OrganizationalUnit`: semantic unit with stable identity and lifecycle.
- `TeamPlacement`: placement of an opaque project-qualified Team reference.
- `OrganizationRelationship`: typed non-containment relationship.
- `TopologyRevision`: concurrency version for structural mutation.

## Initial invariants

- an Organization belongs to exactly one Tenant;
- every placement references a Team in the same Tenant through its Project;
- containment is acyclic and a node has at most one parent per Structure;
- changing a Team does not mutate Team Topology state;
- hierarchy never grants security authority implicitly;
- stale structural mutations have no side effects.

Team activation may request placement through Agent Organization's narrow
application boundary. Placement outcome is independent from Team persistence and
Run admission; a placement failure never authorizes another context to delete or
mutate the Team.

## Open questions

OD-023 owns aggregate boundaries, move/archive workflows, relationship-type
governance, federation, restoration, closure indexes, and full concurrency traces.
The dossier remains proposed until the Full DDD acceptance gate passes.
