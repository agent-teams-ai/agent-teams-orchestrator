---
id: OD-047
type: open-decision
status: resolved
owner: architecture/domain
summary: Define whether coordination is a Team role, a Run assignment, or a richer hierarchy with separately scoped powers.
resolved_by: ADR-0101
related:
  - ADR-0044
  - ADR-0063
  - ADR-0065
  - ADR-0076
  - ADR-0101
  - domain.contexts.team-topology
  - OD-006
  - OD-011
  - OD-026
  - OD-046
  - research.team-creation-legacy-capability-inventory-2026-08-27
  - research.team-participant-model-council-2026-08-27
---

# OD-047: Team Coordination Model

## Decision required

Decide where coordinator or lead intent lives, whether a coordinator is required,
whether multiple scoped coordinators are allowed, and whether communication,
work assignment, delegation, and escalation need separate relationships.

## Constraints

- A coordinator is an ordinary product participant, not a provider-specific
  parent process, subagent supervisor, principal, or AR runtime type.
- A role label or organizational position never grants product authority by
  itself. Each command is authorized by its owning capability.
- Work Coordination alone changes Work and assignment lifecycle. Agent
  Communication alone owns Conversation and recipient delivery.
- Active Run authority changes through an explicit successor plan and generation;
  a restarted or late runtime cannot regain retired powers.
- V1 uses at most one optional `roleKey` per Team member as a narrow classifier.
  This is an extension seam, not the final coordination model.

## Options

1. Team stores role and coordinator eligibility; each Run assigns coordinator
   responsibility to an ordinary `RunParticipant` with explicit scope. Three of
   four reviewers preferred this model because concurrent Runs can differ.
2. A Team version assigns a coordinator role and each Run pins that role; Run-only
   replacement arrives later. This is simpler and was preferred by the MVP
   reviewer, but may create pressure for hidden Run overrides.
3. Store a permanent `Team.leadParticipantId` or participant hierarchy. This is
   initially small but couples Team lifecycle to execution and provider topology.

## Acceptance criteria

- Decide coordinator cardinality for solo and multi-member Teams.
- Define eligibility, assignment scope, replacement, degradation, backup, and
  conflict behavior without granting authority through a string role.
- Separate the communication, work-assignment, delegation, and escalation graphs;
  define which may contain cycles.
- Decide whether multiple coordinators may hold non-overlapping scopes and how
  overlapping write scopes are rejected or coordinated.
- Define what happens to existing Work, conversations, messages, and late commands
  when the coordinator changes.
- Keep recursive hierarchy, election, quorum, and automatic failover outside MVP
  unless a concrete product scenario requires them.

## Resolution

Resolved by ADR-0101.

A Team version may name one ordinary default coordinator and a Run may replace
that selection. The effective coordinator is pinned in the immutable Run plan,
receives explicit coordination context and routing, and gains no authority merely
from the label. Multiple coordinators, hierarchy, election, quorum, and automatic
failover are deferred until a concrete product scenario requires them.
