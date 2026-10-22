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
  - ADR-0090
  - ADR-0093
  - ADR-0106
  - ADR-0108
  - ADR-0112
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

ADR-0112 requires Fully Local in V1. This decision is now implementation-start
work on that release path, not a question of deferring the profile beyond V1.
It remains open until the lifecycle, workflow, and exact first-slice contracts
below are accepted; the release-scope decision does not resolve those contracts.

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

ADR-0106 selects native bundled PostgreSQL and ADR-0108 selects its Node launcher
approach; neither resolves this decision or qualifies a release.
The first increment must name its PostgreSQL lifecycle and persistence scope
under the existing owners; it cannot create a second Desktop-owned Host,
database process, or authoritative local cache.

## Options

- materialize all three reserved packages in one accepted implementation slice;
- materialize Local Host and SDK first while keeping Supervisor deferred;
- keep all packages deferred and prove more lifecycle behavior through spikes.

## Acceptance criteria

- accepted Local Supervisor lifecycle and distribution boundary;
- accepted local durable workflow adapter boundary;
- exact first package slices and owners;
- explicit non-goals for the first Fully Local implementation increment;
- the first supported native PostgreSQL composition and remaining packaging,
  recovery, and workload qualification, without treating an engine choice as
  release evidence; the [packaged qualification matrix](../architecture/local-host-lifecycle.md#packaged-postgresql-qualification)
  remains mandatory for the corresponding released capability;
- an accepted materialization ADR referenced by the package materialization
  policy.

## Resolution

Open. Resolution records the accepted materialization ADR in every policy entry
that becomes allowed.
