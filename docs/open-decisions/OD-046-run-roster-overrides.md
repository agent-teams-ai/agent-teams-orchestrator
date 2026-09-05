---
id: OD-046
type: open-decision
status: resolved
owner: run-orchestration
summary: Define how one Run excludes or replaces Team members without mutating the saved Team version.
resolved_by: ADR-0101
related:
  - ADR-0063
  - ADR-0065
  - ADR-0076
  - ADR-0101
  - OD-006
  - OD-011
  - OD-013
  - OD-044
  - OD-045
  - research.team-creation-legacy-capability-inventory-2026-08-27
  - research.team-participant-model-council-2026-08-27
---

# OD-046: Run Roster Overrides

## Decision required

Define how a user disables, excludes, or replaces a saved Team member for one
Run, including coordinator replacement, exact re-run, rebase, and optional
save-back behavior.

## Constraints

- Starting a Run never mutates the saved Team or creates a hidden Team version.
- `RunPlanVersion` is immutable and must remain replayable after the Team changes.
- Overrides address stable Team slots or membership identities, never display
  names, array indexes, or only a reusable profile identity.
- Team Topology owns roster invariants. Run Orchestration owns the effective
  Run plan, participant identities, activation, replan, and replacement.
- Runtime configuration, secrets, and AR state never enter a roster override.

## Options

1. Store the exact source Team version, a typed normalized overlay, and the fully
   materialized effective roster in `RunPlanVersion`. The snapshot is execution
   authority; the overlay explains provenance. This is the leading option.
2. Store only the effective roster plus a source reference. This is simpler but
   loses the user's exact override intent and weakens save-back diagnostics.
3. Store only an overlay and recalculate the roster later. This makes historical
   replay depend on old Team data and resolver behavior.

## Acceptance criteria

- Define stable slot identity and typed operations for exclude and replace.
- Decide whether disable and remove are one Run-only operation.
- Define coordinator replacement without conflating occupant replacement with a
  change of responsibility.
- Define deterministic conflicts, limits, required slots, duplicate occupants,
  and topology validation.
- Define exact re-run versus launch-current-Team semantics.
- Define save-back as a separate Team Topology command with ETag/CAS and no
  cross-context transaction.
- Define retention, authorization, provenance, redaction, and stale-reference
  behavior for historical Run plans.

## Resolution

Resolved by ADR-0101.

A Run plan records the exact source Team version, a typed normalized overlay,
and the fully materialized effective roster. Disabling, replacing, or selecting
a different coordinator for one Run never mutates the saved Team. Save-back is a
separate Team Topology command guarded by an ETag.
