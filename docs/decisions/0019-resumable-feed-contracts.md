---
id: ADR-0019
type: adr
status: accepted
owner: clients/sdk
summary: Use feed-scoped cursors, explicit checkpoints, and snapshot watermarks for resumable SDK subscriptions.
related:
  - ADR-0015
  - ADR-0016
  - OD-009
  - OD-018
---

# ADR-0019: Resumable Feed Contracts

## Context

Transport streaming does not provide durable replay. A stream can disconnect
after a snapshot but before live events arrive, after an event is delivered but
before the caller processes it, or after retained history has expired.

A merged stream cannot provide one durable cursor or total order when its source
feeds have independent ordering and retention.

## Decision

Each public subscription names one feed and declares:

- feed identity and ordering scope;
- at-least-once delivery;
- event identity and optional monotonic feed sequence;
- opaque feed-scoped cursor;
- retention and cursor-expiry behavior;
- maximum event size and buffering policy.

The durable feed log is the only replay source. An in-memory notification may
wake a live reader, but the reader always returns to the durable log to allocate
its next item. Replay-to-live handoff captures notification state, reads the log,
rechecks notification state, and only then waits with a bounded fallback. A
notification is never treated as the event itself.

Official SDKs expose capability-specific streams. A merged convenience view may
be added only as a non-durable live view without one resumable cursor or global
ordering claim.

The SDK does not equate iterator delivery with successful application processing.
Durable checkpoint storage belongs to the caller. Reconnect is explicit and starts
from the caller's last persisted checkpoint. Duplicates remain possible and are
identified by event ID.

The SDK bounds every local stream buffer. It first applies transport flow control
where available. If a consumer still cannot keep up, the stream terminates with a
typed slow-consumer outcome and the last safely exposed cursor. Events are never
silently dropped.

Heartbeats, transport keepalive, and auth refresh do not consume business feed
sequence numbers. A reconnect obtains a current credential and is bounded; repeat
authentication failure is terminal rather than an infinite loop.

A stream credential is not refreshed in place. The SDK closes the failed stream,
performs one bounded credential refresh, and opens a new stream from the caller's
explicit checkpoint. Duplicate event IDs are suppressed defensively. A
minimum-usable-lifetime guard and auth-churn circuit breaker prevent repeated
expiry at the same replay position.

Snapshot bootstrap uses a consistency barrier:

```text
getSnapshot() -> state + appliedWatermark + resumeCursor
subscribe(afterCursor = resumeCursor)
```

The snapshot reflects all feed changes through its applied watermark, and the
subscription begins strictly after the matching cursor. A lagging projection
returns its applied cursor, not the current feed head. A composite snapshot over
independent feeds returns a resume vector keyed by feed; it never invents one
global cursor.

When a cursor expires or history is unavailable, the client receives a typed
outcome and repeats the authoritative snapshot or documented reconciliation flow.
The server rejects an expired cursor before returning any partial retained tail.
The SDK never reconnects past an undisclosed gap.

Cursors are opaque, integrity protected, and bound to their feed, scope, and
query semantics. Cursor signing or encryption keys remain durable across normal
Host restarts and follow an explicit rotation policy. A cursor from another feed
or a modified cursor fails with a typed outcome rather than being interpreted as
a position.

Large logs, provider output, attachments, and artifacts use separate bounded feeds
or artifact storage and do not share unlimited retention with control events.

## Consequences

- Snapshot-to-stream handoff does not create a silent loss window.
- Callers control when processing is durable.
- Explicit duplicate and expiry handling is required.
- Composite views require resume vectors or full reconciliation.
- SDKs cannot hide every reconnect behind a transparent infinite retry loop.

## Rejected alternatives

- Treat a Connect stream as the durable event source.
- Advance a durable cursor when an item merely enters an SDK buffer.
- Claim one resumable cursor for independently ordered feeds.
- Drop buffered events for slow consumers.

## Evidence

- [Kubernetes list and watch consistency](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)
- [Connect cancellation and timeouts](https://connectrpc.com/docs/web/cancellation-and-timeouts/)
- The isolated durable-control-feed spike on 2026-07-25 passed 16/16 checks
  against Node 24.18 `node:sqlite` and PostgreSQL 18.4 through a real Connect
  server stream. It covered atomic state plus feed append, snapshot watermark
  handoff, concurrent replay/live transition, restart resume, duplicate
  suppression, cursor expiry, cursor scope/integrity, and a bounded slow
  consumer. The retained `Durable control feed` fingerprint is in the
  [foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
