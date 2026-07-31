---
id: domain.contexts.agent-communication
type: bounded-context
status: proposed
owner: agent-communication
summary: Proposed model boundary for typed team communication and delivery semantics.
blocked_by:
  - OD-006
  - OD-013
  - OD-026
related:
  - architecture.context-map
  - architecture.runtime-boundary
  - ADR-0004
  - ADR-0035
  - OD-006
  - OD-013
  - OD-026
---

# Agent Communication

## Confirmed strategic boundary

Agent Communication owns product-level dialogue between human and agent
participants and between agents. Product conversations, authorship, audience,
visibility, message identity, reply relationships, product acknowledgement, and
conversation history belong to the Orchestrator. A conversation survives runtime
session replacement, provider changes, retries, and process restarts.

Runtime input, provider output, raw transcript chunks, tool calls, compaction,
provider cursors, and technical input application remain owned by `ar`. The Runtime
ACL translates a product delivery intent into an AR command without becoming a
durable owner on either side.

## Confirmed model constraints

- Direct, ad-hoc group, and named-channel dialogue use one Conversation language
  with explicit policy profiles rather than unrelated message systems or class
  inheritance.
- Shared group history and independent multicast are different commands and cannot
  be inferred only from an equal recipient set.
- Product authors and recipients use product identity. Runtime-session references
  are opaque provenance or delivery bindings, never participant identity.
- Conversation membership, notification subscription, message audience, and
  per-recipient delivery are different concepts.
- Conversation history is not an unbounded collection inside one aggregate.
- Messages reference attachments and large artifacts through typed, authorized
  artifact references. Conversation owns message provenance, audience, and
  visibility of the reference, not blob bytes or provider storage.
- A task comment, domain notification, approval, alert, or control signal never
  becomes a conversation message implicitly.
- Promoting provider output into a visible product message is an explicit
  authorized application command with provenance, not automatic transcript copy.

Exact aggregate boundaries among `Conversation`, append-only message records,
audience snapshots, delivery state, and inbox projections remain in OD-006.

## Transport boundary

Canonical conversation state and resumable product feeds live in
context-controlled persistence. SDK and Connect adapters are the normal client
surface. The durable outbox publishes broker-neutral dispatch or integration
records after commit.

JetStream may perform internal wake-up, fan-out, redelivery, and integration-event
transport, but it is not the Conversation API, the only copy of a message, or the
source of product acknowledgement. Broker acknowledgement and runtime-input
acceptance are distinct from product read or processing acknowledgement.

## Deliberately unresolved

OD-026 decides the exact boundary among conversations, task-derived
notifications, user-facing alerts, subscriptions, attention policy, and
runtime-delivery timing. Implementation must not add a generic `messageKind` or one
mailbox state machine to choose that boundary implicitly.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
