---
id: ADR-0109
type: adr
status: accepted
owner: architecture
summary: Require coarse process isolation from first materialization and qualify Compose and Kubernetes for thousands of concurrently running agents.
approved_by: product-owner
accepted_at: 2026-10-20
supersedes:
  - ADR-0001
related:
  - ADR-0030
  - ADR-0050
  - ADR-0060
  - ADR-0087
  - ADR-0093
  - ADR-0104
  - ADR-0105
  - ADR-0106
  - ADR-0107
  - ADR-0108
  - architecture.deployment-profiles
  - architecture.context-map
  - architecture.composition
  - architecture.implementation-readiness-gates
  - architecture.testing
  - OD-012
  - OD-030
  - OD-038
  - OD-039
  - OD-040
---

# ADR-0109: Distributed Hosts and Concurrent Agent Scale

## Context

The product owner explicitly selects a product spanning one agent team through
enterprise deployments with thousands of simultaneously running agents and
several concurrent users and clients. Stored Agent definitions, idle sessions,
and queued tasks are not the intended scale. Both Docker Compose and Kubernetes
must be supported deployment forms; the future native Desktop profile keeps its
separate authority and lifecycle boundary.

ADR-0001 selected one initial modular monolith and deferred process extraction
until later evidence. The owner now requires the global placement map and
selected process boundaries before implementation so that extraction does not
depend on a later reminder or a large migration. There is enough concrete
variation in control traffic, durable coordination, runtime observations,
indexing, semantic context work, filesystem effects, and external delivery to
name coarse workload roles without creating a microservice for every feature.

Three independent reviews examined domain and transaction ownership, deployment
and native lifecycle, and decision authority. They identified ambiguity between
one semantic owner and one process, accidental RPC hops for durable work, and
unqualified local and server discovery as risks the new placement must address.

## Decision

### Headless modular core with distributed role processes

Keep the headless, event-driven architecture, Clean Architecture, Full DDD,
context-owned transactions, versioned contracts, and explicit partial-failure
semantics. Replace ADR-0001's universal initial single-process placement and
later-only extraction rule with the accepted
[service role map](../architecture/deployment-profiles.md#service-role-map).
This is the scope of supersession; the successor retains the other principles.

The map separates semantic owners, capability groups, execution roles, and
interchangeable replicas. A group may have several roles; a role may host
independent contexts with separately bounded handlers and transactions. None of
these boundaries is derived from a feature directory, Protobuf method, Agent,
Team, Run, or runtime session. No empty service package is created to reserve a
future capability.

Each selected isolated role becomes an independently runnable OS process with
its first delivered owning feature. A module, worker thread, local router, or
deployment label inside another process does not satisfy that rule. The first
materializing change includes the role's static composition, real consumers,
contract, deployment mapping, lifecycle, resource bounds, and rejecting
conformance fixtures. Implementation cannot postpone those items to a later
scaling stage. Existing domain and package admission gates remain in force.

The first stateful private boundary is Control Host to the whole implemented
Team Topology S3 subset: persistent Team create/get/list. S1/S2
`CheckTeamDraft` remains a module and public-contract proof. It does not replace
the product boundary, and this choice does not implement future Team methods
upfront. Subsequent workload roles are mandatory when their first corresponding
feature arrives, rather than being optional extractions after the product grows.

### Selected protocols and infrastructure owners

ADR-0105 selects feature-owned Protobuf and standard gRPC through Dapr for actual
private RPC boundaries. Public clients retain Connect; future GraphQL remains
another inbound adapter to the same owned application ports. Ordinary calls
inside one role remain typed local collaboration.

ADR-0107 retains direct official JetStream durable pull delivery. A durable
worker does not acquire a Dapr hop or sidecar without a real request/reply
dependency. PostgreSQL state ownership, AR execution authority, workflow-engine
adapters, and Centrifugo client fan-out retain their accepted boundaries. Dapr
state, pub/sub, actors, jobs, and workflows are not adopted by this decision.

One semantic owner and durability boundary may have several qualified concurrent
writer replicas. Constraints, revisions, receipts, claims, and fencing protect
the owner's invariants. Every process has one lifecycle authority. Neither
rule requires one global writer process, and Dapr routing confers no AR session
custody or workspace ownership.

### Deployment and scale commitment

Docker Compose is the initial server development and small-server composition.
Kubernetes is the supported large-cloud composition. Each materialized role is
represented in both forms from its first implementation, with common contracts
and separate environment evidence. Compose execution cannot stand in for
Kubernetes execution; rendered manifests cannot stand in for either.

The default server integration path and its required CI exercise the actual
process and Dapr boundary from S3. Pure unit and contract fixtures can remain
fast and in process; they cannot silently replace that integration path.
Composition selects qualified discovery, peer identity, private endpoint
protection, readiness, drain, and bounded retries before advertising a profile.
Neither Dapr nor Compose is an autoscaler; the named deployment platform owns
replica availability and scaling, while AR owns execution capacity.

The server design target is thousands of simultaneously running agents. Every
capacity claim states its actual concurrency and workload envelope and proves
bounded overload, cancellation, tenant isolation, and recovery. Numerical SLOs
remain subject to OD-030. This ADR records a target, not achieved capacity or
production qualification.

Desktop connected to a hosted Target starts no unused local infrastructure and
never accesses remote PostgreSQL directly. A future Fully Local Target uses
native PostgreSQL, NATS, selected role processes, and paired `daprd` processes
under the Local Supervisor. It does not inherit cloud dependencies merely by
using the same core. ADR-0087 and OD-040 still defer Fully Local implementation;
its supported workload and packaged-platform evidence are separate.

### Boundaries that remain gated

The strategic context map and unaccepted detailed models retain their existing
statuses. Review Management, Automation and Scheduling, and external integration
management do not become implemented or accepted contexts through placement.
Exact Dapr release artifacts and environment configuration require qualification
with the first relevant role. No production dependency is added by this
documentation decision, and none of the five implementation readiness gates is
declared passed.

## Consequences

- The first real features establish the process and failure boundaries that the
  enterprise product needs, while ordinary internal features stay inexpensive
  typed modules.
- Delivery pays for real deployment, identity, startup, and failure testing
  earlier. AI-generated boilerplate reduces repetitive authoring but cannot
  prove those operational properties.
- Small installations share PostgreSQL and broker infrastructure and use few
  role replicas. Large deployments scale the applicable roles and AR capacity
  independently; service count is not a capacity formula.
- An implementation-language change preserves the published consumer contract,
  not the implementation code or the need for data migration and conformance.
- Accepted obligations are visible in the role map and first-materialization
  gate. Documentation checks do not claim that their runtime enforcement exists.

## Rejected alternatives

- One universal Host followed by unspecified later extraction: it conflicts
  with the owner's requirement to establish the selected boundaries now.
- One microservice per feature, context, or agent: semantic ownership alone does
  not justify independent process and operational costs.
- A fleet of empty services before any capability: it provides no behavior or
  failure evidence and bypasses package materialization policy.
- Protobuf plus a custom discovery, routing, retry, and lifecycle framework:
  it recreates mechanisms selected from Dapr and the deployment platform.
- A single cloud/local composition with environment branches in business code:
  it obscures authority and resource ownership and contradicts shared-core
  composition and explicit Target boundaries.
