---
id: domain.contexts.agent-communication
type: bounded-context
status: accepted
owner: agent-communication
summary: Scoped sandbox semantics and ownership for agent communication.
related:
  - ADR-0103
  - contract.migration.desktop-first-slice.v1
  - architecture.context-map
  - architecture.runtime-boundary
  - ADR-0004
  - ADR-0035
  - OD-006
  - OD-013
  - OD-026
---

# Agent Communication

## Accepted implementation scope

ADR-0103 accepts only `src/features/direct-conversation/` for the server sandbox
runtime migration. This status describes that bounded scope; it does not admit
other capabilities from the broader model below. Existing accepted ADR invariants
remain binding. The owning reserved package and LikeC4 identity do not change.

## Domain vision

Persist direct human/member dialogue independently from provider delivery and runtime sessions.

## Scope

Owns: One direct Conversation audience for an admitted Run, immutable messages, per-recipient delivery intent and authorized history.

Excluded from this admission: Group/cross-team routing, notifications, Attention policy, attachments and generic public Conversation creation in this increment.

## Ubiquitous Language

Conversation fixes dialogue audience; Message is immutable product content; recipient delivery facts distinguish commit, runtime acceptance, read and reply.

## Invariants and business rules

Canonical product identity establishes authorship and audience. Commit never implies read/replied. Optional missing evidence remains unknown. Provider output is not automatically a product message.

## Aggregates and consistency boundaries

| Root and identity                                                         | Protected invariants | Commands                                                     | Domain events                                                           | Transaction                                                          | Concurrency                                                                                                                                      | Growth bound                                                                                       | External facts                                                                                  | Rejected boundaries                                                     |
| ------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Conversation audience plus separately persisted immutable Message records | Invariants above     | Internal ensureDirectConversation; SendMessage; ListMessages | DirectConversationEnsured; MessageCommitted; RecipientDeliveryRequested | One owner-local Unit of Work including receipt, Operation and outbox | Stable child UUID and fixed audience fingerprint; changed audience conflicts; query-time authorization and receipt replay recheck current grant. | One member/Run in this slice; history and receipts stored separately with finite declared horizons | Exact Run participant, bound human subject, authorized Task/reply references and current grant. | No provider-state mirror, cross-context aggregate or shared transaction |

Repositories persist only the owning roots/state; read queries use authorized
projections. Transport schemas and persistence records map to separate domain and
application models. IDs and ExactInstant values enter through explicit ports;
no provider/transport/database type enters business policy.

## Commands, processes and errors

Ensure audience -> commit message and delivery intent -> observe independent delivery facts. Pending/unknown ensure blocks required-message readiness; SendMessage does not implicitly create.

Application processes persist stable child identities, checkpoints and external
intent before dispatch. Domain events above express local facts; integration
publication intent and wire events remain separate mapped surfaces. Typed errors
include forbidden scope, stale authority/ETag, conflicting request and explicit
unknown outcome. A timeout never authorizes an unkeyed effect or legacy replay.

## Concurrency and conflict model

Stable child UUID and fixed audience fingerprint; changed audience conflicts; query-time authorization and receipt replay recheck current grant.

Persistence owns one context schema, local transaction and forced RLS boundary.
The server borrows its low-level pool; it never borrows another context's Unit
of Work, repository or transaction. Rehydration validates invariants and exact
values rather than trusting a transport DTO.

## Context relationships

Run activation stores only returned Conversation reference; runtime input travels through a consumer-owned delivery port; neither side writes the other tables.

## Security and authorization

Trusted scope and subject come from the selected authority adapter. The sandbox
authority is explicitly test-only, current grants apply on replay and reads, and
no prompt/provider payload can select trusted identity. Raw secrets and protected
payload remain in their owning adapters. This admission does not qualify a
deployment, authorize user-project testing or weaken accepted privacy rules.

## Verification scenarios

Audience retry commits once, conflicting human recipient rejects, revoked replay rejects, runtime acceptance does not invent read or reply.

The [accepted sandbox contract](../../../contracts/desktop-runtime-migration-admission-v1.md)
links deterministic fixtures and exact Protobuf sources. Actual domain,
rehydration, concurrent PostgreSQL transaction, response-loss and restart tests
are required with implementation; their names follow the scenarios above.
Synthetic admission models do not assert adapter or provider qualification.

## Implementation links

The package remains reserved until the canonical Plan/Apply scaffolder runs.
The accepted feature's colocated documentation, public entrypoints, source
boundaries and feature allowlist are materialized in the same implementation
change. No other feature is authorized by this dossier status.

## Excluded model and unresolved questions

OD-006, OD-013 and OD-026 retain broader aggregate, retention, group and delivery-policy questions.

The following retained material describes broader context discovery and existing
ADR references. Proposed behavior outside the accepted feature remains excluded
and must use its owning decision process before implementation.

### Confirmed strategic boundary

Agent Communication owns product-level dialogue between human and agent
participants and between agents. Product conversations, authorship, audience,
visibility, message identity, reply relationships, product acknowledgement, and
conversation history belong to the Orchestrator. A conversation survives runtime
session replacement, provider changes, retries, and process restarts.

Runtime input, provider output, raw transcript chunks, tool calls, compaction,
provider cursors, and technical input application remain owned by `ar`. The Runtime
ACL translates a product delivery intent into an AR command without becoming a
durable owner on either side.

### Confirmed model constraints

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

### Transport boundary

Canonical conversation state and resumable product feeds live in
context-controlled persistence. SDK and Connect adapters are the normal client
surface. The durable outbox publishes broker-neutral dispatch or integration
records after commit.

JetStream may perform internal wake-up, fan-out, redelivery, and integration-event
transport, but it is not the Conversation API, the only copy of a message, or the
source of product acknowledgement. Broker acknowledgement and runtime-input
acceptance are distinct from product read or processing acknowledgement.

### Deliberately unresolved

OD-026 decides the exact boundary among conversations, task-derived
notifications, user-facing alerts, subscriptions, attention policy, and
runtime-delivery timing. Implementation must not add a generic `messageKind` or one
mailbox state machine to choose that boundary implicitly.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
