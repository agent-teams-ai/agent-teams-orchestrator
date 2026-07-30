---
id: ADR-0004
type: adr
status: accepted
owner: platform/eventing
summary: Keep core event contracts broker-neutral and use NATS JetStream as the first production adapter.
related:
  - ADR-0010
  - ADR-0035
  - OD-002
---

# ADR-0004: Broker-Neutral Core with NATS JetStream Adapter

The original ordering consequence is superseded by ADR-0010. ADR-0035 later
resolved the local lifecycle decision by selecting Supervisor-managed bundled
JetStream for the default local profile.

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
- At-least-once delivery is part of contract semantics. The original
  per-aggregate ordering rule is superseded by ADR-0010.
- Replacing or supplementing JetStream does not rewrite business behavior.
- Local lifecycle was deliberately left open by this ADR and is now governed by
  ADR-0035.

## Rejected alternatives

- JetStream APIs in application services.
- Best-effort in-memory pub/sub as the production reliability model.
- Kafka as the initial control-loop transport.
