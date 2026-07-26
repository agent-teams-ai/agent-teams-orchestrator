---
id: ADR-0006
type: adr
status: superseded
owner: platform/eventing
summary: Original event ordering decision superseded by broker-neutral partition ordering.
superseded_by:
  - ADR-0010
---

# ADR-0006: Event Ordering Is Declared Per Contract

Supersedes the per-aggregate ordering consequence in ADR-0004.

## Context

Different event families need different ordering semantics. Some aggregate events
require revision-aware processing, while operational telemetry and independent
notifications do not. NATS JetStream preserves stream acceptance order but cannot
create business ordering across concurrent publishers by itself.

## Decision

There is no global ordering guarantee. Every public event contract declares its
ordering scope:

- none;
- subject;
- aggregate;
- custom key.

Ordered contracts define key, sequence allocation, concurrent publication,
duplicate and gap handling, and consumer reconciliation. Consumers tolerate every
ordering behavior not explicitly guaranteed by the contract.

## Consequences

- High-cost ordering is used only where business invariants require it.
- Broker replacement does not silently change contract semantics.
- Aggregate revision remains distinct from broker sequence.
- Adapter conformance tests verify each claimed ordering policy.
- Cross-key workflows use explicit dependencies or process managers, not arrival
  order.

## Rejected alternatives

- One global ordered event log.
- Best-effort ordering with undocumented assumptions.
- Treat aggregate version as proof of broker delivery order.
