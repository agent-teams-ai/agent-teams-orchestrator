---
id: ADR-0101
type: adr
status: accepted
owner: run-orchestration
summary: Keep saved Team changes separate from immutable Run snapshots, select an ordinary coordinator per Run, and prevent one Agent from occupying multiple active Runs.
approved_by: product-owner
accepted_at: 2026-08-27
related:
  - ADR-0063
  - ADR-0065
  - ADR-0067
  - ADR-0076
  - ADR-0079
  - ADR-0100
  - domain.contexts.run-orchestration
  - domain.contexts.team-topology
  - OD-004
  - OD-006
  - OD-013
  - OD-045
  - OD-046
  - OD-047
---

# ADR-0101: Run-specific Rosters, Coordination, and Exclusive Agent Occupancy

## Context

A saved Team and one concrete Run have different lifecycles. Users need both a
permanent Team edit and a temporary "only for this Run" change. They also want a
default coordinator that can be replaced for one Run, and a simple human-like
rule that the same Agent cannot work in two active Runs simultaneously.

Recalculating an old Run from a mutable Team would prevent exact replay. A
lease-only busy flag would be unsafe after a controller crash or an ambiguous AR
start: expiry would permit a second Run while the first provider process might
still be alive. Coordinator status also cannot become a hidden authorization or
provider hierarchy.

## Decision

Run Orchestration owns the effective participant set, coordinator selection,
activation, and exclusive active occupancy for each Run.

Every `RunPlanVersion` contains:

- the exact source Team version;
- a typed normalized overlay for Run-only exclusions, replacements, and an
  optional coordinator override;
- the fully materialized effective roster with stable `RunParticipantId` values
  and exact Agent definition versions;
- a coordinator selection whose source is `TEAM_DEFAULT`, `RUN_OVERRIDE`, or
  `NONE`.

The materialized snapshot is execution authority; the overlay explains user
intent. Starting a Run never mutates the saved Team. A later "apply these changes
to Team" action is a separate Team Topology command with an ETag, visible result,
and no cross-context transaction.

A replacement candidate cannot be assigned to another Team and cannot already
occur elsewhere in the effective roster. An unassigned Agent may be used only for
that Run without silently creating saved membership. Exact candidate and
authorization rules are checked again at admission. A stale, archived, missing,
or already occupied Agent returns a typed conflict; the system never falls back
to another Agent silently.

Each Team version may name zero or one ordinary Team member as its default
coordinator. A Run may select another enabled member before admission. A later
replacement, when implemented, creates and promotes a successor
`RunPlanVersion`; it never rewrites history. The coordinator remains an ordinary
participant and affects only explicit product coordination:

- receives the overall Run objective and allowed coordination context;
- is the primary recipient for unassigned-work, blocking, and coordination
  attention that requires one Agent;
- may request assignment, reassignment, handoff, cancellation, or approval only
  through the owning typed capability and only with a separate valid grant;
- is the default destination for Team-addressed cross-Team coordination;
- is identified in UI and read projections so coordination outcomes can be
  measured without treating message count as productivity.

Coordinator selection alone grants no access, approval, cancellation, secret,
runtime, process, or impersonation authority. It does not make other Agents
children, forbid peer-to-peer communication, transfer existing Work ownership,
or let the coordinator complete another Agent's Work. Exact Work, Conversation,
Approval, and authorization commands remain owned by their bounded contexts.

Before any AR start request, Run Orchestration acquires one durable occupancy per
effective Agent. Database uniqueness on the canonical Agent reference guarantees
at most one unreleased occupancy. The occupancy records Run, participant,
activation, plan and authority generation, stable command identities, revision,
state, and only opaque runtime references.

Occupancy is not a timeout lease:

- controller heartbeat expiry only permits another worker to continue recovery
  of the same occupancy;
- pause, degraded state, cancellation requested, start timeout, controller crash,
  or unknown provider outcome do not release it;
- release occurs only when start was proven impossible, or AR proves the runtime
  effect stopped or was fenced behind a sufficient containment barrier;
- unknown outcomes remain blocking and enter reconciliation or quarantine;
- stale workers cannot release a successor occupancy because release uses exact
  occupancy identity, revision, and Run authority generation.

Plan promotion, participant rows, occupancy changes, receipt, and outbox facts are
one Run Orchestration transaction. AR calls occur only after commit through
durable dispatch. Retrying an ambiguous request reuses the same command identity;
it never creates a new blind start.

## Consequences

- Users can distinguish a permanent Team edit from a temporary Run experiment,
  reproduce exactly what ran, and replace the default coordinator safely.
- The one-active-Run rule is enforced by database state rather than one process
  or best-effort lookup.
- A controller crash can leave an Agent visibly blocked in reconciliation. This
  is safer than silently starting a duplicate; operator UX and AR evidence must
  make the condition actionable.
- Moving or editing a saved Team never rewrites an active Run. A newly assigned
  Team still cannot start the occupied Agent until release.
- Manual coordinator replacement is the first supported change. Automatic
  election, backup selection, multiple coordinators, hierarchy, quorum, and a
  generic policy DSL are deferred.
- Exact aggregate, AR receipt/barrier, failure-policy, authorization, and public
  contract details remain gated by OD-004, OD-006, OD-012, OD-013, OD-019,
  OD-026, and OD-027.
- The module pilot still implements only `CheckTeamDraft`; this ADR preserves the
  later S3/S4 shape without pulling Run machinery into the first slice.

## Rejected alternatives

- Mutate the saved Team when starting a customized Run. This hides a permanent
  change inside an execution action.
- Store only an overlay and resolve it later. Historical behavior would depend on
  mutable Team data and resolver versions.
- Store only the effective roster. This loses the user's exact temporary intent
  and weakens diagnostics or explicit save-back.
- Allow concurrent active Runs for one Agent. The selected product model requires
  a clone with a new identity and separate statistics instead.
- Release exclusivity on TTL, heartbeat loss, or timeout. These are not proof that
  an external runtime effect is gone.
- Make the coordinator a permanent special Agent, authorization role, or runtime
  parent. This couples product coordination to security and provider topology.
