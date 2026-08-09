---
id: ADR-0009
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/eventing
summary: Model commands and events as distinct contracts with different semantics.
---

# ADR-0009: Commands and Events Have Distinct Contracts

Clarifies ADR-0004.

## Context

Commands request work from one logical owner and may be rejected. Events describe
facts and may have many consumers. Treating both as generic broker messages makes
authorization, replay, deduplication, retention, and outcome semantics ambiguous.

## Decision

Commands and events use separate broker-neutral contracts and envelopes.

Durable commands define owner, authorization, deadline, cancellation, idempotency,
acceptance, completion, result lookup, and unknown-outcome behavior. Events define
fact semantics, producer, compatibility, retention, ordering, and consumer
reconciliation.

When a durable command results from a committed state transition, a separate
command-dispatch record is persisted atomically with that state. A relay dispatches
it after commit. It is not stored or replayed as an event.

Historical commands are not replayed as facts.

## Consequences

- NATS may transport both without making their semantics identical.
- Runtime and application command ledgers can prevent duplicate mutations.
- SDKs can represent accepted asynchronous work separately from completed results.
- Additional contract and conformance tests are required.

## Rejected alternatives

- One generic message envelope for commands and events.
- Best-effort command retries without durable idempotency.
- Replaying old commands to rebuild projections.
