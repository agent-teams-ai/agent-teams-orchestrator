---
id: OD-045
type: open-decision
status: resolved
owner: run-orchestration
summary: Decide whether one Agent Profile may participate concurrently through isolated instances in multiple Teams and Runs.
resolved_by: ADR-0101
related:
  - ADR-0062
  - ADR-0063
  - ADR-0065
  - ADR-0079
  - ADR-0100
  - ADR-0101
  - OD-006
  - OD-011
  - OD-024
  - OD-044
  - research.team-creation-legacy-capability-inventory-2026-08-27
  - research.team-participant-model-council-2026-08-27
---

# OD-045: Concurrent Agent Profile Use

## Decision required

Decide whether one saved `AgentProfileId` may be referenced by multiple Teams and
active Runs at the same time, and which state must be isolated for every concrete
Run participant.

## Constraints

- Sharing a product definition never authorizes sharing one runtime session,
  process, cancellation scope, mutable context, or writable workspace.
- A Run pins immutable Team, profile, policy, and configuration facts.
- One AR runtime session belongs to at most one independent Run under ADR-0079.
- Cancellation, recovery, late events, usage, and billing attribution must remain
  scoped to the concrete Run participant and runtime effect.
- A pure Team draft check cannot inspect active Runs or guarantee exclusivity.

## Options

1. Allow a shared logical profile with independent Team memberships and isolated
   Run participants, runtime bindings, sessions, context, conversations, and
   workspaces. This is the leading option.
2. Clone or fork the profile when adding it to every Team. This isolates changes
   but creates identity and configuration drift.
3. Allow only one active Run per profile through a durable exclusive lease. This
   blocks legitimate parallel use and requires fencing, expiry, and recovery.

## Acceptance criteria

- Define the identity chain from profile version through Team membership, Run
  participant, activation, runtime binding, and opaque AR session.
- Define default isolation for context, conversation, mutable memory, credentials,
  workspace, cancellation, observation, and usage attribution.
- Define profile update, archive, access revocation, and credential revocation
  behavior for active Runs.
- Define project and tenant sharing limits and whether the same profile may occupy
  more than one slot in one Team.
- Prove that cancellation or cleanup of Run A cannot affect Run B merely because
  both reference the same profile.

## Resolution

Resolved by ADR-0100 and ADR-0101.

The product owner explicitly selected a simpler identity model than the council
recommendation: one Agent has at most one current Team assignment and one active
Run occupancy. A similar concurrent worker is an explicit copy with a new
identity and separate statistics. Runtime bindings, context, workspace,
cancellation, and observations remain isolated per concrete Run participant.
