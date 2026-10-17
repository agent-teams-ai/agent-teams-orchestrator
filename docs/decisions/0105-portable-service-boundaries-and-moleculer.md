---
id: ADR-0105
type: adr
status: proposed
owner: architecture/contracts
summary: Define portable contracts and an initial Moleculer default for declared private Node.js RPC groups.
related:
  - ADR-0004
  - ADR-0005
  - ADR-0016
  - ADR-0017
  - ADR-0103
  - ADR-0104
  - ADR-0107
  - architecture.composition
  - architecture.context-map
  - architecture.dependency-rules
  - architecture.eventing
  - architecture.public-control-contracts
  - architecture.sdk-transports
  - domain.contexts.team-topology
  - domain.contexts.execution-observation
  - domain.contexts.agent-context
  - domain.contexts.human-notification
  - domain.contexts.workspace-registry
  - OD-011
  - OD-026
---

# ADR-0105: Portable Service Boundaries and Moleculer

## Context

The product must support a modular monolith, selective service extraction, and
replacement of an implementation by one written in another language with minimal
changes to its consumers. The product owner asked to evaluate Moleculer so that
service discovery, routing, and resilience do not become a custom framework.
The owner prefers integrating that adapter with the first selected private
Node.js RPC capability, accepting bounded early integration work instead of
deferring the framework decision until distributed deployment.

Moleculer is a Node.js and TypeScript microservices framework, not only an RPC
client. Its registry, discovery, load balancing, lifecycle, resilience,
middleware, metrics, and tracing are the reusable infrastructure selected for
these groups. The same service implementation can run locally or remotely;
avoiding a later rewrite of this infrastructure is a principal reason to adopt it.
Its packet protocol and service context are not the language-neutral API of this
platform. A language rewrite necessarily changes
the rewritten implementation; the intended portability guarantee protects its
consumers, contracts, state ownership, and observable behavior.

ADR-0016 and ADR-0017 already select public Protobuf, Buf, Connect, and a
cross-language contract profile. This proposal extends the reasoning to actual
private service boundaries without converting every internal API into an RPC.
Get Modular static composition is a separate concern governed by ADR-0104.

## Decision

This ADR is proposed. The following placement and private wire profile require
review; they do not install Moleculer, select a production dependency version,
or bypass the [implementation readiness gates](../architecture/implementation-readiness-gates.md).

### Select boundaries by capability

| Area | Proposed Moleculer role | Ownership and extraction rule |
|---|---|---|
| Domain and application | None | Pure domain and typed consumer-owned ports; no framework types or service locator |
| Host composition | Construct and start one broker for the selected local Node.js RPC profile | Get Modular assembles the Host; one owner constructs and stops each resource |
| An explicitly declared private Node.js RPC group | Planned default adapter from its first implementation, initially in one process | Select the capability boundary before wiring; thin adapters preserve published semantics and prepare discovery, balancing, and resilience for qualified remote placement |
| A capability with an independent language requirement | No mandatory Moleculer layer | Feature-owned Protobuf and an explicit Connect or gRPC profile define the portable boundary |
| Team, agent, Run participant, or runtime session | No automatic broker or service per entity | Scale capability workers and AR capacity, not one framework node per business object |
| JetStream, AR, Temporal, and Centrifugo | Preserve their existing roles | Durable delivery, execution, workflow scheduling, and client fan-out retain their own contracts |

The [context map](../architecture/context-map.md#mapping-vocabulary) distinguishes
semantic ownership, feature scope, Get Modular construction, package identity,
and execution placement. An independently deployed capability may contain several
features; an entry or nested feature does not itself justify a service. Record
the owner, callable capability, state and transaction boundary, and execution
placement before selecting its RPC or durable delivery mechanism.

The [planned service groups](../architecture/context-map.md#planned-service-groups)
name the first product group and later opportunities using existing context
owners. Team Topology's Agent and Team definitions and versioned roster are the
first planned private Node.js group; the implemented subset begins with S3
persistent Team creation and retrieval. `CheckTeamDraft` is one capability and
an adapter fixture, not the product service boundary. Group selection neither
creates a new bounded context nor expands the existing delivery slices.

The proposed default applies from the first implementation of a declared private
Node.js group. Separate processes do not need to be justified at that point.
Each call still names its real consumer, owner, state, and failure contract.
Ordinary features, `.proto` files, and entity instances do not create services.
Human notification delivery uses the existing durable pull-consumer profile
unless a separate request/reply capability is justified. Workspace mechanics
retain resource affinity and allocation/binding generations; balancing cannot
substitute for access or custody. Hundreds of agents do not imply hundreds of
brokers or independently deployed services.

### Use the framework's service infrastructure

Thin adapters isolate framework types; they do not replace its mechanisms with
product-maintained alternatives. The initial profile deliberately configures
the applicable built-in facilities rather than relying on their defaults:

| Facility | Planned use and ownership |
|---|---|
| Registry, action routing, discovery, and load balancing | Moleculer owns these mechanisms for the selected group. Local routing works from the first slice; remote discovery and balancing are configured when that placement is qualified. No parallel custom registry or RPC bus |
| Service lifecycle and request tracking | Host owns the broker resource and calls its start/stop operations; Moleculer manages registered service readiness and bounded request drain. Set `skipProcessEventRegistration: true` so broker signal handlers do not become a second process-lifecycle owner |
| Timeouts and bulkheads | Configure finite RPC deadlines and per-action concurrency and queue limits using the built-in middleware. Reject expired RPC admission and follow the owning operation's effect-deadline policy; a caller timeout does not cancel accepted durable work |
| Circuit breakers and retries | Configure applicable dependency failure isolation with owned error classification. Automatic mutation retries stay off unless the idempotency contract permits them; no fallback may invent a successful product outcome |
| Metrics, tracing, and middleware | Enable bounded operational telemetry and use the existing observability adapter profile for correlation, classification, and exporters. Wire validation and invocation mapping at the adapter; do not export payloads or unbounded tenant/entity labels |
| Caching and core events | Use only for explicitly disposable, authorized data or signals. Cache scope and invalidation belong to the capability; durable work remains on JetStream |

Framework limits bound an action or broker, not total tenant fairness, database
connections, or AR execution capacity. Compose them with the existing owners'
budgets rather than inventing a second global scheduler. Local preference is a
routing optimization, not data ownership or proof of balanced replica traffic.
The first production profile proves overload rejection and drain as well as
successful calls. Existing in-flight durable work remains recoverable after drain
times out.

### Initial Node.js RPC deployment profile

The initial deployment uses one local Moleculer broker in the selected Host role,
with no transporter. This can be the production topology after its lifecycle and
capability behavior are qualified; it is not restricted to development. Get
Modular constructs application capabilities once. Moleculer adapters register
and invoke those handles rather than constructing a second feature graph.

Use the declared Protobuf models and official generated codecs at this selected
boundary, including the local adapter. Application ports retain their own types.
Local invocation must not gain shared mutable request or response objects that
would disappear across a process boundary. The adapter owns bounded payloads,
stable action mapping, typed errors, and the capability's trusted invocation
profile. Do not create a general-purpose RPC wrapper or a service per schema.

Copy and allowlist invocation facts at the boundary. Returned broker metadata
cannot change authenticated authority or mutate another call's context. A caller
deadline bounds observation; it does not prove that the handler stopped or that
an effect did not happen. Propagate the operation's applicable deadline and
cancellation policy explicitly, preserving durable acceptance and reconciliation.

Moving that group to separate processes changes composition, routing, and
deployment configuration. It also introduces network transport, authenticated
service identity, network failures, resource placement, and recovery obligations
that a local deployment cannot qualify. The same application port and consumer
contract survive; zero deployment work or zero implementation changes are not
promised. No distributed transporter is selected by the local default.
Moleculer routes calls among available instances; the deployment platform starts
and scales those instances. Broker discovery is not an autoscaler or AR's
execution-capacity authority.

### Preserve portable contracts

For a selected independently executable capability, define its feature-owned
`proto3` contract, Buf validation and compatibility checks, and explicit wire
profile with its first implementation, even when initially in the Host process.
The first slice supplies a real consumer and behavior; a possible future
extraction does not create speculative services or placeholder packages.
Ordinary internal features keep typed in-process APIs and declared dependency
edges without a Protobuf service for each feature or helper.

For a selected portable standard-RPC capability, evaluate Connect's
`createRouterTransport` for the initial in-process adapter and standard Connect
for remote placement. It reuses the declared service and binary serialization
without a listening HTTP server. This is a production candidate requiring
qualification, not a qualified product dependency. Configure bounded message
sizes, trusted call context, authorization, errors, deadlines, and cancellation
for the selected operation; do not adopt the unbounded default message limits
or mistake a local test for HTTP/2, proxy, or network-failure evidence.

A capability may instead select gRPC over HTTP/2 when its consumer or language
boundary requires that profile. A qualified endpoint may support both protocols.
The public Connect edge and handwritten SDK retain their accepted contracts.
Existing integration events keep their separate feature-owned JSON Schemas;
AR keeps its own Published Language.

The schema alone does not select a wire protocol. A plain gRPC server does not
automatically accept Connect requests. Consumers using Connect need a
Connect-capable replacement, a qualified bridge, or an explicit transport change.
Private gRPC clients can retain their protocol when the replacement exposes the
same gRPC service. Browser clients continue through the public Connect edge.

Domain and application models do not import Protobuf messages,
Get Modular types, Moleculer contexts, or Connect handler contexts. Adapters own
serialization, validation, transport error mapping, and trusted call context.
The selected portable boundary cannot depend on shared object mutation or a
database transaction that would disappear across a process boundary. Its local
and remote adapters preserve the same consumer contract; deployment changes
still require the actual transport, resource, and failure qualification.

Get Modular APIs stay in `composition/**` and tests. Host composition selects
local or network adapters without a second global service locator or mandatory
Moleculer wrapper on every RPC. The private Node.js group follows the initial
profile above; public and language-neutral Connect/gRPC boundaries retain their
own adapters. A separately justified Moleculer facade over a foreign
implementation retains an explicit Node.js deployment dependency. Its mapping
of errors, deadlines, metadata, and retries is part of the qualified adapter,
not an invisible compatibility promise.

### Keep failure state with its owner

Several Host replicas may execute independent operations concurrently. They do
not share authority through a process-global map, a preferred local endpoint,
or a framework registry. Context persistence owns command receipts, operation
state, inboxes, outboxes, and revisions. The context defines the necessary
transaction isolation, claim leases, and fencing for each invariant or dispatch
partition; this is not one global serial writer for the platform.

AR remains the owner of runtime sessions, execution leases, and private fences.
Moleculer discovery, load balancing, and sharding do not confer session ownership.
In-memory caches and pending requests remain disposable. A replica restart must
recover accepted work from the owning durable state.

A durable command retains its authenticated scope, stable request identity,
semantic fingerprint, and original outcome across transport changes. A timeout
is not proof that a side effect did not occur. Unknown outcomes reconcile with
the original owner; routing changes cannot resend the mutation to a second owner
under a fresh identity. Long-running agent work returns durable acceptance and an
operation reference rather than relying on one live RPC promise.

### Separate service RPC from durable delivery

Moleculer Core NATS RPC and core events do not replace JetStream durability.
Core events may carry disposable notifications where permitted; authoritative
commands and facts retain the context-owned outbox, inbox, and outcome contracts.
The paths may use the same NATS deployment, with separate subjects and roles.
Disabling the Moleculer transporter locally does not remove the JetStream
dependency of durable channels.

[ADR-0107](0107-jetstream-sdk-for-durable-delivery.md) selects the narrow durable
delivery adapter using the official modular NATS SDK and shared durable pull
consumers. Channels and a product-maintained Channels fork are not selected.
Each publication and subscription has one configured durable implementation.
Validation and consumer ACL mapping precede the owned application port. The inbox
decision and context state changes share the owning transaction; acknowledgement
follows its durable commit. The handler is not forwarded through Moleculer
merely to execute its application operation.

For the selected Moleculer RPC profile, automatic mutation retries remain off
unless the operation's idempotency contract and one retry budget across its hops
justify them. This is a budget per logical operation, not a new global retry
coordinator. JetStream redelivery still requires its independent inbox and
external-effect reconciliation contracts.

The inspected Moleculer Core NATS transporter also loads the monolithic `nats`
package. Rejecting Channels does not remove that dependency. A future Moleculer
profile must qualify its actual transporter and dependency policy separately;
this proposal neither authorizes the legacy dependency nor commits to writing
another transporter. No registry, retry engine, or lifecycle owner is added for
work already handled by the selected adapters.

### Adoption and qualification

Qualification follows the scope being materialized or claimed. A narrow Node.js
slice does not require a language rewrite or a hundreds-of-agents benchmark
before it can proceed through its existing implementation gates.

Keep the existing S1/S2
[`CheckTeamDraft` slices](../domain/contexts/team-topology/README.md#first-development-slice)
as the module and public Protobuf/Connect proof. The public path exercises real
HTTP between two processes under its existing contract profile. The checker may
supply a small private adapter fixture; S2 does not require a product Moleculer
service or a new deployment. The disposable experiment below is also an adapter
proof, not the first delivered product group.

The first product integration is Team Topology's declared private group with
S3 persistent Team create/get/list. Later owned Agent, version, roster, clone,
and template capabilities may join that group as their slices are delivered.
This does not add them to S3 or freeze unimplemented methods in a `.proto` file.
Team Topology owns its application ports; Get Modular constructs the actual
implementations once. The public Connect edge reaches the selected private
group through typed ports and its local Moleculer client adapter. S4 Run
`team-activation` is a separate consumer through its own outbound port and ACL,
never a direct import of Team implementation or tables.

The public and private edges are distinct boundaries. They do not require two
transports for the same private hop, and public wire models need not equal the
private models. Within the group, ordinary feature calls remain local typed
collaboration. Agent assignment uniqueness, immutable Team versions, ETag/CAS,
command receipt, and required outbox writes retain one Team Topology transaction;
Run admission and AR execution remain outside it.

The first state-changing subset qualifies concurrent assignment conflicts where
applicable, stale revisions, commit followed by lost reply, and restart plus
lookup of the original command result. Pure checker fixtures cannot supply that
evidence. OD-006, OD-011, the public-contract decisions, and implementation
readiness still govern the exact subset; the group plan does not close them.

| Stage | Required evidence |
|---|---|
| Before materializing a dependency or adapter | Accepted owning decision, exact versions, capability boundaries, ports, state and lifecycle owners, and the selected deployment profile |
| Before production use of the initial Node.js profile | Construction, cleanup, trusted scope, command and operation behavior, bounded retries, and the recovery requirements of that actual local or remote topology |
| Before production use of distributed Node.js capabilities | Real remote serialization and typed failures, restart/failover from durable owner state, unknown outcome after mutation, scoped ownership and fencing, and one bounded retry policy across the deployed hops |
| Before claiming replacement by another language | One representative capability replaced while consumer business code and contract fixtures remain unchanged, covering exact values, authorization, deadlines, duplicates, typed errors, unknown outcomes, and operation lookup |
| Before claiming a workload or capacity target | Load evidence for that profile's declared active-agent, client, queue, and resource budgets, including saturation and recovery |

The selected durable adapter additionally proves the existing delivery
contract before production use: shared durable pull-consumer identity across
replicas, bounded admission, acknowledgement after durable handling, failed and
ambiguous publication propagation, safe quarantine after dead-letter publication
failure, and bounded drain with recoverable work. These requirements apply when
that adapter is introduced, not to unrelated local capability construction.

Each stage qualifies the selected adapters and product contract. It does not
require implementing a private service registry, RPC protocol, workflow engine,
or a framework abstraction for every library. Production claims remain limited
to the topology and behavior actually qualified.

### Disposable adapter experiment, 2026-10-17

A synthetic diagnostic capability passed the same generated-Protobuf fixtures
through one local broker and two real processes using the official TCP
transporter. The isolated Linux network namespace contained only loopback.
The experiment used Node 26.11.1, Moleculer 0.15.2, Protobuf-ES 2.16.0, and
Buf 1.74.0, with exact dependency locks and source digests in its evidence.

All eleven reported result groups passed. They include exact `uint64` values
above `Number.MAX_SAFE_INTEGER`, optional-field presence, detached values,
owned typed errors, fixture scope propagation, payload bounds, deadlines, and
bounded shutdown. Raw calls separately demonstrated shared local parameters and
results, returned metadata merging into caller metadata in both topologies, and
a handler completing after caller timeout. These findings motivate the explicit
boundary rules above; a successful RPC does not qualify durable command behavior.

The fixture encoded Protobuf bytes inside Moleculer JSON packets; that encoding
is experimental, not a selected production wire profile or a Connect/gRPC
endpoint. The scope facts were synthetic, without an authenticator. No product
`CheckTeamDraft` implementation, Get Modular assembly, production service
authentication, NATS transporter, durability, failover, language replacement,
or workload capacity was exercised.

The reproducible source, generated schema output, lockfile, sanitized results,
and evidence are in `ato-moleculer-boundary-spike-20261017.tar.gz`, supplied with
the architecture review. SHA-256:
`1d1e4209c37ccb81c1812c4dfa4a0dc836b0b16d0bc549989431076d35adc83c`.
This evidence supports the proposed placement; it does not install the adapter
or satisfy the owning product implementation gates.

### Inspected upstream evidence

Inspection date: 2026-10-17. These are research pins, not installed dependencies
or product qualification results.

| Source | Evidence relevant to this proposal |
|---|---|
| [Moleculer 0.15 guidance](https://moleculer.services/docs/0.15/index.html) | Supports modular-monolith deployment; identifies Node.js as the first-class ecosystem and other-language implementations as third-party |
| [Moleculer lifecycle](https://moleculer.services/docs/0.15/lifecycle.html) and [0.15.2 broker defaults](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/service-broker.js) | Built-in signal handling can exit the process; tracking, bulkheads, metrics, and tracing require deliberate configuration. Host composition retains process ownership |
| [Moleculer 0.15.2 bulkhead](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/middlewares/bulkhead.js) | `maxQueueSize: 0` skips the queue-size check in this pin; it is not immediate rejection. A bounded queue needs a positive configured limit and overload evidence |
| [Moleculer 0.15.2](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/CHANGELOG.md) | Uses protocol v5; 0.15 removed ProtoBuf, Avro, and Thrift serializers from core. A serializer is not a gRPC protocol implementation |
| [Moleculer Go version](https://github.com/moleculer-go/moleculer/blob/60212c60d627433b409a5a4b9f6f1ad6b25b1a77/version/version.go) | The inspected implementation declares protocol v4; interoperability with JS 0.15 cannot be assumed |
| [Moleculer Java](https://github.com/moleculer-java/moleculer-java/blob/dddb4bbde930b24b89ac9f70de9a616bf6a92340/README.md) | Declares v5 / JS 0.15 compatibility; other-language integration is possible but still requires the selected capability's conformance evidence |
| [Moleculer sidecar](https://github.com/moleculerjs/sidecar/blob/a2cc0ba6e3152e1bfc9f147bcce804fcd7fd3a8c/README.md) | Labels itself WIP; this proposal does not treat it as a qualified production bridge |
| [Connect ES 2.2.0](https://github.com/connectrpc/connect-es/blob/378bb8fde1209afc3ab6a9b0aa97c00d0db58c24/README.md) and [Connect Go 2.0.1](https://github.com/connectrpc/connect-go/blob/f86de812094e37f7e975f969c8cc85818cbbc9d7/README.md) | Stable implementations of Connect, gRPC, and gRPC-Web; actual server, HTTP/2, toolchain, and proxy profiles remain explicit |
| [Connect in-process transport](https://github.com/connectrpc/connect-es/blob/378bb8fde1209afc3ab6a9b0aa97c00d0db58c24/packages/connect/src/router-transport.ts) | Routes binary Connect through local handlers; message-size defaults are unbounded for product purposes and real network behavior is not exercised |
| [Moleculer Core NATS transporter](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/transporters/nats.js) | Loads the monolithic `nats` package; dependency qualification remains necessary even without Channels |
| [Channels 0.3.1 NATS adapter](https://github.com/moleculerjs/moleculer-channels/blob/16d6aec31c04b127b0c818d24f324e0235a82517/src/adapters/nats.js) | Uses push subscriptions and the monolithic NATS client; it is not the accepted shared durable pull-consumer profile without adaptation and qualification |

## Consequences

- A declared private Node.js RPC group integrates Moleculer with its first
  implementation and may remain in one production process. This trades bounded
  early adapter work for avoiding a later framework retrofit at that boundary.
- A schema does not select deployment: ordinary features retain local APIs, and
  public or independently language-neutral services retain Connect/gRPC.
- Local composition remains simple; service extraction changes adapters and
  deployment wiring instead of forcing framework types through business code.
- Public and private contracts remain separate surfaces, requiring deliberate
  mappings and compatibility tests rather than automatic schema reuse.
- A foreign-service facade has an operational cost and can preserve a Node.js
  dependency. Direct standard RPC at a real boundary avoids making that facade
  permanent by default.
- Service discovery and retries do not remove durable ownership, concurrency,
  tenancy, workflow, or execution responsibilities. Library adoption, deployment
  readiness, language replacement, and capacity claims have separate evidence
  gates.

## Rejected alternatives

The proposal excludes these alternatives:

- making every feature or Get Modular module a network service: composition
  boundaries alone do not justify RPC or independent deployment;
- using the Moleculer packet protocol as the mandatory cross-language platform
  API: this ties replacement to a third-party implementation or Node.js bridge;
- treating Protobuf encoding as gRPC compatibility: schema, encoding, transport,
  and method semantics must all agree;
- placing Moleculer beside a custom registry, RPC bus, and retry engine for the
  same calls: that duplicates the responsibility the framework should remove;
- replacing durable eventing with core framework events or assuming Channels is
  already qualified: both bypass the existing delivery and recovery contracts;
- sharing mutable state or a global lock across Host replicas: failure state and
  concurrency decisions belong to explicit durable owners and invariant scopes.
