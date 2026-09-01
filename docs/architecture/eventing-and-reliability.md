---
id: architecture.eventing
type: architecture
status: accepted
owner: platform/eventing
summary: Event categories, delivery, ordering, outbox, inbox, replay, and failure semantics.
related:
  - ADR-0004
  - ADR-0009
  - ADR-0010
  - ADR-0035
  - ADR-0037
  - ADR-0058
  - ADR-0060
  - ADR-0087
  - architecture.local-host-lifecycle
  - OD-009
---

# Eventing and Reliability

ADR-0087 qualifies only the Managed SaaS and Standalone Self-Hosted Server
profiles in V1; they connect to externally operated NATS JetStream. Statements
below about the local composition, the Local Supervisor, and the bundled
`nats-server` describe the future Fully Local profile owned by
[Local Host Lifecycle](local-host-lifecycle.md) and must not be read as a V1
availability claim.

## Event categories

### Domain events

Domain events describe facts inside one bounded context and are emitted by domain
behavior. They are not automatically public contracts.

Example:

```text
TaskAssigned
```

### Integration events

Integration events are stable, versioned contracts published for other contexts
or external consumers. Application code converts domain events into
transport-independent publication intent. An outbound adapter maps that intent to
the versioned integration-event schema and stores it in the outbox.

Example:

```text
agent-teams.work-coordination.task-assigned.v1
```

### Operational events

Operational events describe delivery, retries, dead-letter decisions, health, and
diagnostics. They must not be confused with business facts.

### Transport messages

A transport message is the broker-specific carrier of a command, integration
event, or operational record. It is not another business fact and is never reused
as a domain-event class.

```text
private domain event
  -> transport-independent publication intent
  -> versioned integration-event contract
  -> JetStream transport message
```

The reverse path validates the transport envelope and integration-event schema,
then maps through a consumer-owned anti-corruption layer into a local application
command. Domain and application code never receive NATS messages or public-schema
DTOs.

## Commands are not events

A command requests one owner to perform an action and may be rejected. An event
describes a fact that already happened and may have many consumers. They use
separate contracts, envelopes, retention, authorization, deduplication, and replay
rules.

Durable command contracts define:

- the single logical owner;
- idempotency-key scope, full-receipt retention, and reuse-detection horizon;
- payload-hash behavior when a key is reused;
- deadline and cancellation semantics;
- `accepted`, `rejected`, `completed`, and unknown-outcome behavior;
- whether and how the original result can be queried.

Historical commands are never replayed as if they were facts.

Idempotency retention has two distinct levels when the public contract
distinguishes an expired result from a never-seen key:

```text
full receipt:
  idempotency scope and key, canonicalization version,
  canonical request fingerprint, outcome and result

compact tombstone:
  idempotency scope and key, canonicalization version,
  canonical request fingerprint and expiry metadata
```

After the full receipt expires but while the tombstone remains, the same key and
fingerprint returns an explicit expired-window outcome; the same key with another
fingerprint remains a conflict. After the reuse-detection horizon expires, the
system cannot claim to recognize historical use. Every command contract declares
that horizon instead of implying permanent detection.

The request fingerprint is calculated from the normalized semantic application
command using versioned canonicalization rules. It is never calculated directly
from raw JSON, Protobuf bytes, field order, unknown wire fields, or
transport-specific metadata. A tombstone retains the canonicalization version,
and the corresponding comparison logic remains available for at least the
reuse-detection horizon.

## Delivery semantics

The architecture assumes at-least-once delivery:

- publishers may retry;
- consumers may receive duplicates;
- consumers must persist idempotency decisions;
- acknowledgements occur only after durable handling;
- poison messages are isolated for operator action;
- retries use bounded backoff and explicit classification.

Exactly-once business effects are achieved through idempotent state transitions,
not by trusting the broker to deliver exactly once.

## Ordering

There is no broker-neutral global ordering guarantee. Every event contract declares
one of:

```text
ordering: none
ordering: partition-key
ordering: aggregate-key
ordering: custom-key
```

For ordered contracts, the contract declares the ordering key and sequence
semantics. Aggregate revision is a business concurrency fact; it is not proof that
the broker delivered every event in revision order.

An adapter claiming aggregate or custom-key ordering must define:

- who allocates the sequence;
- how concurrent publishers are serialized or reconciled;
- how retries preserve or restore order;
- how gaps and duplicates are detected;
- what consumers do when an out-of-order event arrives.

Sequence allocation and event append are one atomic semantic operation. The
persistence adapter increments a feed-owned head using a counter row, compare and
swap, or an equivalent database primitive and appends the event in the same
transaction. `MAX(sequence) + 1` is prohibited. When a feed is guarded by an
ownership fence, fence validation, sequence allocation, and append share that
transaction.

Consumers coordinate facts from different keys using explicit revisions,
dependencies, reconciliation, or process managers rather than arrival time.

## Event envelope

Every public event includes:

```text
eventId
eventType
schemaVersion
occurredAt
producer
correlationId
causationId
scope
payload
```

`eventId` is assigned once in the producer's state-plus-outbox transaction and
remains unchanged across retry, replay, and route migration. It must be globally
unique within the orchestrator trust domain and must never be derived from stream
sequence, subject, timestamp, or payload alone. Consumers still include the
authenticated producer identity in defensive deduplication so an ID collision or
untrusted producer cannot suppress another producer's event.

`scope` is a strict tagged union such as `system`, `tenant`, or `project`.
Business events for teams, tasks, runs, messages, and runtime bindings require a
project scope. System operational events must not fabricate tenant or project
identities.

Events include source identity, revision, partition/ordering key, and sequence only
when their contract semantics require them. Operational events that do not
originate from an aggregate must not fabricate aggregate identities.

Schema validation occurs at publication and consumption boundaries.

Each integration-event surface begins with one `v1` schema family. Producers do
not emit speculative parallel majors. After durable publication, an incompatible
change requires the migration, replay-reader, and support-horizon decision in
ADR-0037.

Producer and consumer validation use different generated profiles:

- an exact-version producer schema is strict and closed, including its payload;
- a consumer reader declares one supported major line and accepts only additive
  fields in the versioned payload locations selected by the contract;
- the stable envelope remains closed unless its own compatibility policy
  explicitly permits extension;
- the major suffix of the routable `eventType` and the major component of
  `schemaVersion` must agree;
- required-field removal, incompatible type changes, and unsupported major
  versions fail validation;
- open string values map to an explicit unknown fallback instead of crashing an
  older consumer.

The exact producer schema is never reused blindly as an older consumer reader.
Doing so makes a harmless additive payload field fail at runtime when
`additionalProperties` or `unevaluatedProperties` closes the object. Reader
schemas and compatibility fixtures are generated or maintained beside the
canonical event schema, with their supported major line explicit.

Every integration-event contract has a machine-readable manifest beside its JSON
Schema. The manifest declares:

- owning feature and stable event type;
- schema identity, version, and compatibility policy;
- tenant/project/system scope and consumer authorization class;
- privacy and redaction classification;
- ordering mode, partition key, and sequence semantics;
- delivery, acknowledgement, retry, and terminal-failure classification;
- retention, replay support, and cursor-expiry behavior;
- maximum inline payload size and artifact-reference policy;
- deprecation and consumer-migration metadata.

Broker subjects, stream names, consumer names, and storage settings are generated
or validated from the manifest by an adapter profile. They are not canonical
business contract fields.

## Transactional event and command dispatch

An application transaction:

1. loads the aggregate;
2. executes domain behavior;
3. persists aggregate changes;
4. appends complete integration-event outbox records and durable command-dispatch
   records required by the state transition;
5. commits once.

Relays publish committed records and record publication progress. Event outbox and
command-dispatch records remain separate contract categories with separate
envelopes, retention, authorization, and outcome behavior. A command-dispatch
record does not turn a command into an event.

A durable command records acceptance and its addressable operation or outcome in
the owning context transaction. Clients recover the result through operation
lookup, a declared durable feed, or another stable destination. A duplicate
command may therefore observe `accepted`, `in-progress`, `completed`, or `failed`
rather than an immediate repeated final response.

An ephemeral transport reply inbox is not a durable destination and does not get a
response-outbox record merely to emulate synchronous RPC. Ordinary queries may
return directly after a successful read. A response outbox is used only when the
contract names a stable durable destination, such as an integration-event channel,
registered result endpoint, or webhook.

Publishing or dispatching directly from a domain entity or before persistence
commits is prohibited.

This is one database transaction in one bounded context. It is not a distributed
transaction between the database and NATS. The broker publication happens later
and may be repeated safely.

For horizontal scaling, each event-outbox and command-dispatch implementation
defines claim leasing, concurrent relay ownership, publication receipts, retry
classification, retention, and quarantine. A process-wide relay engine may
coordinate workers through context-owned dispatch ports, but it cannot read or
mutate context tables directly.

## Consumer inbox

Durable consumers store handler identity/version plus processed event IDs or
idempotency keys in the same context-local transaction as their business effects.
A crash between handling and acknowledgement must result in a safe duplicate, not
a repeated effect.

One event handler mutates one bounded context only. Cross-context reactions are
separate handlers and transactions.

A permanently malformed or unauthorized transport message is terminated only
after a redacted rejection record commits. That record contains transport
identity or fingerprint, transport route reference, safe principal and scope
references, classification, schema or error code, occurrence time, and an approved
safe correlation fingerprint when required. It never contains raw credentials,
prompts, attachments, unredacted payloads, or an unkeyed digest of secret-bearing
raw content.

If rejection persistence fails, the adapter does not acknowledge or terminate the
message. Broker-specific termination and advisory handling remain adapter
concerns; the core contract exposes only terminal-versus-transient
classification. OD-014 selects whether rejection correlation uses transport
identity only, a redacted canonical fingerprint, or a versioned keyed digest.

## Independent cross-context fan-out

The architecture is an event-driven modular monolith, not an event-sourced system.
Context-owned SQL state remains authoritative. Integration events decouple
bounded contexts and preserve the same boundary if a context is later extracted
as a service.

A producer publishes one semantic fact from its own Ubiquitous Language. It never
constructs downstream notification, attention, context, analytics, or workflow
commands merely because those consumers currently exist.

Example:

```text
Work Coordination transaction
  TaskCommentAdded domain event
  -> task state
  -> work.task-comment-added.v1 outbox record
  -> commit

Outbox relay
  -> JetStream integration-event stream

Human Notification durable subscription
  -> schema validation and consumer ACL
  -> context command
  -> inbox + notification state + local outbox
  -> commit
  -> ACK

Agent Attention durable subscription
  -> schema validation and consumer ACL
  -> context command
  -> inbox + attention state + local outbox
  -> commit
  -> ACK

Agent Context durable subscription, when accepted
  -> schema validation and consumer ACL
  -> context command
  -> inbox + context invalidation
  -> commit
  -> ACK
```

Each subscription, inbox, transaction, retry decision, and acknowledgement is
independent. Failure in Agent Attention cannot roll back a committed human
notification, and human mute cannot prevent another consumer from receiving the
source fact.

Every logical subscription has a stable `subscriptionContractId` independent of
deployment replica, process identity, and ordinary handler implementation
version. Its durable inbox uniqueness scope is:

```text
event scope + subscriptionContractId + producer + eventId
```

Changing code without changing semantic ownership does not create another logical
subscription. A deliberate rebuild or incompatible interpretation uses an
explicit projection or migration generation rather than silently changing the
inbox key.

The inbox deduplication horizon is at least the longest supported source retention,
replay, backfill, migration, and disaster-recovery horizon for that subscription.
If permanent historical recognition cannot be retained, the contract declares the
expiry and reconciliation behavior explicitly.

Normal redelivery, projection rebuild, and migration replay are distinct
operations. They have separate authorization, generation identity, progress,
rate limits, and completion evidence.

## Cross-context reuse boundary

DRY applies to stable technical mechanics, not superficially similar business
language.

| Layer | Reuse rule |
|---|---|
| Domain | No cross-context reuse of aggregates, entities, domain events, recipient, priority, status, delivery, or acknowledgement types |
| Application | Context-owned use cases, commands, ports, Unit of Work, policies, process managers, and retry classification |
| Contracts | One minimal technical envelope standard; producer-owned versioned payload schemas and manifests |
| Adapters and platform | Reusable outbox relay, inbox admission, schema validation, broker connection, scheduling algorithms, backpressure, tracing, redaction, and persistence primitives |
| Composition | Shared process-wide connections and lifecycle resources, never shared repositories or business transactions |
| Testing | Reusable conformance suites and deterministic failure fixtures parameterized by context-owned adapters |

Platform eventing code may claim and publish records only through a narrow
context-owned dispatch port. It cannot query or mutate context tables directly.
Likewise, a reusable inbox executor may coordinate technical admission but cannot
own ACL mapping, semantic deduplication, business transactions, or terminal
meaning.

No generic `BaseEventHandler`, `BaseRepository`, `BaseProcessManager`, universal
notification pipeline, service locator, or cross-context domain package is
introduced. A new platform capability is extracted only after at least two
concrete context implementations prove an identical technical contract.

## NATS JetStream

NATS JetStream is the first production event-bus adapter because it supports
persistence, replay, durable consumers, acknowledgements, and operationally light
deployment.

Feature-owned JSON Schema Draft 2020-12 is canonical for integration-event
payloads. Public control Protobuf and `ar` runtime messages are never published
unchanged merely to reuse their wire shape.

The maintained Node adapter uses the modular `@nats-io/transport-node` and
`@nats-io/jetstream` packages. The deprecated monolithic `nats` package is not a
new dependency.

Core contracts remain broker-neutral. Responsibility is split deliberately:

- feature-owned event manifests declare semantic delivery, ordering, privacy,
  retention, replay, and payload requirements;
- inbound and outbound JetStream adapters own subjects, streams, consumers,
  publication, acknowledgement, topology reconciliation, and broker-specific
  failure mapping;
- local deployment composition supplies connection and resource policy;
- the Local Supervisor owns the bundled `nats-server` process, pinned binary,
  physical store path, health, restart, upgrade, and resource-limit lifecycle.

Local and hosted deployments use the same JetStream adapter family and applicable
conformance suites. The future local composition is zero-touch and connects to
Supervisor-managed NATS. The V1 server composition connects to externally
operated NATS. In the future local profile, the user never installs, configures,
or starts a broker for normal local use.

Hosted clustered readiness verifies JetStream metadata quorum, peer placement,
and required stream/consumer replicas rather than only a TCP connection or Core
NATS ping. Management operations use explicit deadlines and a quorum-side control
connection; they cannot remain attached indefinitely to an intentionally isolated
leader.

The Supervisor does not interpret subjects, provision semantic consumers, publish
events, acknowledge messages, or choose event retention. Conversely, a JetStream
adapter never installs, starts, or upgrades the broker process.

JetStream preserves the order in which a stream accepts messages. It does not by
itself provide aggregate ordering across concurrent publishers. The adapter must
implement the ordering policy declared by each contract.

The outbound adapter may use `eventId` as the JetStream publication deduplication
identity, but the broker deduplication window never replaces durable business
idempotency. Inbound durable consumers use explicit acknowledgement and acknowledge
only after inbox and business effects commit.

Integration-event fan-out uses `LimitsPolicy` streams by default. Each logical
bounded-context subscription gets its own durable pull consumer; horizontally
scaled handler replicas share that consumer. Consumers are not created per tenant,
process, or replica. `WorkQueuePolicy` is not used for integration fan-out because
overlapping consumers are prohibited, and `InterestPolicy` is not the default
because events published before consumer interest exists may be removed.

Consumer pull batch, concurrency, `MaxAckPending`, acknowledgement timeout,
redelivery backoff, and per-tenant admission are bounded deployment settings.
`MaxDeliver` is not a dead-letter store: exhaustion produces an advisory while the
message remains in the stream. A poison-message reconciler records redacted
quarantine evidence and controls terminal acknowledgement explicitly.

JetStream is not the authoritative source of aggregate state. Exact local store
backup, corruption handling, journal completeness, and historical replay remain
governed by OD-009 and OD-021.

The future managed local profile additionally enforces the evidence-backed
constraints from ADR-0035:

- the Supervisor holds an OS-level exclusive lock for the complete lifetime of
  each physical store because NATS does not reject a second standalone owner;
- durable inbox processing remains mandatory even for previously acknowledged
  messages because broker crashes can redeliver confirmed deliveries;
- configured storage limits and physical `ENOSPC` are distinct failure classes;
- broker startup does not prove stream completeness after corruption;
- backup restore, startup reconciliation, and typed degraded states are required.

Local readiness has three independent dimensions:

```text
process liveness
broker and JetStream service readiness
expected store-content integrity
```

A healthy process and HTTP 200 JetStream health response cannot authorize normal
dispatch after an unclean or suspicious recovery. The Supervisor and eventing
composition reconcile an independently durable expected watermark or content
manifest before leaving degraded mode. Bit-flipped or truncated stores, unexplained
sequence gaps, and content-hash mismatches fail closed even when the broker starts.

Physical disk exhaustion is not equivalent to a configured stream limit. The
future local profile maintains warning and critical headroom thresholds plus an
emergency reserve. A critical filestore write signal stops new dispatch admission; recovery
requires released capacity, controlled restart, integrity reconciliation, and
outbox/inbox recovery before readiness.

## Client realtime is not integration eventing

Centrifugo is the default client realtime edge, not another event bus or durable
journal. JetStream transports integration facts and commands between application
boundaries. Centrifugo fans out already-authorized client feed projections after
the owning context has committed its authoritative durable application feed.

```text
context UoW
  -> domain state
  -> durable client feed item
  -> realtime publication work
  -> commit

realtime relay
  -> Centrifugo live publication
  -> client
  -> authoritative feed cursor or snapshot reconciliation
```

Realtime publication work is durable and idempotent, but a Centrifugo
acknowledgement proves only that the edge accepted a publication. It does not
prove that a client received, displayed, read, processed, or checkpointed it.
Those meanings remain explicit application concepts when a feature needs them.

Centrifugo history is a bounded reconnect cache. Its offset, epoch, retention,
presence, and recovery result are adapter concerns. A lost publication, failed
recovery, restart, or gap returns the SDK to the context-owned feed. Domain
ordering, durable mailbox state, unread state, and business acknowledgements never
depend on realtime-edge retention.

The edge receives only feature-approved client projections or opaque wake
references. It never receives raw integration-event envelopes by default, and it
never converts client publication into a command. Broker-neutral event ports and
client-realtime ports remain separate even when one Host process composes both
adapters.

## Adapter reconnect and backpressure

The durable outbox, not the NATS client buffer, is the pending-publication queue.
When the broker is unavailable, the dispatcher stops claiming new rows beyond its
configured in-flight bound. A timed-out publication is an ambiguous outcome:
after reconnect and topology readiness, the adapter retries the same outbox row
with the same `eventId` and relies on downstream inbox idempotency.

Publication classification distinguishes:

```text
ACKNOWLEDGED
NOT_COMMITTED
UNKNOWN_OUTCOME
```

A process crash, timeout, or disconnected request may be persisted even when the
publisher never receives an acknowledgement. `UNKNOWN_OUTCOME` is retried only
with the original stable transport deduplication identity and remains safe through
the downstream durable inbox.

Consumers declare bounded `max_ack_pending`, batch size, processing concurrency,
and acknowledgement deadlines. The adapter does not request more work merely
because an in-memory iterator can buffer it.

Connection status is operational evidence, not business state or lifecycle
authority. Drain has a deadline. If disconnected drain rejects or times out, the
Host closes the client, preserves uncommitted outbox and inbox state, and
reconciles after restart. It never waits indefinitely for a status iterator to
finish.

## Topology evolution

The JetStream adapter owns a declarative desired-topology manifest and classifies
every observed diff before mutation:

- additive changes may be reconciled in place after compatibility checks;
- mutable operational limits may be updated in place;
- destructive changes, including subject or filter removal, require an explicit
  migration plan even when NATS accepts the update;
- immutable changes require versioned replacement rather than delete-and-recreate
  in place.

Stored messages surviving a subject removal does not make that change safe:
publishers may lose routing while consumers still see old data. Raw NATS errors
are never public error contracts because a missing route can surface as an
unrelated low-level classification. Exact dual-routing, cursor handoff, rollback,
and topology-version policy remains in OD-022.

The default compatible topology migration sequence is:

```text
PREPARED
-> EXPANDED
-> PARALLEL_CONSUMER
-> DUAL_ROUTE
-> BACKFILLED
-> PROVED
-> CUTOVER
-> RETIRED
```

Old and new consumers are independent at-least-once delivery paths and therefore
share the owning context's business inbox semantics. Backfill preserves the
domain `eventId` for business deduplication but uses a route-scoped transport
deduplication identity; one JetStream message ID reused across subjects in the
same stream can suppress the intended backfill.

Every stage and external topology mutation is durably recorded and reconciled
after restart. Rollback remains possible before cutover and after cutover only
while the old route and consumer are retained. Once the migration reaches
`RETIRED`, automatic rollback fails closed and requires an explicit forward
recovery or verified restore plan.

Broker binary rollout is a separate state machine from semantic topology
migration. Every node replacement waits for metadata quorum, zero-lag stream
replicas, a fresh placement probe, and acknowledged traffic before proceeding.
An adjacent patch upgrade and downgrade test does not authorize arbitrary
downgrade after new configuration, features, or store formats have been used.

JetStream stream sequence remains transport and audit metadata. Parallel
aggregates, redelivery, and backfill can produce different global interleavings.
Business ordering uses the contract's declared partition or aggregate revision,
never the stream's total sequence.

## Journal and replay

The system may keep append-only operational and integration-event records for:

- audit;
- diagnostics;
- projection rebuilding when completeness and retention are guaranteed;
- simulation;
- migration verification.

These records are not the default source of truth for rebuilding aggregates.
Projection rebuild cannot be promised until the journal defines completeness,
retention, schema upcasting, redaction, and replay authorization.

Replay classes impose different privacy contracts:

- complete journal replay retains every required schema, deterministic upcaster,
  sequence, and privacy-minimal payload for the declared support horizon;
- snapshot plus retained tail may use erasable detachable payloads only when an
  authoritative snapshot at or after erased history remains available and the
  complete tail after its watermark is retained;
- a non-rebuildable notification feed rejects projection replay explicitly.

An immutable journal envelope may retain an opaque payload reference and integrity
metadata while a separately protected payload is erased. The missing payload is
not replaced with fabricated data. Complete replay then fails, while a declared
snapshot-plus-tail flow may continue from a qualifying snapshot.

Historical input is validated against its original schema, deterministically
upcast into the current canonical projection input, and validated again. Required
historical schemas and upcasters remain available for the replay support horizon.

Replay authorization is evaluated against the current principal, project scope,
and declared replay authorization class before a plan, snapshot reference, or
event is exposed. Historical authorization at event occurrence does not grant
current replay access.

Catastrophic broker rebuild begins with a replay preflight. It verifies contiguous
contract-defined ordering, retained payload availability, schema support, and
authorization before publishing any replacement feed. Existing consumer inboxes
prevent repeated business effects when a complete retained journal is replayed.
A missing required payload or sequence produces an explicit non-rebuildable or
snapshot-required outcome, never a silently partial feed.

When several feeds are rebuilt together, every feed preflights successfully before
the first replacement event is published. Snapshot-plus-tail recovery publishes a
snapshot reference and validated tail rather than inventing compacted historical
events.

## Failure classification

Retries require explicit categories:

- transient transport failure;
- dependency unavailable;
- concurrency conflict;
- stale command or fencing rejection;
- invalid contract;
- permanent business rejection;
- operator action required.

Unknown failures must not retry forever. They become observable incidents with
correlation IDs and preserved diagnostics.
