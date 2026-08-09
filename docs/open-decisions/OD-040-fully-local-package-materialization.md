---
id: OD-040
type: open-decision
status: open
owner: architecture/composition
summary: Authorize the exact implementation start and package materialization scope for Fully Local.
blocked_by:
  - OD-021
  - OD-035
related:
  - ADR-0089
  - ADR-0092
  - architecture.deployment-profiles
  - architecture.local-host-lifecycle
  - OD-021
  - OD-035
---

# OD-040: Fully Local Package Materialization

## Decision required

When may the reserved Local Supervisor, Local Orchestrator application, and Local
Host SDK packages become real code, and which accepted lifecycle and workflow
contracts must their first slices implement?

## Why this remains open

Package materialization starts implementation; it is not proof that Fully Local
is production-qualified. Requiring final profile qualification before creating
the packages would be circular because those packages are needed to produce the
qualification evidence. Allowing them merely because older owner ADRs exist
would start the wrong architecture prematurely.

## Constraints

- the decision authorizes implementation, not production qualification;
- no package may own orchestration domain behavior that belongs to another
  bounded context;
- Desktop remains a bootstrap/client surface rather than the durable lifecycle
  owner;
- the first slices must prove lifecycle and workflow boundaries before expansion.

## Options

- materialize all three reserved packages in one accepted implementation slice;
- materialize Local Host and SDK first while keeping Supervisor deferred;
- keep all packages deferred and prove more lifecycle behavior through spikes.

## Acceptance criteria

- accepted Local Supervisor lifecycle and distribution boundary;
- accepted local durable workflow adapter boundary;
- exact first package slices and owners;
- explicit non-goals for the first Fully Local implementation increment;
- an accepted materialization ADR referenced by the package catalog.

## Resolution

Open. Resolution records the accepted materialization ADR in every package entry
that becomes allowed.
