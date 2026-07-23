# ADR-0004: Broker-Neutral Core with NATS JetStream Adapter

Status: **Accepted**

## Context

Durable delivery, replay, retries, and predictable communication are required.
NATS JetStream is a strong first production transport, but coupling core behavior
to JetStream subjects and consumer APIs would make replacement and testing harder.

## Decision

Define broker-neutral event and command ports. Use NATS JetStream as the first
production event-bus adapter. Use transactional outbox and idempotent inbox
patterns independently of the broker.

## Consequences

- Domain and application code do not import NATS.
- JetStream-specific stream, subject, retention, and consumer policy stays in the
  adapter.
- At-least-once delivery and per-aggregate ordering are part of contract semantics.
- Replacing or supplementing JetStream does not rewrite business behavior.
- Local desktop NATS lifecycle remains a deployment decision.

## Rejected alternatives

- JetStream APIs in application services.
- Best-effort in-memory pub/sub as the production reliability model.
- Kafka as the initial control-loop transport.
