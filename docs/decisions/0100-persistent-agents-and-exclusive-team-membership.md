---
id: ADR-0100
type: adr
status: accepted
owner: team-topology
summary: Define a versioned reusable Agent identity whose current assignment belongs to at most one Team.
approved_by: product-owner
accepted_at: 2026-08-27
related:
  - ADR-0020
  - ADR-0025
  - ADR-0045
  - ADR-0076
  - ADR-0101
  - domain.contexts.team-topology
  - OD-006
  - OD-011
  - OD-019
  - OD-044
---

# ADR-0100: Persistent Agents and Exclusive Team Membership

## Context

Users need a persistent library of named agents that they can configure, place
into a Team, inspect over time, and deliberately copy. A saved Team must remain
reproducible after an Agent is edited, while Team history must not prevent a
current Agent from being moved. The product owner also chose a simple mental
model: one Agent belongs to at most one Team at a time; a second similar Agent is
an explicit copy with a different identity and separate statistics.

An immutable Team-version history alone cannot enforce current membership,
because historical versions continue to mention Agents that have since moved.
Conversely, a mutable live reference would let an Agent edit silently rewrite a
saved Team. The persistence model therefore needs separate immutable history and
current-assignment authority.

## Decision

The user-facing resource is called an **Agent**. Its existing provider-neutral
domain identity remains `AgentProfileId` until OD-019 fixes public resource names
and scope. It is not a principal, Team membership, Run participant, runtime
profile, process, credential, or AR session.

Team Topology owns the Agent library and the following semantics:

- an Agent has a stable identity, lifecycle, display metadata, avatar reference,
  default role classifier, and immutable definition versions;
- provider credentials, binary paths, runtime sessions, process state, and
  provider-specific execution controls never enter the Agent or Team model;
- a Team version references an exact Agent definition version, so a later Agent
  edit never changes an existing Team or active Run implicitly;
- updating a Team to a newer Agent definition is an explicit Team edit guarded
  by its ETag;
- one Agent may occur at most once in one effective Team roster and may have at
  most one current Team assignment inside its canonical authority scope;
- adding an already assigned Agent to another Team returns a typed conflict;
  moving it is a separate, explicit command, never an implicit side effect;
- copying an Agent creates a new `AgentProfileId`. It copies allowed definition
  fields and may retain lineage provenance, but never copies membership, active
  occupancy, usage facts, or statistics.

The logical persistence model separates:

1. the current Agent header and optimistic revision;
2. append-only immutable Agent definition versions;
3. append-only immutable Team versions and their member snapshots;
4. one current-assignment record keyed uniquely by `AgentProfileId`;
5. command receipts and an outbox written with the owning mutation.

Historical Team versions do not participate in the current-assignment unique
constraint. `EditTeamRoster` or `MoveAgent` locks affected identities in a stable
order, checks expected revisions, updates current assignments, appends the new
Team version, and records receipt/outbox facts in one Team Topology transaction.
Database uniqueness is the final concurrency guard; a prior availability query
is only user-facing diagnostics.

This is a logical contract, not permission to expose database entities. Physical
tables, repositories, and migrations remain private adapters under ADR-0025.
Other bounded contexts store opaque Agent references and never use cross-context
foreign keys, joins, cascades, or transactions.

Agent statistics are rebuildable Usage Metering and Usage Accounting projections
attributed by exact Agent, Team, Run, Run-participant, and definition-version
references. They are not counters on the Agent aggregate. A copy starts with
separate statistics; lineage aggregation is an explicit report, never the
default.

## Consequences

- The database can enforce one current Team per Agent without discarding
  immutable Team history.
- Agent edits, Team edits, copying, and moving have explicit and reviewable
  meanings.
- Stable identities make per-Agent statistics understandable to users.
- Moving one Agent between two Teams is a multi-aggregate transaction inside one
  bounded context; aggregate details and collection bounds still require OD-006.
- Public scope, resource names, retention, archive, and erasure remain governed
  by OD-019 and OD-029 rather than being invented here.
- The first `CheckTeamDraft` module pilot does not need to implement the library
  or persistence; it only preserves these extension points.

## Rejected alternatives

- Let the same Agent belong to several Teams. This contradicts the selected
  product model and makes identity and statistics harder to explain.
- Always follow the latest Agent definition from every saved Team. This would
  mutate immutable Team meaning indirectly.
- Treat saved Agents only as copy templates. This loses stable identity and
  explicit update provenance.
- Enforce exclusivity by scanning immutable Team-version rows. Historical rows
  are not current assignment authority and would create false conflicts.
- Put canonical statistics in Team Topology. Usage evidence, attribution,
  corrections, and reporting have different owners and lifecycles.
