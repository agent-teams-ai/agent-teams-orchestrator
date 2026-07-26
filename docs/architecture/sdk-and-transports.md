---
id: architecture.sdk-transports
type: architecture
status: accepted
owner: clients/sdk
summary: SDK responsibility, contract generation, transport adapters, and compatibility rules.
related:
  - ADR-0015
  - ADR-0016
  - ADR-0018
  - ADR-0019
  - ADR-0021
  - ADR-0024
  - ADR-0033
  - ADR-0036
  - architecture.local-host-lifecycle
  - architecture.public-control-contracts
  - OD-001
  - OD-008
  - OD-016
  - OD-019
---

# SDK and Transports

## SDK role

The SDK is a typed client for orchestrator commands, queries, and subscriptions.
It contains no orchestration business logic and does not expose aggregates.

Illustrative API:

```ts
client.teams.create(input);
client.tasks.assign(input);
client.runs.start(input);
client.runs.cancel(input);
client.messages.send(input);
client.events.subscribe(options);
```

Method names are illustrative until public contracts are accepted.

The primary client surface is a handwritten, idiomatic facade organized by
capability or resource. It is not a generated protocol client and not one broad
interface with every operation.

Capability facades may share one internal connection, credential provider,
retry coordinator, and lifecycle owner. Interface segregation at the public
surface does not require a separate network connection for every capability.

Clients and scoped subclients are immutable and safe for concurrent use. The
internal backend is shared by composition, but environment detection never
silently changes transport, scope, or credential behavior.

## Responsibilities

An SDK may own:

- request and response typing;
- schema validation;
- authentication metadata;
- idempotency-key generation;
- transport retries that are safe by contract;
- pagination and subscription cursors;
- error-code mapping;
- protocol-version negotiation;
- connection lifecycle and explicit cleanup;
- language-idiomatic asynchronous iteration and cancellation primitives.

An SDK may not own:

- task assignment policy;
- retry or completion policy;
- runtime selection;
- message routing decisions;
- aggregate state;
- provider-specific behavior.

## Public and generated surfaces

Handwritten SDK methods and SDK-owned public models form the supported developer
surface. Generated protocol stubs and protocol-native messages remain behind
mappers and are not exported from the root SDK package.

Generated artifacts may be published separately for advanced transport
integration, but doing so does not make them the recommended SDK and requires an
explicit compatibility policy. Domain entities, application command models, and
frontend DTOs are never reused as public SDK models.

The internal transport interface is not a public extension point in the first
version. Any accepted in-process, local-Host, and hosted adapters implement it
in parallel behind the same facade. Publishing a third-party transport SPI
requires a separate ADR because it would freeze lifecycle, streaming, error, and
retry semantics beyond the supported adapters.

The TypeScript publication boundary is:

```text
@agent-teams/orchestrator-sdk
  Node import  -> explicit ESM output
  Node require -> explicit CommonJS output
  Browser      -> isolated ESM conditional export

@agent-teams/orchestrator-local
  Node only    -> Supervisor discovery, local auth, and lifecycle control
```

The product SDK initially supports Node.js 22 and later. Exact minor lines remain
a release matrix. Generated Protobuf descriptors and Connect clients are bundled
implementation details and cannot be reached through root or deep imports.

## Contract source

ADR-0016 separates contract sources by audience:

- feature-owned Protobuf is canonical for public control commands, queries,
  operations, errors, and subscriptions;
- feature-owned JSON Schema Draft 2020-12 is canonical for integration events;
- `ar` owns its independent Runtime Published Language;
- language SDK source and API reports define each handwritten SDK surface.

The platform schema registry discovers and validates feature contributions, builds
publishable bundles, and runs compatibility tooling. It never defines, copies, or
rewrites business contracts.

Buf formats, lints, generates, and checks control Protobuf. Generated code is not
edited manually. The cross-language type profile, resource model, operation
lifecycle, mutations, pagination, and feeds are defined in
[Public Control Contracts](public-control-contracts.md).

Client control contracts are not reused automatically as context Published
Language or integration events. The owning feature may define each surface beside
the same capability, but separate mappings and compatibility policies preserve
their different audiences.

Inbound adapters map validated public contracts into transport-independent
application models. Application and domain code never import generated SDK types
or public control/integration contract types.

Schema-generated contract artifacts are lower-level inputs to language SDKs.
Every supported language receives an idiomatic facade rather than exposing a
foreign language's object model or generated RPC stub as the product API.

## Transport adapters

Expected inbound adapters:

- in-process adapter for tests;
- Connect adapter for local Host and hosted control operations;
- compatible gRPC adapter where a non-Connect client requires it;
- JetStream consumers for explicitly published integration commands or events.

JetStream is an orchestrator integration adapter, not an SDK backend. The normal
SDK never asks users to manage subjects, streams, consumers, or acknowledgements.

Not every operation should be a broker message. Immediate validation and queries
may use request-response transports while durable work and event delivery use the
event bus.

Commands and events never share one generic envelope. A durable command has one
logical owner, authorization, deadline, idempotency, acceptance, result-query, and
unknown-outcome semantics. An event is an immutable fact and may have many
consumers.

Every accepted official adapter passes one behavioral conformance suite.
In-process operation may remove serialization and network overhead, but it must
not bypass authorization, idempotency, validation, scoping, error mapping, or
lifecycle semantics. OD-001 still selects the protected local IPC substrate; it
cannot replace the Supervisor-owned lifecycle fixed by ADR-0033.

The maintained Connect-Node transport supports direct Unix-domain-socket
operation through HTTP/1.1 `socketPath`. Unary calls and server streaming have
passed the same generated-contract and handwritten-SDK path without a custom
transport. The built-in HTTP/2 client path does not expose `socketPath`.
Therefore local UDS uses Connect HTTP/1.1 unless a later decision proves another
substrate. OD-001 remains responsible for Windows, production authentication,
credential rotation, and the final fallback profile.

NATS subjects, streams, consumers, and acknowledgements are not part of the
normal public SDK. The orchestrator may expose explicitly durable NATS
integration surfaces without making broker configuration the client programming
model.

## Local bootstrap and target selection

The public SDK and local process administration have different authority:

```text
Product CLI / Desktop
  -> Local Connector
       -> Local Host Control Client -> Local Supervisor
       -> Orchestrator SDK -> Orchestrator Host
```

The Local Connector may ensure and discover an explicitly selected local target.
After an authenticated instance, protocol, and capability handshake, normal SDK
traffic connects directly to the Host. The Supervisor does not proxy commands,
queries, operations, or subscriptions.

The ordinary SDK cannot install, update, start, stop, or kill local components.
Explicit CLI administration commands may use a separately packaged, narrow Local
Host Control Client. An OS-specific bootstrapper in the local CLI/Desktop
composition may register or start an absent Supervisor. Browser-safe SDK packages
never import either capability.

Target resolution is deterministic:

- `Target` identifies a concrete local or remote deployment and trust boundary;
- `Client Profile` selects a target and optional default scope;
- `Workspace` is an orchestrator resource, not connection configuration;
- no failed target silently falls back to another local or remote target;
- project and workspace files cannot select endpoints, credentials, installation
  channels, or trust policy.

The default local target is zero-touch. Foreground and ephemeral modes are
explicit target modes for development and CI and cannot accidentally adopt the
durable target's process or data root.

A compatible active Host is reused. An ordinary SDK call never triggers component
replacement. An incompatible client receives a typed compatibility outcome;
privileged drain and activation remain outside the ordinary SDK.

## Behavioral contract

The SDK contract includes behavior, not only request and response types:

- SDK SemVer and control-protocol schema versions are separate;
- capability negotiation reports supported operations and limits explicitly;
- credential caching and single-flight refresh are keyed by canonical provider,
  authority, audience, tenant, scope set, and delegation context;
- one logical call performs at most one compare-and-refresh after authentication
  failure; a stale failure cannot evict a newer credential;
- one durable command has one public `commandId`, which is also its idempotency
  identity;
- crash-safe callers persist a caller-selected command ID before first send;
- accepted durable commands return recoverable, serializable operation handles;
- operation cancellation cancels the local wait or transport request only;
- cancelling an orchestration run is a separate explicit command;
- disconnecting or closing a client never implicitly stops durable work;
- terminal closure and `Ctrl+C` detach the local wait and subscription only;
- automatic retries are limited to reads and commands declared idempotent;
- one logical command keeps the same `commandId` across transport retries;
- idempotency fingerprints use versioned semantic canonicalization rather than
  raw serialized bytes;
- full-result retention and historical key-reuse detection are separate
  contract horizons;
- an ambiguous delivery result becomes a typed unknown outcome with a
  reconciliation query, never a blind retry;
- pagination and subscription cursors are opaque;
- unbounded lists are paginated from v1 and use scope-bound keyset tokens;
- subscriptions expose language-idiomatic asynchronous iteration with bounded
  buffering and explicit reconnect, gap, expiry, and slow-consumer behavior;
- callers own durable subscription checkpoints;
- snapshot bootstrap returns the applied watermark and matching resume cursor;
- durable replay reads from the owning feed log; transport or in-memory
  notifications only wake readers and never become replay state;
- expired cursors fail before any partial retained tail is exposed;
- cursors are integrity protected and bound to their issuing feed and scope;
- resumable auth reconnect requires a credential with enough usable lifetime to
  make forward progress and stops under repeated same-checkpoint auth churn;
- one merged event view cannot claim global ordering or one resumable cursor when
  its underlying feeds do not provide those guarantees;
- client cleanup is explicit and releases SDK-owned connections, iterators, and
  local connector state without terminating independently owned durable work.

The last cleanup rule means connections and SDK-owned iterators, not the
Supervisor-managed Host. Lifecycle administration uses a separate privileged
control surface and never relies on SDK connection reference counts.

Server cursor verification uses a persisted keyring with explicit key IDs and
transactional `active -> previous -> retired` rotation. A bounded grace period
accepts active and previous keys; unknown, retired, tampered, expired, and
scope-mismatched cursors remain distinct typed outcomes. Public cursors may expose
a key ID but never key material.

Deadlines, cancellation, business rejection, stale state, authorization failure,
transport failure, and unknown outcome are distinct semantics. Transport-native
status codes and exceptions are mapped into the stable public error model selected
by OD-016.

## Compatibility

Contracts follow additive evolution where possible:

- required fields cannot be added to an existing version;
- semantic changes require a new schema version;
- unknown additive fields must be tolerated where the protocol permits;
- unknown event variants and enum values retain their numeric identity through an
  explicit handwritten-SDK fallback;
- published v1 fields remain present and deprecated; removal plus reservation
  requires a later breaking major;
- published field names/numbers, enum names/numbers, service/method names, and
  existing oneof membership are immutable within v1;
- new request oneof variants and required behavior are gated by protocol-minor
  and capability negotiation, not wire compatibility alone;
- unknown typed error details do not hide the stable error code/reason or known
  details;
- direct binary Protobuf relays preserve unknown fields, but SDK/application DTO
  mapping never claims transparent unknown-field preservation;
- SDK and server compatibility is tested as a matrix.

Compatibility tests cover the supported previous SDK against the current server
and the current SDK against supported previous server versions. Package version
checks alone never replace protocol negotiation.

The matrix includes previous/current TypeScript and Go clients and servers,
unknown enum/detail fixtures, request-capability negative controls, opaque cursor
round trips, and direct binary unknown-field preservation in both languages.

The cross-language contract pipeline must continuously prove at least one
TypeScript and one non-TypeScript generated client. Buf lint, format,
deterministic generation, generation-drift detection, and breaking-change checks
are repository gates. Before public v1, `FILE` breaking results require explicit
review; after v1, the accepted compatibility policy becomes blocking.

## Pre-v1 freeze gate

The following decisions must be explicit before the first public stable SDK.
Changing them later is expected to require broad client refactoring:

1. exact public resource names and remaining workspace-scope rules;
2. public error taxonomy and safe diagnostics;
3. concrete identity provider, grant, and revocation model;
4. exact local IPC substrate and packaging support matrix;
5. SDK SemVer, deprecation, and compatibility support window;
6. package registry, provenance, signing, and compatibility support policy;
7. feature-specific payload limits and artifact transfer profiles.

These are release gates, not reasons to place unresolved behavior in domain code.
OD-001, OD-008, OD-012, OD-016, and OD-019 retain ownership of their unresolved
choices.

## Package and browser release gates

SDK release validation installs the packed artifact rather than importing the
source workspace. It covers:

- the publish-file allowlist and a negative generated-subpath import;
- Node ESM and CommonJS on every supported Node line;
- TypeScript `NodeNext` and `Bundler` resolution;
- browser conditional resolution, forbidden dependency graphs, and tree shaking
  with esbuild and Rollup;
- supported previous compiled consumers against the current additive package;
- Connect-Web unary and resumable server-stream behavior through a CORS proxy;
- package and browser gzip budgets;
- public API extraction and SemVer review.

Production reverse proxies must preserve incremental server-stream chunks,
Connect headers, CORS preflight and exposed response headers, cancellation, and
idle timeouts. A deployment conformance probe rejects a profile that buffers a
control feed until completion.

Browser Fetch implementations may coalesce multiple application frames. SDK
correctness and UI state therefore use `eventId`, per-feed sequence, opaque
cursor, and duplicate suppression, never one callback per upstream write or the
wall-clock timing of individual browser chunks.

Every hosted proxy profile passes two readiness gates:

1. static configuration validation;
2. a dynamic Connect-Web probe covering CORS, unary calls, first-stream progress,
   heartbeat-aware idle survival, cancellation, deadlines, typed errors,
   authentication rotation, cursor resume, duplicate suppression, and limits.

The maintained nginx streaming location disables response buffering and
compression and sets its read timeout above the declared heartbeat gap. The
maintained Envoy route disables generic request and stream idle timeouts or sets
explicit heartbeat-aware values. Equivalent custom profiles must pass the same
probe rather than copying implementation-specific settings blindly.

Feature-owned application message limits remain below proxy hard limits so normal
oversize rejection produces the stable typed public error. Proxy-generated
`400`, `413`, or `431` responses may bypass application CORS and error mapping and
therefore remain deployment diagnostics, not stable SDK error contracts.

## Client-specific adapters

Desktop and web applications translate their local DTOs into SDK contracts. Their
IPC, state stores, and UI models remain outside this repository.

This prevents `TeamCreateRequest` or another current frontend DTO from becoming a
permanent domain boundary by accident.
