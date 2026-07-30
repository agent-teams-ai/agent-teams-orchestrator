---
id: ADR-0068
type: adr
status: accepted
owner: architecture/domain
summary: Separate human notification management from agent attention while reusing only technical platform mechanisms.
approved_by: product-owner
accepted_at: 2026-07-30
related:
  - architecture.context-map
  - architecture.eventing
  - domain.contexts.human-notification
  - domain.contexts.agent-attention
  - OD-026
  - OD-028
  - OD-033
---

# ADR-0068: Separate Human Notification and Agent Attention Contexts

## Context

Human notifications and agent attention both react to source facts and require
durable scheduling, deduplication, delivery, and observability. Their business
meaning is nevertheless different.

Human Notification Management decides how a human is informed and owns inbox,
preference, presentation, read, snooze, digest, acknowledgement, and escalation
semantics. Agent Attention decides whether a source fact justifies re-orienting an
agent for a purpose and owns relevance, novelty, expiry, coalescing, disruption
intent, and feedback-loop suppression. Run Orchestration remains authoritative for
activation timing and execution consequences. The context owner selected by
OD-028 remains authoritative for context content, provenance, validity, and
materialization intent.

Combining these concepts because they use similar delivery machinery would create
one model with unrelated reasons to change and would let human presentation
preferences affect agent execution.

## Decision

Create two bounded contexts under one conceptual Attention and Notification
subdomain:

1. `Human Notification Management` owns human-facing attention and presentation
   lifecycle.
2. `Agent Attention` owns agent-specific relevance, orientation need, and bounded
   disruption intent.

The contexts share no DDD Shared Kernel, aggregate, repository, transaction,
status enum, priority type, subscription model, or public intent type.

Source bounded contexts publish one producer-owned semantic integration fact.
They do not publish downstream-specific notification, attention, or context
candidates. Each consumer owns a durable subscription, inbox, anti-corruption
mapping, application command, transaction, retry classification, and local
outbox. One source event may therefore be consumed independently by Human
Notification Management, Agent Attention, the future context owner selected by
OD-028, or other contexts without the producer knowing its subscribers.

Shared reuse is limited to technical platform capabilities such as:

- event envelopes, schema validation, transactional outbox and inbox mechanics;
- JetStream connection, topology, publication, acknowledgement, and backpressure;
- clocks, timers, delayed scheduling algorithms, tracing, redaction, and audit;
- persistence transaction primitives and deterministic conformance harnesses.

Each context retains its own semantic deduplication, policy, retention,
reconciliation, and terminal outcomes. Platform packages cannot import business
contexts or read context-owned tables directly.

Human mute, snooze, digest, or read state cannot suppress Agent Attention or mark
context fresh. Agent Attention may emit an orientation intent but cannot wake,
pause, interrupt, start, or fence a Run. Safety and revocation authority bypasses
attention and is rechecked by the owning use case immediately before an external
side effect.

The strategic split is accepted now. Exact aggregates, state machines, policy
profiles, and first-slice commands remain subject to the Full DDD evidence gates
in OD-026, OD-028, and OD-033.

## Consequences

- Human and agent attention evolve independently without duplicating transport
  infrastructure.
- Cross-context collaboration is eventually consistent and independently
  recoverable; one failing consumer does not roll back another context.
- Mapping code is intentional at every context boundary.
- Technical DRY is enforced below business semantics rather than through generic
  domain abstractions.
- Future service extraction preserves the same Published Language and
  context-owned inbox/outbox boundaries.

## Rejected alternatives

- One Notification or Attention bounded context with human and agent variants.
- Put human notifications inside Agent Communication.
- Put agent attention inside Agent Context or Run Orchestration.
- Publish one downstream-specific event for every known consumer.
- Create a shared domain package containing recipient, priority, delivery, or
  acknowledgement types.
