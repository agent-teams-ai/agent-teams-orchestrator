# Eventing and Reliability

Status: **Accepted baseline**

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

## Commands are not events

A command requests one owner to perform an action and may be rejected. An event
describes a fact that already happened and may have many consumers. They use
separate contracts, envelopes, retention, authorization, deduplication, and replay
rules.

Durable command contracts define:

- the single logical owner;
- idempotency-key scope and retention;
- payload-hash behavior when a key is reused;
- deadline and cancellation semantics;
- `accepted`, `rejected`, `completed`, and unknown-outcome behavior;
- whether and how the original result can be queried.

Historical commands are never replayed as if they were facts.

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

`scope` is a strict tagged union such as `system`, `tenant`, or `project`.
Business events for teams, tasks, runs, messages, and runtime bindings require a
project scope. System operational events must not fabricate tenant or project
identities.

Events include source identity, revision, partition/ordering key, and sequence only
when their contract semantics require them. Operational events that do not
originate from an aggregate must not fabricate aggregate identities.

Schema validation occurs at publication and consumption boundaries.

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

## NATS JetStream

NATS JetStream is the first production event-bus adapter because it supports
persistence, replay, durable consumers, acknowledgements, and operationally light
deployment.

Core contracts remain broker-neutral. Subject naming, stream layout, retention,
consumer configuration, and local desktop lifecycle belong to the JetStream
adapter and deployment composition.

JetStream preserves the order in which a stream accepts messages. It does not by
itself provide aggregate ordering across concurrent publishers. The adapter must
implement the ordering policy declared by each contract.

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
