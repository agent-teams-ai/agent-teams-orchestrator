---
id: OD-044
type: open-decision
status: resolved
owner: team-topology
summary: Define how reusable Agent Profiles and inline definitions become members of immutable Team versions.
resolved_by: ADR-0100
related:
  - ADR-0100
  - ADR-0076
  - domain.contexts.team-topology
  - OD-006
  - OD-011
  - research.team-creation-legacy-capability-inventory-2026-08-27
  - research.team-participant-model-council-2026-08-27
---

# OD-044: Reusable Agent Profile Membership

## Decision required

Choose how a Team member refers to a reusable agent definition and how an inline
member may be saved for reuse without making Team creation an ambiguous compound
mutation.

## Constraints

- `AgentProfileId` is a product identity owned by Team Topology. It is not a
  principal, Team membership, Run participant, runtime profile, or AR session.
- Team versions are immutable. Editing a reusable profile cannot silently change
  an existing Team or active Run.
- Provider, model, binary path, credentials, CLI arguments, runtime binding, and
  process state remain outside Team Topology.
- One Team member has its own membership identity even when another Team member
  references the same reusable profile.
- `CheckTeamDraft` remains deterministic and side-effect-free. It cannot create,
  load, authorize, or persist a profile.
- Saving a reusable profile and creating a Team cannot pretend to be one atomic
  cross-aggregate operation.

## Options

1. Create a versioned `AgentProfile` resource and let a Team member reference an
   exact immutable profile version. An inline definition remains possible, and
   `Save and link` is a separate observable command. This is the leading option.
2. Keep only live `AgentProfileId` references and always use the latest profile.
   This is simpler but would make immutable Team versions change indirectly.
3. Treat a saved profile only as a template copied inline into each Team. This
   gives deterministic Teams but loses shared identity and upgrade provenance.

## Acceptance criteria

- Define `AgentProfile`, profile version, Team member, and inline definition in
  the Team Topology Ubiquitous Language.
- Define project or tenant scope, authorization actions, archive, retention, and
  behavior of already pinned references.
- Decide whether the same profile may appear more than once in one Team.
- Define exact Team-local fields and profile-owned fields.
- Define typed outcomes for save succeeded / Team failed, stale profile revision,
  archive between preview and commit, and unauthorized references.
- Prove that the model does not import runtime-owned configuration or create a
  new Participant Catalog bounded context without evidence.

## Resolution

Resolved by ADR-0100.

The user-facing Agent is a persistent, versioned resource. A Team version pins
an exact Agent definition version, one Agent has at most one current Team
assignment, and copy creates a new identity. Saving an inline Agent and linking
it remain separate observable commands. Exact aggregate boundaries and public
resource scope remain under OD-006, OD-011, and OD-019.
