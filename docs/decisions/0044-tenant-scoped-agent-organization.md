---
id: ADR-0044
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: agent-organization
summary: Model Agent Organization as a tenant-scoped bounded context with semantic organizational units and project-qualified team placements.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - architecture.context-map
  - domain.contexts.agent-organization
  - OD-023
---

# ADR-0044: Tenant-Scoped Agent Organization

## Context

Agent teams must be organized above one project boundary. A department, delivery
group, review group, or cost center may coordinate teams from several projects and
may own stable responsibility, lifecycle, policy bindings, or references to
processes owned by other bounded contexts.

A project-scoped hierarchy would duplicate the same organization in each project
and make cross-project reporting, governance, and restructuring ambiguous. A
generic visual tree would lose the business identity and lifecycle of meaningful
groups.

## Decision

Create `Agent Organization` as a distinct tenant-scoped core bounded context.

- Tenant and Project Registry owns tenant and project identity. Agent Organization
  stores opaque local references and never becomes the tenant authority.
- An `Organization` belongs to exactly one tenant and may organize teams from many
  projects in that tenant.
- A team placement uses an opaque, project-qualified
  `TeamRef(projectId, teamId)`. Team Topology remains authoritative for team
  identity, roster, roles, and lifecycle.
- An `OrganizationalUnit` is a semantic domain subject when it has stable
  responsibility, lifecycle, policy bindings, process references, or downstream
  consumers. Units may be nested to arbitrary semantic depth, subject to explicit
  deployment safety limits.
- A presentation-only grouping may exist as a separate read or view concept, but
  it cannot silently acquire domain behavior. A product `Group` with business
  behavior is an `OrganizationalUnit`.
- One Organization may expose multiple named `OrganizationStructure` views for
  independently meaningful hierarchies. Containment inside each structure remains
  a cycle-free tree. Matrix relationships use another structure or explicit typed
  non-containment relationships rather than weakening containment into a generic
  graph.
- Organizational placement does not grant security authority implicitly. Access
  Control may consume explicitly published organization facts under a freshness
  and fail-closed contract.
- Tasks, runs, budgets, approvals, and policies remain owned by their bounded
  contexts and refer to an opaque organizational subject when needed.

OD-023 remains open for exact aggregates, relationship types, move/archive
semantics, federation, restoration, persistence indexes, and concurrency traces.

## Consequences

- Organization-wide structures, budgets, policies, and analytics can span
  projects without duplicating identity.
- Cross-project placement requires explicit authorization, visibility, deletion,
  and orphan-reconciliation rules.
- Team and organization lifecycles remain independent and integrate through
  Published Languages rather than cross-context foreign keys.
- The hierarchy model carries more invariants than a UI tree and requires
  serialized structural mutations, revisions, cycle checks, and replayable facts.
- Agent Organization can later be extracted as a service without moving Team
  Topology ownership.

## Rejected alternatives

- One independent organization hierarchy per project.
- Store mutable team names as organization identity.
- Treat every group as a presentation folder.
- Use one unrestricted graph for containment, matrix relations, and process links.
- Infer access grants from hierarchy without an explicit Access Control contract.
