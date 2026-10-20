---
id: ADR-0105
type: adr
status: accepted
owner: architecture/contracts
summary: Select portable Protobuf and standard gRPC through Dapr for actual private service boundaries.
approved_by: product-owner
accepted_at: 2026-10-20
related:
  - ADR-0004
  - ADR-0005
  - ADR-0016
  - ADR-0017
  - ADR-0103
  - ADR-0104
  - ADR-0107
  - ADR-0109
  - architecture.deployment-profiles
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

# ADR-0105: Portable Service Boundaries and Dapr

## Context

The product needs independently scalable capabilities and implementations in
several languages without forcing consumers to adopt a language-specific RPC
protocol. The owner initially requested Moleculer to avoid building custom
service discovery, routing, load balancing, and lifecycle infrastructure. The
subsequent polyglot review compared standard RPC, Dapr, NATS Services, and
language-specific frameworks through source inspection and disposable fixtures.

On 2026-10-20 the product owner directs recording the global boundaries and
selected process isolation from first implementation. This decision accepts the
portable contract and Dapr invocation profile; ADR-0109 owns the changed initial
placement and concurrent-execution target. The permanent filename retains the
original proposal's identity. Earlier same-process and conditional Moleculer
recommendations were proposals, not accepted production defaults.

ADR-0016 and ADR-0017 already select public Protobuf, Buf, Connect, and a
cross-language contract profile. Private service boundaries need a declared wire
protocol as well as a schema. Dapr standard gRPC invocation reuses ordinary
gRPC services; a language-specific Dapr SDK is not the application contract.

## Decision

### Select boundaries by capability

| Boundary | Selected mechanism | Owner and limit |
|---|---|---|
| Domain and application | Pure domain models and typed ports | Semantic owner; no transport, Dapr, generated-message, or container types |
| Collaboration inside a role | Typed local calls and consumer-owned ACLs | Ordinary features and private helpers do not become RPC services |
| Public client API | Feature-owned Protobuf through Connect | Public control owner and handwritten SDK; future GraphQL is another inbound adapter |
| Selected private request/reply role | Feature-owned Protobuf, standard gRPC through Dapr | Capability owner defines semantics; thin client/server adapters map the wire and trusted invocation facts |
| Durable publications and handlers | Official modular JetStream SDK profile under ADR-0107 | Context-owned outbox, inbox, receipts, and recovery; direct handler-to-application invocation |
| Host construction | Exact Get Modular pair under ADR-0104 | One static construction authority per declared process role |
| Runtime execution | AR Published Language through consumer-owned ports | AR owns sessions, capacity, process custody, technical permissions, and private fences |

The [service role map](../architecture/deployment-profiles.md#service-role-map)
is the canonical placement authority. A selected role is a real process from
its first owning feature. A feature, nested feature, package, Protobuf method,
Agent, Team, Run, or runtime session does not automatically create a service.
A capability group can have several roles without gaining a second semantic
owner. Several contexts can share a permitted role without sharing a Unit of
Work, repositories, or writable schemas.

### Private gRPC through Dapr

Use Dapr service invocation for actual private RPC between selected role
processes. Generated standard gRPC clients address their paired sidecar; the
adapter supplies the target application routing identity. The callee exposes
the feature-owned standard gRPC service. Routing metadata stays out of domain,
application models, public resource IDs, and SDK contracts.

Each participating Host instance has its own paired `daprd` runtime process.
Dapr supplies configured discovery, service routing, applicable resilience,
and operational telemetry. The deployment platform starts and scales role
replicas and sidecars. Dapr does not provide AR execution capacity, business
scheduling, or durable mutation ownership.

Do not layer Moleculer, NATS Services RPC, or a custom registry and RPC bus over
the same private hop. Moleculer is not selected for this platform profile. A
future different private protocol needs a specific boundary reason and an
accepted successor decision; it is not an automatic per-feature option.

Dapr state management, pub/sub, actors, jobs, and workflows are outside this
selection. Native PostgreSQL, direct JetStream, the selected workflow adapter,
and Centrifugo retain their existing responsibilities. Ordinary invocation does
not make Redis, actor placement, or the Dapr scheduler product dependencies.

### Deployment mechanisms and ownership

| Concern | Required provider or responsibility |
|---|---|
| Construction | Get Modular constructs each role's declared capabilities once; transport adapters invoke those handles |
| Availability and rollout | Hosted deployment platform, or future Local Supervisor for native components |
| Discovery and replica routing | Qualified Dapr resolver and deployment network; only replicas with compatible method sets and semantics share a route |
| Peer trust | Qualified service identity, trust roots, audience, credential rotation, and protected local application hops; OD-012 retains exact authority decisions |
| Product authorization | Authenticated invocation facts mapped by an adapter; the owning use case checks current product grants and invariants |
| Admission and budgets | Application and Host limits for payloads, handlers, queues, tenant fairness, and database clients; tested sidecar limits are additional |
| Deadline and retries | Finite operation-specific deadlines and one retry budget across hops; no automatic mutation retries without a proven idempotency contract |
| Drain and recovery | Application admission closes before bounded drain; accepted work remains durably recoverable when transports stop |

A base URL, local loopback endpoint, live sidecar, or successful synthetic call
is not qualification of these rows. Dapr defaults cannot substitute for an
accepted identity, discovery, or retry configuration. In particular, actual
transparent gRPC behavior must be tested; a limit or policy configured for a
different Dapr API path is not evidence for this one.

Native and Compose discovery must work on their actual supported networks.
Do not infer Dapr application discovery from Compose DNS or assume multicast
is available on enterprise devices. Kubernetes has its own qualified hosting
profile. Exact versions, resolvers, certificates, endpoint exposure, and
rollout behavior are supplied with the first materialized deployment profile,
not left to an unspecified later extraction.

### Preserve portable contracts

Define the actual boundary's feature-owned `proto3` service, generated codecs,
Buf validation and compatibility checks, and typed error and invocation profile
with its first implementation. Declare only delivered methods. Do not freeze
speculative future methods or generate a service for every TypeScript interface.
Public and private models may differ when their semantics differ; share schema
knowledge only where it has the same owner and compatibility contract.

Preserve exact integers, quantities, money, timestamps, optional-field presence,
errors, deadlines, cancellation policy, request identity, and operation lookup
across implementations. A schema alone does not confer Connect/gRPC wire
compatibility, authenticate a caller, or define retry safety. Public browser
clients continue through Connect even when private services use standard gRPC.

Application models do not import Protobuf messages, Dapr SDK types, gRPC handler
contexts, Connect types, or Get Modular descriptors. Inbound adapters validate
and map wire data to the owned input port. Outbound adapters implement narrow
consumer-owned ports and map the provider's Published Language. Framework
isolation does not require an untyped generic service bus or service locator.

Another implementation language replaces the role implementation behind the
same published contract. Its consumer business code should not need to change,
but state migrations, deployment configuration, and conformance remain real
work. Claim portability only after a representative alternate-language
implementation passes unchanged consumer contract fixtures.

### Keep failure state with its owner

A context may admit concurrent operations through several qualified replicas.
Authoritative receipts, operations, inboxes, outboxes, revisions, claims, and
fences live with its durable owner. In-memory caches and pending requests are
disposable. Discovery and balancing confer no ownership of a session, resource,
or partition and do not replace database constraints or transaction isolation.

One atomic operation stays inside its owner's transaction. Do not hold that
transaction open across an RPC call or split current assignment, immutable
history, command receipt, and required outbox writes among service owners.
Roles sharing an owner's schema need one migration authority and explicit
mixed-version compatibility during rollout.

A timeout or cancellation of observation does not prove that an effect stopped
or failed to commit. Mutations retain authenticated scope, stable request
identity, semantic fingerprint, and original outcome. Unknown outcomes reconcile
with that owner under the original identity; failover cannot create a fresh
mutation just to obtain a reply. Long-running work returns durable acceptance
and an operation reference rather than relying on one live RPC promise.

### Separate service RPC from durable delivery

ADR-0107 selects the official modular NATS SDK and shared durable pull consumers.
A durable handler validates its envelope and consumer ACL, invokes its owned
application port, commits the inbox decision and required state or intents,
and acknowledges after durable commit. It does not forward the work through
Dapr merely to execute the application operation.

Replicas of one semantic subscription share its logical durable consumer.
Different semantic subscribers retain independent delivery and checkpoints;
putting them behind one shared consumer would distribute facts among owners
instead of delivering the facts to each owner. AR source feeds retain their
own Published Language and consumer-owned checkpoint rules.

JetStream redelivery and RPC retries have separate contracts but must not
multiply one operation into unbounded attempts. Every external-effect owner
keeps explicit idempotency and uncertain-outcome reconciliation. A durable-only
worker needs no Dapr sidecar without an actual private RPC dependency.

### First product integration and qualification

The first stateful private service is Team Topology's implemented S3 persistent
Team create/get/list subset. Control Host reaches it through a narrow port and
standard gRPC over Dapr in separate processes. Later Run team activation is
another consumer through its own port and ACL. Control Host does not construct
a second Team Topology implementation or use its tables directly.

S1/S2 `CheckTeamDraft` remains the existing module and public Protobuf/Connect
proof. Its pure checker fixtures cannot qualify stateful private mutations.
Later Agent definitions, immutable versions, roster changes, cloning, and
templates join only through their separately accepted slices; they are not
added to S3 by selecting the larger group.

The default server integration profile and a required CI lane use the real
process and Dapr path from the first S3 integration. A same-process router or
mock can support fast tests but cannot become a production fallback or replace
that lane. Both Compose and Kubernetes role mappings accompany materialization;
actual environment qualification follows the
[deployment profile](../architecture/deployment-profiles.md) and
[testing strategy](../architecture/testing-strategy.md).

| Claim or stage | Required evidence |
|---|---|
| First dependency and role implementation | Accepted owner and contract, exact release pins, static composition, selected discovery/trust/lifecycle profile, real consumer, and existing package admission gates |
| Stateful private RPC | Real serialization and scope validation, typed errors, conflicting writes, stale revisions, lost reply after commit, restart, original-result lookup, and applicable fencing |
| Process and sidecar operation | Caller/callee loss, unavailable dependencies, startup and admission ordering, bounded overload and drain, recoverable accepted work, and no direct backend bypass |
| Another-language replacement | Representative replacement with unchanged consumer business behavior and contract fixtures, including exact values and failures |
| Advertised deployment or scale | Evidence for the actual native, Compose, or Kubernetes composition and its declared concurrent execution, clients, queues, and resource limits |

The [implementation readiness gates](../architecture/implementation-readiness-gates.md)
remain blocking where applicable. The research pins below do not select a
production Dapr version or certify a profile. A known failed safety or protocol
case must be resolved by a qualified supported release or configuration before
that profile is admitted; it cannot be hidden by an in-process fallback.

### Disposable adapter experiment, 2026-10-17

A synthetic diagnostic capability passed the same generated-Protobuf fixtures
through one local broker and two real processes using the official TCP
transporter. The isolated Linux network namespace contained only loopback.
The experiment used Node 26.11.1, Moleculer 0.15.2, Protobuf-ES 2.16.0, and
Buf 1.74.0, with exact dependency locks and source digests in its evidence.

All eleven reported result groups passed. They include exact `uint64` values
above `Number.MAX_SAFE_INTEGER`, optional-field presence, detached values,
owned typed errors, fixture scope propagation, payload bounds, deadlines, and
owned process cleanup. Raw calls separately demonstrated shared local parameters and
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
This historical evidence informed the alternatives; it does not install an adapter
or satisfy the owning product implementation gates.

### Polyglot experiments and independent review, 2026-10-17

Separate disposable Linux experiments used the same diagnostic Protobuf schema.
They qualify representations and specific transport behavior, not Team Topology
S3, real authorization, durable mutations, or hundreds of active agents.

| Experiment | Observed evidence and material limits |
|---|---|
| Connect ES 2.2.0 and Go 2.0.1 | Thirty result groups passed across a local TypeScript router, a Go Connect endpoint, and standard gRPC over HTTP/2. Fresh extraction reproduced the source and generated artifacts. This proves a portable diagnostic boundary, not dynamic discovery or workload capacity |
| Node gRPC client 1.14.6 and two Go replicas | Eight follow-up groups passed using the official static IP resolver and round-robin balancer. The same consumer port worked through a separate client adapter. After one replica failed, new calls used the survivor; the same client rebalanced after its same-address restart. Accepted calls on the failed replica returned Unavailable. This is not a Connect-Node balancing feature, dynamic membership, zero-error failover, or durable mutation recovery |
| NATS JS 3.4.0 and Python 2.16.0, server 2.15.1 | Seven groups passed, including deliberate limitation checks. Ninety-six sequential calls reached both implementations of the shared endpoint; this is not fairness or load evidence. Timeout did not cancel the Python handler; JS stop returned before an untracked async callback completed |
| Dapr 1.18.7 and a standard Go gRPC endpoint | Fourteen groups passed. Remote unary retry/timeout policies worked, but same-app calls bypassed them. Four transparent gRPC handlers ran despite `app-max-concurrency=1`. Alpha SQLite discovery was a scoped fixture; the separate loopback mDNS attempt did not demonstrate two-replica distribution |
| Independent Astra counterexamples | Connect shutdown signal alone admitted a new handler after abort; the public `requestGate` hook rejected it in the control. Python NATS micro stop cancelled an active callback; core subscription drain waited. SDK and protocol paths need separate lifecycle qualification |

The Connect and Dapr shutdown checks covered idle cleanup, not active-request
drain. The retry checks observed one handler execution for a selected application
Unavailable response; they do not prove mutation replay safety after a lost
reply, connection failure, or restart. The NATS service implementations share
one endpoint, not their complete method sets. Result-group counts are not
comparable quality scores.

The review also examined Dapr, NATS Services, Dubbo, Kratos, Kitex, go-micro,
Encore, wasmCloud, and Service Weaver. Go-specific frameworks can be selected
inside a future Go service behind standard gRPC; their own protocols and runtime
models are not universal platform APIs. Encore and wasmCloud introduce broader
build, execution, lifecycle, and persistence integration decisions. The retained
research reports document exact release pins and the reasons for this shortlist.

### Inspected upstream evidence

Inspection date: 2026-10-17. These are research pins, not installed dependencies
or product qualification results.

| Source | Evidence considered in this decision |
|---|---|
| [Moleculer 0.15 guidance](https://moleculer.services/docs/0.15/index.html) | Supports modular-monolith deployment; identifies Node.js as the first-class ecosystem and other-language implementations as third-party |
| [Moleculer lifecycle](https://moleculer.services/docs/0.15/lifecycle.html) and [0.15.2 broker defaults](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/service-broker.js) | Built-in signal handling can exit the process; tracking, bulkheads, metrics, and tracing require deliberate configuration. Host composition retains process ownership |
| [Moleculer 0.15.2 bulkhead](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/middlewares/bulkhead.js) | `maxQueueSize: 0` skips the queue-size check in this pin; it is not immediate rejection. A bounded queue needs a positive configured limit and overload evidence |
| [Moleculer 0.15.2](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/CHANGELOG.md) | Uses protocol v5; 0.15 removed ProtoBuf, Avro, and Thrift serializers from core. A serializer is not a gRPC protocol implementation |
| [Moleculer Go version](https://github.com/moleculer-go/moleculer/blob/60212c60d627433b409a5a4b9f6f1ad6b25b1a77/version/version.go) | The inspected implementation declares protocol v4; interoperability with JS 0.15 cannot be assumed |
| [Moleculer Java](https://github.com/moleculer-java/moleculer-java/blob/dddb4bbde930b24b89ac9f70de9a616bf6a92340/README.md) | Declares v5 / JS 0.15 compatibility; other-language integration is possible but still requires the selected capability's conformance evidence |
| [Moleculer sidecar](https://github.com/moleculerjs/sidecar/blob/a2cc0ba6e3152e1bfc9f147bcce804fcd7fd3a8c/README.md) | Labels itself WIP; this decision does not treat it as a qualified production bridge |
| [Connect ES 2.2.0](https://github.com/connectrpc/connect-es/blob/378bb8fde1209afc3ab6a9b0aa97c00d0db58c24/README.md) and [Connect Go 2.0.1](https://github.com/connectrpc/connect-go/blob/f86de812094e37f7e975f969c8cc85818cbbc9d7/README.md) | Stable implementations of Connect, gRPC, and gRPC-Web; actual server, HTTP/2, toolchain, and proxy profiles remain explicit |
| [Connect in-process transport](https://github.com/connectrpc/connect-es/blob/378bb8fde1209afc3ab6a9b0aa97c00d0db58c24/packages/connect/src/router-transport.ts) | Routes binary Connect through local handlers; message-size defaults are unbounded for product purposes and real network behavior is not exercised |
| [Dapr standard gRPC invocation](https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/) and [1.18.7 proxy policy selection](https://github.com/dapr/dapr/blob/b32a815fa2260983e181b95272ea555fe17d3895/pkg/messaging/grpc_proxy.go) | Ordinary gRPC endpoints can use the sidecar without a language-specific Dapr SDK. The actual local/remote path and policy configuration require qualification; the executed unary evidence is narrower than blanket documentation claims |
| [Dapr self-hosted operation](https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-overview/) | A sidecar is a separately managed process. Plain invocation does not require the adjacent actor, state, or pub/sub building blocks |
| [Official NATS Services](https://docs.nats.io/learn/services/) and [JS 3.4.0 service implementation](https://github.com/nats-io/nats.js/blob/v3.4.0/services/src/service.ts) | Multiple official language SDKs, inspection, and queue routing are available. The explicit NATS wire profile and async lifecycle remain separate from gRPC and durable JetStream delivery |
| [Moleculer Core NATS transporter](https://github.com/moleculerjs/moleculer/blob/c5a0d82b4fc4919fd8bb952a954f61d21ef5f247/src/transporters/nats.js) | Loads the monolithic `nats` package; dependency qualification remains necessary even without Channels |
| [Channels 0.3.1 NATS adapter](https://github.com/moleculerjs/moleculer-channels/blob/16d6aec31c04b127b0c818d24f324e0235a82517/src/adapters/nats.js) | Uses push subscriptions and the monolithic NATS client; it is not the accepted shared durable pull-consumer profile without adaptation and qualification |

## Consequences

- Real private boundaries use one standard wire protocol and selected shared
  runtime instead of a product-owned discovery and RPC framework.
- Polyglot services can preserve consumer contracts. Internal TypeScript
  features retain typed local APIs without mechanical Protobuf boilerplate.
- First-role integration now includes network, sidecar, identity, lifecycle,
  and failure work. Framework selection is not operational qualification.
- Public Connect, private gRPC/Dapr, durable JetStream, and AR execution remain
  distinct responsibilities with thin mappings to owned application ports.
- Dapr adds processes, resource use, startup dependencies, and failure modes.
  Each supported deployment form must qualify those costs and behavior.
- The permanent filename preserves proposal history; this accepted decision
  replaces its earlier unaccepted local-router and Moleculer alternatives.

## Rejected alternatives

- The Moleculer packet protocol as the mandatory polyglot API: it requires
  compatible third-party protocol implementations or a persistent Node bridge.
- Protobuf with an unspecified custom registry, load balancer, and retry engine:
  it does not remove the operational work that motivated framework adoption.
- A service for every feature, class, schema, or agent: these are not independent
  deployment and lifecycle requirements.
- A same-process production fallback for a selected isolated role: it hides the
  actual boundary and lets extraction be postponed indefinitely.
- Dapr pub/sub or framework core events replacing the selected durable path:
  that changes delivery and recovery authority without an owning decision.
- Automatic retries or local mutable state as a correctness mechanism:
  ambiguous outcomes, duplicate delivery, and replica loss remain explicit.
