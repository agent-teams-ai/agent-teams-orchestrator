---
id: architecture.context-map
type: architecture
status: proposed
owner: architecture/domain
summary: Proposed strategic bounded contexts, ownership boundaries, and integration relationships.
blocked_by:
  - OD-011
  - OD-023
  - OD-024
related:
  - ADR-0042
  - ADR-0044
  - ADR-0045
  - ADR-0046
  - ADR-0054
  - ADR-0062
  - ADR-0068
  - ADR-0079
  - ADR-0073
  - ADR-0080
  - ADR-0084
  - ADR-0104
  - ADR-0105
  - OD-011
  - OD-023
  - OD-024
code_anchors:
  - pattern: architecture/likec4/**
    enforcement: advisory
---

# Strategic Context Map

The map identifies model boundaries and relationships. It does not redefine the
Ubiquitous Language, invariants, aggregates, or process models owned by each
[bounded-context dossier](../domain/contexts/README.md).

There is no numerical target or ceiling. Contexts are added, merged, split, or
retired only from differences in language, ownership, invariants, lifecycle,
consistency, security, and evolution. A proposed boundary is not permission to
materialize an empty package or freeze a schema.

## Mapping vocabulary

- A business capability describes what the product can do.
- A subdomain classifies business value as core, supporting, or generic.
- A bounded context owns one consistent model and Ubiquitous Language.
- A workspace package is a physical boundary created after acceptance.
- A feature is a cohesive capability inside one bounded context, not a smaller
  context by default.
- A nested feature is a child capability within the same context, assembled by
  its direct parent under the feature module standard.
- A Get Modular entry is an independently wired implementation seam; a group
  assembles declared entries and child groups without changing domain ownership.
- A service group declares the callable capabilities of a selected private
  boundary. It may cover several features, but does not create a new semantic
  owner or combine the transactions of different contexts.
- A deployment role selects the handlers, consumers, and adapters that run
  together with one lifecycle and resource profile. A group may have several
  roles; a role may initially host several groups.
- A replica set contains interchangeable instances of one routing contract.
  Replica membership does not grant ownership of a session, partition, or data.
- A Moleculer action is one callable operation within the selected group, not an
  independently deployed service by itself.
- A deployed service is an execution placement with a lifecycle and scaling
  boundary. It may contain several features; neither a feature nor an entry
  automatically requires its own process or RPC contract.

These concepts often align, but they are not interchangeable.

## Strategic business contexts

| Bounded context | Classification | Boundary status | Primary responsibility | Domain authority |
|---|---|---|---|---|
| Identity Registry | Generic | Proposed | Human and machine principal identity | [Dossier](../domain/contexts/identity-registry/README.md) |
| Access Control | Supporting | Proposed | Consumer-facing authorization boundary over membership and grant facts owned by the configured product authority provider; internal mechanism open under OD-012 | [Dossier](../domain/contexts/access-control/README.md) |
| Orchestration Scope | Supporting | Accepted by ADR-0080 | Stable Orchestrator tenant/project identity, admission, project-level runtime binding, and disposition coordination | [Dossier](../domain/contexts/orchestration-scope/README.md) |
| Workspace Registry | Supporting | Proposed | Workspace registration, execution allocation, materialization lifecycle, and cleanup | [Dossier](../domain/contexts/workspace-registry/README.md) |
| Team Topology | Core | Proposed | Agent-team composition, roles, capabilities, and roster rules | [Dossier](../domain/contexts/team-topology/README.md) |
| Agent Organization | Core | Accepted by ADR-0044 | Tenant-scoped organizations, units, structures, and team placements | [Dossier](../domain/contexts/agent-organization/README.md) |
| Work Coordination | Core | Proposed | Tasks, assignments, dependencies, handoffs, and work lifecycle | [Dossier](../domain/contexts/work-coordination/README.md) |
| Run Orchestration | Core | Proposed | Durable Run coordination and application of accepted execution policy consequences | [Dossier](../domain/contexts/run-orchestration/README.md) |
| Execution Observation | Supporting | Accepted by ADR-0084 | Admitted runtime evidence, protected diagnostics, deterministic user-facing activity, durable activity feeds, and authorized search | [Dossier](../domain/contexts/execution-observation/README.md) |
| Agent Communication | Core | Proposed | Typed team communication, delivery intent, inbox policy, and receipts | [Dossier](../domain/contexts/agent-communication/README.md) |
| Human Notification Management | Supporting | Accepted by ADR-0068 | Human inbox, presentation preference, acknowledgement, and escalation lifecycle | [Dossier](../domain/contexts/human-notification/README.md) |
| Agent Attention | Core | Accepted by ADR-0068 | Agent relevance, orientation need, bounded disruption intent, and attention-loop control | [Dossier](../domain/contexts/agent-attention/README.md) |
| Agent Context | Core | Accepted by ADR-0073 | Provenance-aware semantic context composition, validity, and continuity evidence | [Dossier](../domain/contexts/agent-context/README.md) |
| Policy and Risk | Supporting | Proposed | Workspace trust, execution policy, risk classification, and controls | [Dossier](../domain/contexts/policy-risk/README.md) |
| Approval Management | Supporting | Proposed | Product approval lifecycle, routing, decisions, and audit | [Dossier](../domain/contexts/approval-management/README.md) |
| Usage Metering | Supporting | Accepted by ADR-0045 | Observations, normalization, corrections, meters, and quantities | [Dossier](../domain/contexts/usage-metering/README.md) |
| Usage Accounting | Supporting | Accepted by ADR-0045 | Attribution, rating, exact cost, reconciliation, and projections | [Dossier](../domain/contexts/usage-accounting/README.md) |
| Consumption Governance | Supporting | Accepted by ADR-0045 | Budgets, alerts, limits, reservations, and consumption decisions | [Dossier](../domain/contexts/consumption-governance/README.md) |

Boundary status and dossier readiness are intentionally different. An ADR may
accept a strategic split while its dossier remains proposed until Full DDD
discovery proves exact aggregates, scenarios, and concurrency.

## Initial placement and candidate extractions

The [architecture overview](overview.md#architectural-style) selects one initial
Orchestrator Host containing independently owned product contexts. Sharing a
process or PostgreSQL server does not combine their models, transactions, or
authority. AR keeps its separate runtime boundary and existing Published
Language. Production materialization still follows each owner's accepted scope
and the implementation readiness gates.

### Planned service groups

The [service-boundary proposal](../decisions/0105-portable-service-boundaries-and-moleculer.md#select-boundaries-by-capability)
uses the following groups for product planning. Their names describe capability
sets, not new contexts, package IDs, accepted wire methods, or deployed workers.
The first group has an existing delivery path; later groups require the owning
capability and contract decisions before their adapters are materialized.

| Group | Existing semantic owner and contents | Planned placement and boundary |
|---|---|---|
| Agent/Team definitions and versioned roster | [Team Topology](../domain/contexts/team-topology/README.md); S3 persistent Team create/get/list, followed by separately delivered Agent definitions, immutable versions, roster changes, cloning, and templates | First planned private capability group, initially local, with its transport recommendation under ADR-0105 review. Public Connect and later Run `team-activation` use owned ports. Assignment uniqueness, Team versions, receipts, and outbox remain in one Team Topology transaction; organization placement, Run admission, and AR execution stay outside |
| Execution activity, history, and diagnostics | [Execution Observation](../domain/contexts/execution-observation/README.md); timeline, snapshots, feed resume, authorized search, protected diagnostic access/export, and selected rebuild controls | Later query/control group with separate ingestion, indexing, and query roles where justified. Durable ingestion and indexing use direct JetStream handlers. Ingestion commits receipt/checkpoint, evidence, safe projection, feed, and indexing outbox together; indexing follows that commit. Preserve disclosure checks; Centrifugo retains client fan-out |
| Semantic context composition and validity | [Agent Context](../domain/contexts/agent-context/README.md); contribution admission, provenance, manifests, validity, invalidation, and continuity evidence | Later bounded query/control group after its consumer contracts are accepted. Durable assembly and invalidation keep their context-owned state and delivery; avoid a synchronous call chain across source owners. AR owns technical materialization and Run owns activation |
| Workspace materialization mechanics | [Workspace Registry](../domain/contexts/workspace-registry/README.md); outbound worktree, clone, snapshot, or remote-workspace mechanics | Later technical worker group behind the registry's owned port. Resource/machine affinity, allocation and binding generations, and cleanup reconciliation constrain routing. It is not a new context; AR retains runtime isolation |

The first group is larger than a checker but is implemented incrementally.
S1/S2 `CheckTeamDraft` remains the module and public API proof. The private
product integration begins with the existing S3 subset; choosing the group does
not add all later capabilities to that slice. OD-006 and OD-011 still govern
Team Topology's exact model, and the other dossiers retain their own gates.
The current-assignment authority and immutable Team history are not split into
different service owners merely to increase service count.

Human notification delivery is a separate durable worker opportunity. Shared
JetStream pull consumers already distribute its accepted delivery work; an extra
Moleculer hop is not required for that purpose. Human Notification Management
keeps policy, attempts, and reconciliation under ADR-0068 and OD-026.

One initial Host may contain several groups. Each group can contain several
feature-owned operations; ordinary collaboration inside it stays typed and
local. The selected profile maps operations to deployment roles and their
interchangeable replicas. Query and command roles with different method sets
must use distinct route identities or an ingress that routes those methods;
they cannot be registered as equivalent replicas behind one undifferentiated
endpoint. A durable worker does not require an RPC service registration.

A context can have several write replicas without a global singleton writer.
Its constraints, revisions, receipts, and fencing protect each invariant. Do
not split one atomic operation across RPC roles or hold its SQL transaction
open while waiting for another service. Roles sharing the owner's schema need
explicit migration and mixed-version compatibility during rollout.

A group is selected before its first adapter is written, while remote placement
is separately justified by measured load, isolation, or resource needs. A
`.proto` file, feature directory, or agent instance does not select placement.
Existing package identities and materialization policies remain in the
[package catalog](../../architecture/package-catalog.yaml).

## Integration modules

These are architectural integration modules, not business bounded contexts:

- Runtime ACL;
- external Task Board ACLs;
- Query Composition;
- transport adapters;
- persistence drivers;
- schema registry;
- observability.

External vendor installation management remains a deferred strategic candidate,
not an accepted integration module or bounded context. ADR-0074 and OD-034 keep
its future ownership seam explicit without adding a v1 package.

They translate, transport, persist, or compose information. They do not invent
business aggregates or become authorities for business lifecycle.

## Relationship map

The exact element and directed-relationship graph is maintained in the
[machine-readable LikeC4 model](architecture-model.md), not repeated as Mermaid
or a prose edge table. This prevents three copies of the same topology.

Each relationship in the model declares its integration style, authority, and
relationship status. Arrows describe semantic information flow, not source
imports. Relationship status does not accept either bounded context.

Every relationship must still define consistency, delivery, latency, failure,
and compatibility behavior in its owning dossier or contract before
implementation. Detailed message names and aggregate reactions never belong in
the strategic graph.

`Application use cases` is an authorization-consumption boundary, not another
bounded context. Bidirectional information flow never authorizes cyclic package
imports.

## Cross-context identity namespaces

Three identities must never be aliased:

| Identity | Owner | Meaning |
|---|---|---|
| `OrchestrationPrincipalId` | Open under OD-012 | Stable tenant-scoped product actor reference; exact binding owner and provider topology remain unresolved |
| `AgentProfileId` | Team Topology | Product-level agent definition |
| `RuntimeSessionRef` | AR | Opaque technical runtime session reference |

Associations among them are explicit, scoped, lifecycle-aware bindings owned by
the context that needs the relationship. Authentication does not create an agent
profile, and replacing a runtime session does not change product identity.

## Relationship rules

- A synchronous consumer declares a narrow outbound port and translates the
  provider Published Language through an ACL or context bridge.
- Asynchronous collaboration uses versioned integration events.
- A context never writes another context's tables, inbox, outbox, feed, or
  projection.
- One event handler changes state in one bounded-context transaction.
- A context never imports another context's aggregate, repository, application
  implementation, or adapter.
- Cross-context references are opaque local value objects.
- Eventual consistency is explicit in states, errors, reconciliation, and UX.
- Cyclic synchronous context dependencies and cyclic package imports are
  prohibited.

## Evidence gate

Before a proposed context package is materialized:

1. map business capabilities and domain vision;
2. event-storm representative success, failure, cancellation, recovery, and
   concurrency scenarios;
3. establish context-specific Ubiquitous Language;
4. prove invariants, aggregate and transaction boundaries, and conflict policy;
5. define commands, domain events, policies, process managers, and errors;
6. define every upstream/downstream contract and consistency expectation;
7. validate tenant/project isolation and external ACL boundaries;
8. map legacy behavior to exactly one future owner;
9. record unresolved detail in addressable open decisions;
10. accept the validated boundary before production package creation.
