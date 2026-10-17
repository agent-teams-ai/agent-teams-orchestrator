---
id: ADR-0105
type: adr
status: proposed
owner: architecture/contracts
summary: Define portable service contracts and a bounded Moleculer role without turning every module into a network service.
related:
  - ADR-0004
  - ADR-0005
  - ADR-0016
  - ADR-0017
  - ADR-0103
  - ADR-0104
  - architecture.composition
  - architecture.dependency-rules
  - architecture.eventing
  - architecture.public-control-contracts
  - architecture.sdk-transports
---

# ADR-0105: Portable Service Boundaries and Moleculer

## Context

The product must support a modular monolith, selective service extraction, and
replacement of an implementation by one written in another language with minimal
changes to its consumers. The product owner asked to evaluate Moleculer so that
service discovery, routing, and resilience do not become a custom framework.

Moleculer directly supports local and distributed Node.js services. That is a
useful implementation option, but its packet protocol and service context are not
the language-neutral API of this platform. A language rewrite necessarily changes
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
| Host composition | Construct and start one broker when that profile needs it | Get Modular assembles the Host; one owner constructs and stops each resource |
| Local or distributed Node.js capabilities | Candidate service registry, RPC, discovery, balancing, and resilience | Thin adapters preserve published capability semantics and context ownership |
| A capability that may be replaced by another-language service | Optional Node.js facade, not the canonical wire protocol | Versioned language-neutral schema and an explicitly qualified network profile |
| Human Notification delivery worker | Candidate extraction if independent scaling is justified | Human Notification keeps delivery policy, state, receipts, and retries |
| Workspace Registry materialization capability | Candidate extraction if independent scaling is justified | Workspace Registry retains workspace ownership; AR retains provider execution |
| Team, agent, Run participant, or runtime session | No automatic broker or service per entity | Scale capability workers and AR capacity, not one framework node per business object |
| JetStream, AR, Temporal, and Centrifugo | Preserve their existing roles | Durable delivery, execution, workflow scheduling, and client fan-out retain their own contracts |

These examples reserve no new packages and accept no new bounded contexts. A
context or feature becomes independently deployable only when scaling, failure
isolation, ownership, or a language requirement justifies that boundary. A Get
Modular module is a composition unit, not automatically a deployable service.
Hundreds of agents do not imply hundreds of Moleculer brokers.

### Preserve portable contracts

At a real independent RPC boundary, propose feature-owned `proto3` contracts,
Buf validation and compatibility checks, and gRPC over HTTP/2 as the baseline
for replacement by another-language service. An explicitly declared and
qualified endpoint may support both Connect and gRPC. The public Connect edge
and handwritten SDK remain unchanged. Existing integration events keep their
separate feature-owned JSON Schemas; AR keeps its own Published Language.

The schema alone does not select a wire protocol. A plain gRPC server does not
automatically accept Connect requests. Consumers using Connect need a
Connect-capable replacement, a qualified bridge, or an explicit transport change.
Private gRPC clients can retain their protocol when the replacement exposes the
same gRPC service. Browser clients continue through the public Connect edge.

Ordinary context-internal calls retain curated internal APIs and declared
dependency edges. Domain and application models do not import Protobuf messages,
Get Modular types, Moleculer contexts, or Connect handler contexts. Adapters own
serialization, validation, transport error mapping, and trusted call context.
Local execution cannot depend on shared object mutation or a database transaction
that would disappear across a process boundary.

Get Modular APIs stay in `composition/**` and tests. Host composition selects
local, Moleculer, or network adapters; it does not add a second global service
locator. A Moleculer facade over a foreign implementation remains an explicit
Node.js deployment dependency. Its mapping of errors, deadlines, metadata, and
retries is part of the qualified adapter, not an invisible compatibility promise.

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

The Channels NATS adapter is a candidate, not a drop-in selection. Compare:

1. an upstream-compatible adapter update satisfying the existing modular NATS SDK
   and durable pull-consumer profile;
2. the existing approach of a narrow delivery adapter using the official modular
   NATS SDK while Moleculer handles service RPC only.

Each publication and subscription has one configured durable implementation.
Neither option adds a parallel event bus, retry engine, or lifecycle owner for
the same work. A core transporter also needs dependency qualification; framework
adoption does not silently authorize the deprecated monolithic `nats` dependency.

### Adoption and qualification

Qualification follows the scope being materialized or claimed. A narrow Node.js
slice does not require a language rewrite or a hundreds-of-agents benchmark
before it can proceed through its existing implementation gates.

| Stage | Required evidence |
|---|---|
| Before materializing a dependency or adapter | Accepted owning decision, exact versions, capability boundaries, ports, state and lifecycle owners, and the selected deployment profile |
| Before production use of the initial Node.js profile | Construction, cleanup, trusted scope, command and operation behavior, bounded retries, and the recovery requirements of that actual local or remote topology |
| Before production use of distributed Node.js capabilities | Real remote serialization and typed failures, restart/failover from durable owner state, unknown outcome after mutation, scoped ownership and fencing, and one bounded retry policy across the deployed hops |
| Before claiming replacement by another language | One representative capability replaced while consumer business code and contract fixtures remain unchanged, covering exact values, authorization, deadlines, duplicates, typed errors, unknown outcomes, and operation lookup |
| Before claiming a workload or capacity target | Load evidence for that profile's declared active-agent, client, queue, and resource budgets, including saturation and recovery |

A Channels or other durable adapter additionally proves the existing delivery
contract before production use: shared durable pull-consumer identity across
replicas, bounded admission, acknowledgement after durable handling, failed and
ambiguous publication propagation, safe quarantine after dead-letter publication
failure, and bounded drain with recoverable work. These requirements apply when
that adapter is introduced, not to unrelated local capability construction.

Each stage qualifies the selected adapters and product contract. It does not
require implementing a private service registry, RPC protocol, workflow engine,
or a framework abstraction for every library. Production claims remain limited
to the topology and behavior actually qualified.

### Inspected upstream evidence

Inspection date: 2026-10-17. These are research pins, not installed dependencies
or product qualification results.

| Source | Evidence relevant to this proposal |
|---|---|
| [Moleculer 0.15 guidance](https://moleculer.services/docs/0.15/index.html) | Supports modular-monolith deployment; identifies Node.js as the first-class ecosystem and other-language implementations as third-party |
| [Moleculer 0.15.2](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/CHANGELOG.md) | Uses protocol v5; 0.15 removed ProtoBuf, Avro, and Thrift serializers from core. A serializer is not a gRPC protocol implementation |
| [Moleculer Go version](https://github.com/moleculer-go/moleculer/blob/60212c60d627433b409a5a4b9f6f1ad6b25b1a77/version/version.go) | The inspected implementation declares protocol v4; interoperability with JS 0.15 cannot be assumed |
| [Moleculer Java](https://github.com/moleculer-java/moleculer-java/blob/dddb4bbde930b24b89ac9f70de9a616bf6a92340/README.md) | Declares v5 / JS 0.15 compatibility; other-language integration is possible but still requires the selected capability's conformance evidence |
| [Moleculer sidecar](https://github.com/moleculerjs/sidecar/blob/a2cc0ba6e3152e1bfc9f147bcce804fcd7fd3a8c/README.md) | Labels itself WIP; this proposal does not treat it as a qualified production bridge |
| [Connect ES 2.2.0](https://github.com/connectrpc/connect-es/blob/378bb8fde1209afc3ab6a9b0aa97c00d0db58c24/README.md) and [Connect Go 2.0.1](https://github.com/connectrpc/connect-go/blob/f86de812094e37f7e975f969c8cc85818cbbc9d7/README.md) | Stable implementations of Connect, gRPC, and gRPC-Web; actual server, HTTP/2, toolchain, and proxy profiles remain explicit |
| [Channels 0.3.1 NATS adapter](https://github.com/moleculerjs/moleculer-channels/blob/16d6aec31c04b127b0c818d24f324e0235a82517/src/adapters/nats.js) | Uses push subscriptions and the monolithic NATS client; it is not the accepted shared durable pull-consumer profile without adaptation and qualification |

## Consequences

- Moleculer can supply repeated service infrastructure inside Node.js deployments
  while the platform preserves language-independent capability contracts.
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
