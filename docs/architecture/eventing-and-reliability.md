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
or external consumers. An application mapper converts domain events into
integration events.

Example:

```text
agent-teams.task-coordination.task-assigned.v1
```

### Operational events

Operational events describe delivery, retries, dead-letter decisions, health, and
diagnostics. They must not be confused with business facts.

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

Ordering is guaranteed only within one aggregate stream:

```text
aggregateType + aggregateId + sequence
```

There is no global ordering guarantee. Consumers coordinate facts from different
aggregates using explicit revisions, timestamps, dependencies, or process
managers rather than arrival order.

## Event envelope

Every public event must include:

```text
eventId
eventType
schemaVersion
aggregateType
aggregateId
aggregateSequence
occurredAt
producer
correlationId
causationId
tenant/project scope
payload
```

Schema validation occurs at publication and consumption boundaries.

## Transactional outbox

An application transaction:

1. loads the aggregate;
2. executes domain behavior;
3. persists aggregate changes;
4. appends integration-event outbox records;
5. commits once.

A relay publishes committed outbox records and records publication progress.
Publishing directly from a domain entity or before persistence commits is
prohibited.

## Consumer inbox

Durable consumers store processed event IDs or idempotency keys in the same
transaction as their business effects. A crash between handling and acknowledgement
must result in a safe duplicate, not a repeated effect.

## NATS JetStream

NATS JetStream is the first production event-bus adapter because it supports
persistence, replay, durable consumers, acknowledgements, and operationally light
deployment.

Core contracts remain broker-neutral. Subject naming, stream layout, retention,
consumer configuration, and local desktop lifecycle belong to the JetStream
adapter and deployment composition.

## Journal and replay

The system keeps append-only operational and integration-event records for:

- audit;
- diagnostics;
- projection rebuilding;
- simulation;
- migration verification.

These records are not the default source of truth for rebuilding aggregates.

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
