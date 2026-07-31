---
id: domain.contexts.human-notification
type: bounded-context
status: proposed
owner: human-notification
summary: Model boundary for human-facing notification, presentation preference, and acknowledgement lifecycle.
blocked_by:
  - OD-026
related:
  - ADR-0068
  - architecture.context-map
  - architecture.eventing
  - domain.contexts.agent-attention
  - OD-026
---

# Human Notification Management

## Domain vision

Give each human a reliable, controllable view of product facts that need their
attention without turning notifications into a second owner of source data or
mixing human presentation policy with agent execution.

## Scope

### Owns

- recipient-specific notification inbox state;
- presentation preferences, quiet periods, mute, snooze, and digest policy;
- presentation-channel dispatch intent and attempt evidence;
- read, dismiss, human acknowledgement, and escalation routing;
- aggregation and suppression rules for human attention.

### Does not own

- source facts, task comments, conversations, approvals, or alerts;
- agent relevance, context freshness, Run activation, or runtime input;
- transport acknowledgement as proof that a human read or acted.

## Ubiquitous Language

Candidate terms are `NotificationItem`, `PresentationPreference`,
`DeliveryChannel`, `QuietPeriod`, `DigestWindow`, `Snooze`,
`PresentationReceipt`, and `HumanAcknowledgement`.

These names remain proposed until event storming proves exact lifecycle and
aggregate boundaries. They are not aliases for Agent Attention concepts.

## Invariants and business rules

- Every item references an authoritative source fact and stores only the
  disclosure approved for human presentation.
- Human mute, snooze, digest, read, or dismissal never changes source state and
  never suppresses Agent Attention or Agent Context invalidation.
- Presentation receipt, read evidence, business acknowledgement, and source action
  are distinct facts.
- Duplicate and replayed source events cannot create duplicate logical items or
  external side effects.
- Current authorization and disclosure policy are rechecked before presentation.

## Aggregates and consistency boundaries

Exact aggregate boundaries remain open. The first slice must prove whether inbox
item lifecycle, recipient preference, and escalation policy require separate
aggregates. They cannot share one transaction with another bounded context.

## Domain events versus integration events

Domain events remain private to this context. Inbound source integration events
are validated and mapped by a consumer-owned ACL into application commands.
Outbound integration events describe Human Notification facts, never source facts
or Agent Attention decisions.

## Processes and state machines

Likely processes include scheduled presentation, digest assembly, escalation, and
delivery reconciliation. Their clocks and durable scheduling may reuse platform
primitives, while quiet-period, aggregation, and terminal meaning stay here.

## Context relationships

- Source contexts publish semantic facts through their Published Language.
- Agent Attention consumes independently and shares no notification policy.
- Query Composition may join notification projections with source summaries for
  clients without creating a cross-context write model.
- Centrifugo may fan out committed client-feed projections but is not the
  notification source of truth.

## Persistence ownership

The context owns its schema, migrations, repositories, inbox, outbox, projections,
and Unit of Work. There are no cross-context tables, foreign keys, or
transactions.

## Open questions

OD-026 owns exact aggregates, notification categories, source-reference
disclosure, preference precedence, acknowledgement, escalation, retention, and
first-slice acceptance scenarios.

## Implementation links

No production package is materialized until the Full DDD evidence gate passes.
