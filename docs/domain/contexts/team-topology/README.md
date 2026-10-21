---
id: domain.contexts.team-topology
type: bounded-context
status: accepted
owner: team-topology
summary: Scoped sandbox semantics and ownership for team topology.
related:
  - ADR-0103
  - contract.migration.desktop-first-slice.v1
  - ADR-0100
  - ADR-0101
  - ADR-0076
  - architecture.context-map
  - OD-006
  - OD-011
  - OD-044
  - OD-045
  - OD-046
  - OD-047
  - research.team-creation-legacy-capability-inventory-2026-08-27
---

# Team Topology

## Accepted implementation scope

ADR-0103 accepts only `src/features/team-definitions/` for the server sandbox
runtime migration. This status describes that bounded scope; it does not admit
other capabilities from the broader model below. Existing accepted ADR invariants
remain binding. The owning reserved package and LikeC4 identity do not change.

## Domain vision

Keep one authoritative Team definition and exclusive Agent assignment while pinning immutable identity and profile versions.

## Scope

Owns: One existing canonical Agent, its current Team assignment, and one immutable single-member Team version.

Excluded from this admission: Run activation, Agent execution, Task state, organizational placement, usage and the broader Agent library workflow.

## Ubiquitous Language

Team is the persistent definition; TeamVersion is immutable roster evidence; Agent is canonical identity; TeamMember is one version-pinned assignment.

## Invariants and business rules

One Agent has at most one current Team assignment and appears once in the roster; a profile version is not participant or grant identity; historical versions never change.

## Aggregates and consistency boundaries

| Root and identity | Protected invariants | Commands | Domain events | Transaction | Concurrency | Growth bound | External facts | Rejected boundaries |
|---|---|---|---|---|---|---|---|---|
| Team and Agent assignment | Invariants above | CreateTeam; GetTeam; ListTeams | TeamCreated; AgentAssigned | One owner-local Unit of Work including receipt, Operation and outbox | Unique current Agent assignment plus row/CAS protection; request replay precedes new mutation after current authorization. | One member/Run in this slice; history and receipts stored separately with finite declared horizons | Existing authorized Agent and exact profile version; clock and server-generated identity inputs. | No provider-state mirror, cross-context aggregate or shared transaction |

Repositories persist only the owning roots/state; read queries use authorized
projections. Transport schemas and persistence records map to separate domain and
application models. IDs and ExactInstant values enter through explicit ports;
no provider/transport/database type enters business policy.

## Commands, processes and errors

New Team creation atomically records one immutable version and current assignment. Failed Run activation never deletes it.

Application processes persist stable child identities, checkpoints and external
intent before dispatch. Domain events above express local facts; integration
publication intent and wire events remain separate mapped surfaces. Typed errors
include forbidden scope, stale authority/ETag, conflicting request and explicit
unknown outcome. A timeout never authorizes an unkeyed effect or legacy replay.

## Concurrency and conflict model

Unique current Agent assignment plus row/CAS protection; request replay precedes new mutation after current authorization.

Persistence owns one context schema, local transaction and forced RLS boundary.
The server borrows its low-level pool; it never borrows another context's Unit
of Work, repository or transaction. Rehydration validates invariants and exact
values rather than trusting a transport DTO.

## Context relationships

Run consumes immutable Team versions through a consumer-owned port; Identity and Access provide trusted authority facts.

## Security and authorization

Trusted scope and subject come from the selected authority adapter. The sandbox
authority is explicitly test-only, current grants apply on replay and reads, and
no prompt/provider payload can select trusted identity. Raw secrets and protected
payload remain in their owning adapters. This admission does not qualify a
deployment, authorize user-project testing or weaken accepted privacy rules.

## Verification scenarios

Duplicate create returns the same receipt; competing assignment conflicts; profile/display values cannot substitute for Agent identity.

The [accepted sandbox contract](../../../contracts/desktop-runtime-migration-admission-v1.md)
links deterministic fixtures and exact Protobuf sources. Actual domain,
rehydration, concurrent PostgreSQL transaction, response-loss and restart tests
are required with implementation; their names follow the scenarios above.
Synthetic admission models do not assert adapter or provider qualification.

## Implementation links

The package remains reserved until the canonical Plan/Apply scaffolder runs.
The accepted feature's colocated documentation, public entrypoints, source
boundaries and feature allowlist are materialized in the same implementation
change. No other feature is authorized by this dossier status.

## Excluded model and unresolved questions

OD-006, OD-011, OD-019 and OD-029 retain broader discovery, naming and retention ownership.

The following retained material describes broader context discovery and existing
ADR references. Proposed behavior outside the accepted feature remains excluded
and must use its owning decision process before implementation.

Proposed scope: project-scoped teams, members, roles, declared capabilities,
topology versions, and roster invariants. Tasks and runtime processes remain
outside this context.

Team Topology owns create-only, clone, and template-instantiation capabilities.
It does not own organizational placement or Run activation. The Run
Orchestration `team-activation` feature may request Team creation through a
narrow application boundary but never imports or mutates the Team aggregate
directly.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.

### First development slice

The first development direction is a narrow, side-effect-free Team draft check,
delivered in two increments:

1. `CheckTeamDraft` as transport-independent domain and application behavior with
   deterministic typed diagnostics.
2. The same capability through the handwritten SDK, feature-owned Protobuf, and
   a Connect inbound adapter with shared behavior fixtures.

This direction proves one real feature-module vertical slice. It does not admit
Team persistence, organization placement, Run creation, AR calls, provider
readiness, agent execution, or GraphQL.

The initial checker accepts only the smallest role seam: each member may carry
one optional opaque `roleKey`. A role key is classification input, not a product
grant, runtime type, parent-child relation, or implicit coordinator authority.
ADR-0101 defines the separate default-coordinator reference. Richer roles,
delegation, multiple coordinators, and hierarchy remain later capabilities.

### Delivery map

| Slice | Capability | Persistence or effects |
|---|---|---|
| S1 | Pure `CheckTeamDraft` and deterministic diagnostics | None |
| S2 | Handwritten SDK plus Protobuf/Connect adapter for the same check | None |
| S3 | Create, get, and list persistent Team definitions | Team Topology only |
| S4 | Start a Run from an immutable Team version with explicit Run overrides | Run Orchestration and AR boundaries |

S1 and S2 are the module pilot. They must preserve extension points for S3 and
S4 without implementing a generic profile catalog, hierarchy engine, policy DSL,
or persistence framework in advance.

The complete legacy behavior map and proposed MVP dispositions are maintained in
the [Team creation capability inventory](../../../research/team-creation-legacy-capability-inventory-2026-08-27.md).

### Accepted product model

ADR-0100 and ADR-0101 establish these product facts even while the exact aggregate
and repository boundaries remain open under OD-006 and OD-011:

- `TeamDraft`: unpersisted input that can be checked without effects;
- `AgentProfile`: the domain resource behind the user-facing Agent library, with
  stable product identity and immutable definition versions;
- `TeamMember`: one Agent assignment represented in an immutable Team version,
  never a reusable runtime or principal;
- `AgentProfileVersion`: immutable profile facts pinned by a Team version;
- `TeamSlot`: stable responsibility location targeted by future Run overrides;
- `RunParticipant`: one concrete participant in one Run, owned outside this
  context.

One Agent has at most one current Team assignment and cannot appear twice in one
effective roster. Copying creates a new Agent identity and separate statistics.
A Team version pins exact Agent definition versions and may identify zero or one
ordinary member as its default coordinator. Editing an Agent or Team never
rewrites an existing Team version or active Run.

The persistence adapter must keep immutable Agent and Team versions separate from
the current Agent-to-Team assignment authority. A database unique constraint on
the canonical Agent reference enforces the current assignment; historical roster
rows do not participate. One Team Topology transaction and ETag/CAS update the
affected current assignments, append the successor Team version, and record
receipt/outbox facts. Physical table and repository boundaries remain open under
OD-006 and never cross bounded-context schemas.

Canonical statistics stay in Usage Metering and Usage Accounting projections.
Team Topology stores identity and definition facts, not mutable usage counters.

### Immediate open questions

- OD-006 must prove the exact Agent, Team, roster, and member aggregate bounds.
- OD-011 must validate that the Agent library belongs in Team Topology.
- OD-019 must fix public resource scope and naming.
- OD-029 must define archive, retention, erasure, and restore behavior.
- ADR-0101 owns Run-only roster changes, coordinator selection, and active Agent
  occupancy; those concerns do not expand the Team Topology transaction.
