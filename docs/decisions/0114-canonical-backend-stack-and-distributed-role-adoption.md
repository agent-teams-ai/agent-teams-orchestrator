---
id: ADR-0114
type: adr
status: accepted
owner: architecture
summary: Adopt the approved backend, persistence and distributed-role decisions into canonical main with preserved provenance and bounded supersession.
approved_by: product-owner
accepted_at: 2026-10-22
supersedes:
  - ADR-0001
  - ADR-0011
superseded_by: []
related:
  - ADR-0004
  - ADR-0005
  - ADR-0016
  - ADR-0017
  - ADR-0025
  - ADR-0027
  - ADR-0030
  - ADR-0047
  - ADR-0048
  - ADR-0049
  - ADR-0050
  - ADR-0052
  - ADR-0060
  - ADR-0078
  - ADR-0091
  - ADR-0093
  - ADR-0103
  - ADR-0113
  - ADR-0115
  - architecture.deployment-profiles
  - architecture.composition
  - architecture.context-map
  - architecture.dependency-rules
  - architecture.eventing
  - architecture.persistence
  - architecture.local-host-lifecycle
  - architecture.public-control-contracts
  - architecture.sdk-transports
  - architecture.implementation-readiness-gates
  - architecture.testing
  - OD-001
  - OD-003
  - OD-005
  - OD-011
  - OD-012
  - OD-021
  - OD-026
  - OD-030
  - OD-035
  - OD-038
  - OD-039
  - OD-040
---

# ADR-0114: Canonical Backend Stack and Distributed Role Adoption

## Context

The product owner has approved a shared backend stack, real process boundaries
from first materialization, native PostgreSQL for local and hosted profiles,
direct official JetStream delivery and Fastify with the official Connect plugin.
The owner now requests canonical integration of the architecture branch.

That branch contains accepted identities colliding with main and parallel work.
Its noncolliding ADRs also contain references whose source meaning would change
if copied into the canonical catalog. This new adoption preserves their immutable
source records and reproduces their approved decisions with unambiguous canonical
references. It changes neither the approved mechanisms nor production admission.

## Decision

### Immutable sources and canonical mapping

All source URLs below use the complete reviewed snapshot
`3a68590e98e3acc77eb1f27e0938f08e93307b50`. Digests are the accepted immutable
payload digests recorded in that snapshot's baseline.

| Published source | Immutable digest | Adopted responsibility |
|---|---|---|
| [Source ADR-0105: private service boundaries](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0105-portable-service-boundaries-and-moleculer.md) | `sha256:dae50b235ee2eb99fb9df420c9fafd7a8504ac3122af5c226362601fccb9a07f` | Portable Protobuf and standard gRPC through Dapr |
| [Source ADR-0106: native PostgreSQL](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0106-native-postgresql-for-local-and-hosted-profiles.md) | `sha256:2f46647b263f278a56b6bae4a26011916c99b4fe037e8bcdacb26453d3c0f3b4` | Engine, authority, schemas, migrations and bounded SQLite replacement |
| [Source ADR-0107: official JetStream SDK](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0107-jetstream-sdk-for-durable-delivery.md) | `sha256:44982f580369788563550c22a97a3c9add5254aa965f4c9806e6aa352e4147a8` | Direct durable pull delivery and recovery |
| [Source ADR-0108: bundled launcher](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0108-bundled-postgresql-launcher-integration.md) | `sha256:3544a1920da7216e564f2e27340d238d96f0883b5ffbcb525d3f24c7651851cf` | Selected embedded-postgres component adapter |
| [Source ADR-0109: roles and scale](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0109-distributed-hosts-and-concurrent-agent-scale.md) | `sha256:9c215da99eb0b0a308d44ff9e6b24a6c7daf0c4849878b27f13b7df03c8f55b5` | First-feature process isolation, server mappings and scale target |
| [Source ADR-0111: shared backend and public Host](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0111-shared-backend-stack-and-fastify-public-host.md) | `sha256:84151a83ff75daea53c3d3c323ead8187ec49fb55a7125355b7e598142ac865f` | Shared reference and Fastify/Connect hosting |

Adopt their approved requirements, bounded supersession and retained evidence
with these explicit source-context mappings: source module/FMS and composition
references resolve to ADR-0113; the six backend responsibilities resolve here;
the later Fully Local V1 scope resolves to ADR-0115. Earlier source descriptions
of a proposed Moleculer option or future-local scheduling are historical context,
not an alternative accepted private protocol or current release scope.

Canonical ADR-0103 retains its unrelated sandbox business admission, exact
contract and historical evidence. It is not superseded or broadened here. Its scoped initial in-process scheduler
over durable feature process state remains admitted; this is not a new general
workflow-engine choice or removal of the selected process boundaries. No
canonical relationship uses source ADR-0111 as an alias for this adoption or
for a parallel collaboration decision. The sources remain unchanged at their
original identities and commits.

The owner's subsequent review clarifications are retained in the same snapshot's
[deployment profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/architecture/deployment-profiles.md),
[persistence](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/architecture/persistence-boundary.md),
[security](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/architecture/security-architecture.md)
and [testing](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/architecture/testing-strategy.md)
rules. Their canonical architecture documents own current cross-context rules.

### Shared reference and local adoption

Adopt the applicable responsibilities in the organization
[backend stack reference](https://github.com/agent-teams-ai/.github/blob/4dcf4ffe29279e479e089bc06f745dd1a62f12d1/docs/backend-stack.md)
at exact revision `4dcf4ffe29279e479e089bc06f745dd1a62f12d1`. It owns the reusable
catalog; local accepted decisions own semantic boundaries, contracts, pins,
deployment scope and evidence. A navigation link to central main is not an
adoption update. Do not copy the catalog or install its entire stack.

TypeScript/Node remains the primary application stack. A Go/Rust service needs
a concrete technical advantage and the same published consumer contract evidence;
it need not execute the TypeScript composition library. Existing dependency and
toolchain pins are unchanged. Frontend and shell choices are outside this record.

| Boundary | Selected mechanism and owner |
|---|---|
| Domain/application | Pure models and narrow owned ports, without wire, broker, transport or DI types |
| Inside one role | Typed local collaboration, Published APIs and consumer-owned ACLs |
| Public API | Feature-owned Protobuf/Buf through Connect and handwritten SDKs |
| Public Node HTTP Host | Fastify with the official Connect plugin in one server/process |
| Actual private request/reply boundary | Feature-owned standard gRPC through Dapr |
| Durable events and handlers | Direct official JetStream SDK and durable pull consumers |
| Relational persistence | Native PostgreSQL with context-owned schemas/migrations and applicable node-postgres/Drizzle adapters |
| Composition | The exact Get Modular pair and authority in ADR-0113 |
| Provider execution | AR owns sessions, processes, capacity, technical permissions, custody and private fences |

Orchestrator owns coordination, business commands, product approvals, governance
and projections. Platform consumes owned APIs/SDKs/ACLs and does not duplicate
the orchestration business kernel. Reuse preserves these product and context
boundaries. Temporal remains behind the owned hosted workflow port under ADR-0027;
local workflow remains OD-035. Centrifugo remains the delivery/realtime adapter.
LangGraph remains a candidate, and the provisional IAM direction does not resolve
OD-012. This adoption selects none of those open mechanisms.

### Public HTTP hosting and additional adapters

Select Fastify for the public Node HTTP Host and register Connect handlers using
official `@connectrpc/connect-fastify` in that same server and process. Fastify
owns HTTP lifecycle/routes. Feature-owned Connect adapters validate and map public
messages into transport-free application input ports. Composition constructs each
capability once and passes its handles to inbound adapters. Fastify, Connect and
generated message types stay out of domain/application code.

Registration adds no separate network hop between Fastify and Connect; it is not
a zero-overhead claim. Actual webhooks and HTTP routes may share the Host where
ownership and trust allow. Neither Fastify nor Dapr supplies product authorization.
Private gRPC services and durable-only workers need no mandatory Fastify dependency.
Internal code does not call its own public API to reach an owned private adapter.

A future GraphQL adapter may invoke the same owned commands and queries through
the [additional API boundary](../architecture/sdk-and-transports.md#additional-client-api-styles).
Owned query composition, consumer ACLs, request caches, operation scopes and
authorization remain explicit; resolvers gain no private table access. This
adoption does not select GraphQL.

First public Host implementation qualifies exact Fastify/Connect versions with
the existing public contract and deployment probes: authentication, trusted scope,
typed failures, payload bounds, cancellation, streaming and admission before drain.
Reuse appropriate existing probes rather than duplicate their behavior solely
for a framework. OD-001 retains the local HTTP/1.1 UDS and Windows transport choice.

### Private service invocation and trust

Use feature-owned `proto3` services and standard gRPC through Dapr for actual
selected process boundaries. A generated gRPC client addresses its paired
sidecar; the adapter supplies the target route; the callee exposes the ordinary
gRPC service. Routing identity stays out of domain models, public resource IDs
and SDK contracts. A language-specific Dapr SDK is not the application contract.

Each participating Host instance has its own paired `daprd` process. Deployment
platform or Local Supervisor owns role/sidecar availability and lifecycle.
Qualified Dapr discovery/routing, resilience and telemetry do not provide AR
capacity, business scheduling, durable ownership or autoscaling.

Do not layer Moleculer, NATS Services RPC, a Channels fork or a custom discovery
and RPC bus over the same path. A different future private protocol needs a
boundary-specific reason and accepted successor. This adoption includes no Dapr
state, pub/sub, actors, jobs or workflows, and does not make Redis, actor placement
or the Dapr scheduler incidental product dependencies.

First deployment supplies exact releases, resolver/network, trust roots,
audiences, credential rotation, protected application hops, endpoint exposure,
rollout compatibility, admission, drain and recovery. Compose DNS is not proof
of Dapr discovery, and native multicast availability is not assumed. Kubernetes
requires its own environment evidence.

Workload enrollment, peer invocation, application-to-sidecar and
sidecar-to-application protection, and current product actor/tenant/delegation/
grant checks remain separate requirements. A reachable loopback port, live
sidecar or synthetic call does not qualify them. Qualify the actual transparent
gRPC path; another Dapr API's configured limit or policy is not equivalent proof.
Unsupported repeated App-ID/namespace combinations must be rejected unless the
real private proxy route is qualified. Retained Dapr 1.18.7 source findings are
conditional static evidence, not an executed exploit or a current-release claim.

### Contracts, transactions and uncertain outcomes

Declare delivered methods only, with generated codecs, Buf validation/evolution,
typed errors and trusted invocation profile at the first actual boundary.
Preserve exact integers, quantities, money, timestamps, presence, errors,
deadlines, cancellation, request identity and operation lookup. A schema alone
does not prove wire compatibility, authentication or retry safety. Protobuf,
gRPC contexts, Dapr types, Connect types and composition descriptors remain in
adapters/composition rather than application models.

Inbound adapters map validated wire data to owned input ports. Outbound adapters
implement narrow consumer-owned ports against Published Language. An alternate
language implementation must pass unchanged consumer contract fixtures before
portability is claimed; state migration and deployment work remain real.

Receipts, Operations, revisions, inboxes, outboxes, claims and fences remain with
the durable semantic owner. Caches and pending RPC promises are disposable.
One owner may have several qualified concurrent writer replicas. Discovery and
balancing convey no session, resource or partition custody. Owner constraints,
revisions, fencing and transaction isolation continue to enforce invariants.

One atomic operation stays in its owning transaction. No SQL transaction spans
RPC, contexts or distributed owners. Current assignment, immutable history,
command receipt and required outbox writes cannot be split among service owners.
Roles sharing an owner's schema retain one migration authority and explicit
mixed-version compatibility.

Finite operation deadlines and one retry budget apply across hops. Mutation
retries require a proven idempotency contract. Timeout or observation cancellation
does not prove failure, stopped effects or absence of commit. Stable request
identity, semantic fingerprint, authenticated scope and original outcomes survive
unknown replies. Reconcile at the original owner rather than creating a new
mutation during failover. Long work returns durable acceptance and an Operation
reference instead of relying on one live RPC promise.

### Direct durable JetStream delivery

Use official `@nats-io/transport-node` and `@nats-io/jetstream` behind the owned
broker-neutral delivery ports in local and hosted compositions. Do not adopt
`@moleculer/channels`, its fork or the deprecated monolithic `nats` package for
this profile. The SDK owns protocol mechanics; the adapter owns topology mapping,
bounded admission, publication outcomes and acknowledgement under owned policy.

One semantic subscription has one durable pull consumer shared by its replicas.
Different semantic subscribers keep independent consumers, inboxes and checkpoints;
one shared queue across independent owners would distribute rather than deliver
their facts. Consumers are not allocated per Agent, user or replica. AR source
feeds preserve their own Published Language and checkpoint contract. Semantic
publications retain one configured durable publisher and stable event identity.

The consumer validates envelope/schema and consumer ACL, invokes the application
port directly through its inbox/Unit of Work, and acknowledges only after owned
state and required next intents commit. It adds no Dapr or Moleculer hop merely
to invoke the operation. A durable-only worker receives no Dapr sidecar without
a real private RPC dependency. SDK pull-buffer size does not bound simultaneous
application handlers; enforce bounded handler admission separately.

Lost commit replies, duplicate delivery and failed or ambiguous outbox publication
remain recoverable with their original identities. External-effect owners retain
durable intents, idempotency and unknown-outcome reconciliation. `MaxDeliver` is
not a dead-letter store. Required terminal quarantine evidence and dead-letter
publication precede acknowledgement; either failure leaves the original
unacknowledged. Recovery preserves the recorded terminal decision and identity.

Application policy classifies retryable work; JetStream performs redelivery.
RPC retry and broker redelivery budgets cannot multiply an operation into
unbounded attempts. Incidental framework retries do not weaken deduplication or
effect guarantees. Disposable core events are allowed only where the owner
explicitly permits loss; they do not replace this durable path.

Composition owns adapter connections/resources; Supervisor owns local broker
availability without interpreting business events. Startup reconciles topology
and integrity before readiness. Shutdown closes admission and pulling, drains
within a bounded deadline and leaves unacknowledged work recoverable. Before
production use, qualify exact SDKs for replica sharing, bounded consumption,
acknowledgement after commit, duplicates, lost replies, failed/ambiguous publication,
failed quarantine and interrupted shutdown, plus existing tenant/ordering/retention
requirements. Documentation is not that evidence.

### Native PostgreSQL and one persistence authority

Native PostgreSQL is authoritative for server and Fully Local profiles. SQLite
and PGlite are not authoritative fallbacks. The initial local topology is one
cluster and application database per Target data root, with a schema per bounded
context. Clients, projects, workspaces and Agents share the selected Target.
OD-021 retains installation-channel and Target-cardinality details.

Desktop/CLI/SDK clients use the Target's Host API and authorized feeds, with no
SQL credentials or direct database lifecycle authority. Hosted-target Desktop
starts no unused local database. Caches are disposable; switching Targets neither
migrates tables nor retries commands elsewhere. Context movement remains explicit
versioned logical transfer with validation, receipts and reconciliation.

The TypeScript Host uses asynchronous node-postgres and adapter-local Drizzle.
Applicable local and hosted adapters reuse context-owned PostgreSQL schemas,
immutable migrations, codecs, mappings and semantic suites. Actual engine versions,
extensions, collation, encoding and operational configuration are qualified inputs.
Do not infer equivalence from the PostgreSQL name alone.

Each context owns tables, migrations, Unit of Work, receipt, inbox, outbox,
projections and dispatch records. Its business transition, revision, durable
receipt and required intents commit atomically on one checked-out client.
No cross-context transactions, table writes, joins or foreign keys are introduced.
Lost acknowledgements reconcile by original command identity. Exact values,
tenant predicates, constrained roles, short transactions, fairness and stable
outcomes remain required. Capability-owned concurrency evidence applies locally
as well as on hosted PostgreSQL.

Budget connections across all simultaneously live context roles, workers and
replicas, including rollout overlap, terminating processes and server-retained
connections until qualified cleanup. Do not allocate a pool per Agent. Local
engine budgets and failure domains do not inherit hosted HA or capacity claims.

### Supervisor component and operational qualification

Select `embedded-postgres` as the Node PostgreSQL launcher approach behind a
narrow Local Supervisor component adapter. Supervisor policy consumes typed
capabilities/outcomes; wrapper defaults, classes, process handles and global hooks
stay inside that adapter. The Host/context owns SQL connections, schema migration,
transaction and recovery validation; Supervisor owns bundled binary, process,
protected data root, endpoint and activation custody.

This selects neither the research `18.4.0-beta.17` package nor an exact production
engine/helper/artifact matrix. OD-003 and OD-021 retain that qualification. It
does not introduce Rust solely for a wrapper or commit to two maintained launchers.
A proven limitation may use qualified standard PostgreSQL tools inside the same
adapter as an explicit implementation choice, never silent startup fallback or
reset of existing data.

Qualify bootstrap credential protection, configured endpoints, readiness, timeout,
already-exited children, process errors, global exit hooks and foreign-process
rejection. Signed offline packaging, integrity, data/process custody and supported
OS/architecture tuples need actual installed-package evidence. Windows/macOS do
not inherit Linux results. Initial implementation need not implement automatic
updates before beginning qualification, but shipped transition paths require it.

Component/Host activation, schema migration and engine upgrade remain distinct.
Fence old writers, checked-out clients and dispatchers before transferring
mutation authority. A candidate health check cannot migrate the old Host's live
database. Rollback must be compatible with current accepted data; retained files
alone do not prove safe rollback, including after a hard-link engine upgrade.
Normal availability recovery never resets an existing cluster.

Backup evidence includes actual restore into a clean isolated data root,
context/blob validation and explicit reconciliation before restored dispatch.
One SQL snapshot is not an atomic backup of NATS, AR and external effects.
Missing restored receipts do not prove effects never occurred; restored epochs
are not fresh authority. Every released platform and capability follows the
[packaged PostgreSQL qualification](../architecture/local-host-lifecycle.md#packaged-postgresql-qualification)
and owning recovery rules. Launcher selection is not release qualification.

### Role placement from first materialization

Retain the headless, event-driven modular core, Clean Architecture, Full DDD,
context-owned transactions, versioned contracts and partial-failure semantics.
Replace universal initial single-process placement and later-only extraction
with the [canonical service role map](../architecture/deployment-profiles.md#service-role-map).
Its coarse roles cover Control, Team Topology, Coordination, Observation ingestion,
Observation query, Derived data, Agent Context, Workspace mechanics and Outbound
effects. Semantic owner, capability group, role and interchangeable replica are
different identities; none is derived automatically from a feature, Protobuf
method, Agent, Team, Run or runtime session.

Every selected isolated role is an independently runnable OS process with its
first owning feature. A worker thread, local router or deployment label inside
another Host is insufficient. That first change includes its static composition,
real consumers, contract, deployment mappings, lifecycle, bounds and rejecting
checks in the required runner. No empty role packages, deferred extraction or
same-process production fallback are introduced. Several contexts may share a
permitted role while preserving transactions, writable schemas and repositories.

Control Host to Team Topology's whole implemented S3 persistent Team create/get/list
subset is the first stateful private boundary, using a narrow consumer port and
standard gRPC through Dapr in separate processes. Control constructs no duplicate
Team Topology implementation and accesses no private tables. S1/S2
`CheckTeamDraft` remains a pure module/public-contract proof. Future Team methods,
versions, roster changes, cloning and templates need their own admission; the
larger capability-group name does not include them in S3. Canonical ADR-0103's
scoped sandbox business admission remains intact.

The default server integration path and required CI exercise the actual
process/Dapr boundary from S3. Fast in-process unit/contract tests remain useful
but cannot replace that integration or become a production fallback. Both Compose
and Kubernetes mappings accompany each selected role's first implementation.
Compose is the initial development/small-server form; Kubernetes is the large-cloud
form. Each needs actual environment evidence. Rendered manifests or one form's
execution do not qualify another. Native role/sidecar pairs follow ADR-0115.

Background Approval/Consumption Governance lifecycle work belongs in Coordination
when admitted. Usage Metering retains its own source admission, checkpoints and
quarantine authority. Observation subscriber delivery and AR source checkpoints,
workspace affinity/custody, and reserved cancellation/recovery progress remain
separate concerns. One semantic mutation owner can have many qualified replicas;
process availability is distinct from AR execution custody.

### Concurrent execution and required evidence

Design for thousands of simultaneously executing Agents across independent Runs,
including concentrated load within one Team/tenant, with concurrent users/devices.
Stored definitions, queued work and idle sessions do not establish the target.
Qualify per-Run capacity separately, including the largest advertised semantic
Run; do not split one semantic Run artificially to claim capacity. This is not
a claim of measured capacity or an approved numerical SLO.

Every advertised capacity states its actual workload, executions, clients, queues,
replicas and resource envelope, and demonstrates bounded overload, tenant fairness
and isolation, cancellation and recovery. SQL/sidecar budgets and concentrated
tenant effects remain explicit. A shared process may bound interference; it
cannot promise independent process-crash, OOM or credential isolation. OD-030
retains numerical reliability calibration and owner approval.

First dependency/role materialization still needs the accepted owner/contract,
exact production release pins, composition, qualified discovery/trust/lifecycle,
real consumer and existing package/readiness gates. Stateful RPC evidence covers
serialization/scope, typed failures, conflicting writes, stale revisions, lost
reply after commit, restart, original-result lookup and applicable fencing.
Process evidence covers caller/callee loss, unavailable dependencies, startup,
admission, bounded overload/drain, recoverable work and rejection of backend bypass.
Language replacement and native/Compose/Kubernetes profiles require their own
representative conformance. Known failed safety/protocol cases must be resolved
by a qualified supported release/configuration before admission.

Add tests only for concrete plausible risks insufficiently covered by existing
evidence, at the smallest sufficient layer. Do not duplicate suites solely for
framework names or inflate coverage with implementation-mirroring assertions.
Mandatory security, concurrency, lifecycle and release gates remain required.

### Bounded supersession and preserved obligations

Supersede ADR-0001 only for universal initial single-process placement and
later-only extraction. Preserve its headless, modular, event-driven and
context-owned core principles.

Supersede ADR-0011's SQLite/PostgreSQL topology and rejection of auto-managed
local PostgreSQL. Replace only the following additional local SQLite requirements:

- ADR-0025: `node:sqlite`, synchronous local command lanes and their default
  Worker-promotion path;
- ADR-0048: local SQLite authority and SQLite-specific recovery artifacts;
- ADR-0052: paired SQLite/PostgreSQL repository trees, dialect migrations and
  local SQLite dependency readiness.

Their other requirements remain in force, including capability-scoped Unit of
Work, post-commit effects, single authority, logical transfer and adapter-local
Drizzle. Exact-value, DDD, consistency-evidence and context ownership guarantees
remain intact. Earlier local SQLite examples/research remain historical and do
not require a second current engine. These bounded replacements do not retire
the complete ADR-0025/0048/0052 records.

ADR-0113 owns the separate composition/version supersession and ADR-0115 owns
the local release-scope supersession. ADR-0091/0093 retain qualification, ADR-0097
retains materialization policy, and existing strategic context statuses and
unresolved models remain unchanged. Placement does not accept or implement
Review Management, Automation/Scheduling or external integration management.

Preserve all immutable predecessor bodies and main's existing baseline entries.
Only permitted predecessor lifecycle metadata changes, with this new accepted
record appended through the supported baseline command. Original source ADRs,
ledger and commits remain unchanged; their source IDs are not reassigned.

## Consequences

- Canonical main has one unambiguous backend adoption while retaining sandbox
  admission and the original published decisions as immutable evidence.
- Public Connect/Fastify, private standard gRPC/Dapr, direct JetStream, PostgreSQL,
  workflow adapters, realtime delivery and AR execution keep distinct owners.
- Process isolation begins with real features, retaining cheap local typed calls
  within roles and preserving one semantic implementation per owner.
- Native distribution and real service boundaries carry operational cost; a
  selected library, documentation, synthetic experiment or passing schema check
  does not remove packaging, trust, deployment, recovery or capacity work.
- No production dependency, package, transport implementation, database migration,
  numerical SLO or qualification claim is introduced by this integration record.

## Rejected alternatives

- Rewrite/renumber accepted source ADRs, overwrite main's sandbox identity or
  replace the accepted ledger to make branch integration appear conflict-free.
- Protobuf with a product-owned discovery/RPC/retry framework, Moleculer packet
  RPC as the common polyglot path, or durable messages routed through an extra
  invocation hop without an actual dependency.
- A service per feature/context/Agent, an empty fleet, or same-process fallback
  for a selected isolated role: none satisfies the approved placement policy.
- SQLite/PGlite fallback, duplicated dialect trees, Desktop SQL access or implicit
  Target synchronization: creates competing authority or duplicate semantics.
- Treat Dapr as the public product API, put Fastify in every worker, or host
  Fastify as a separate proxy in front of another Connect server by default.
- Promote research pins or synthetic results into production release/scale claims,
  or select unresolved workflow/IAM mechanisms while reconciling history.
