---
id: OD-018
type: open-decision
status: resolved
owner: clients/sdk
summary: Define SDK subscription feeds, ordering, cursor, retention, backpressure, and recovery semantics.
resolved_by: ADR-0019
related:
  - ADR-0010
  - ADR-0015
  - ADR-0019
  - ADR-0058
  - architecture.eventing
  - architecture.sdk-transports
  - OD-009
---

# OD-018: SDK Subscriptions and Recovery

## Decision required

Define public subscription feeds, ordering scopes, cursor ownership, replay and
live-tail handoff, retention expiry, reconciliation, backpressure, reconnect,
heartbeat, slow-consumer behavior, and merged convenience views.

## Constraints

- cursors are opaque and scoped to the feed that issued them;
- no merged view claims global ordering or one resumable cursor without an
  underlying guarantee;
- duplicate, gap, expired-cursor, and unavailable-history outcomes are typed;
- buffers are bounded;
- reconnect never hides data loss;
- large logs, output, and artifacts are not forced through one unlimited event
  stream.

## Resolution

Resolved by ADR-0019. Cursors are feed-scoped, callers own durable checkpoints,
buffers are bounded, reconnect is explicit, and snapshot bootstrap carries the
applied watermark and matching resume cursor or vector.

ADR-0058 later selected Centrifugo as the default replaceable live edge. It does
not change this resolution: Centrifugo positions remain adapter-local and any
failed recovery returns to the authoritative feed cursor or snapshot flow.
