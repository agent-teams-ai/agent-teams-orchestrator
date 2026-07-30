---
id: OD-009
type: open-decision
status: open
owner: platform/eventing
summary: Define operational event-journal retention, compaction, privacy, and replay authorization.
related:
  - ADR-0035
  - architecture.eventing
---

# OD-009: Event-Journal Retention and Replay

## Decision required

Define retention, compaction, privacy, redaction, replay authorization, and the
relationship between operational events and integration events.

## Constraints

Event sourcing remains out of scope unless accepted separately. Operational
journals are not automatically authoritative aggregate history.

The policy must also define catastrophic JetStream reconstruction:

- which retained application records can republish integration events after
  complete broker-store loss;
- how already-applied consumer inboxes prevent repeated business effects;
- whether replay is complete enough to rebuild each declared projection;
- how schema upcasting, privacy deletion, and replay authorization constrain
  retained payloads;
- how a missing or expired event becomes an explicit non-rebuildable outcome
  instead of silent partial recovery.

Each published contract must select and test one replay class:

- complete journal replay;
- snapshot plus retained tail replay;
- non-rebuildable notification feed.

The class determines payload retention, privacy erasure behavior, projection
rebuild promises, and catastrophic broker recovery. A global retention default
cannot silently upgrade a feed to a stronger replay guarantee.

## Decision evidence

An isolated SQLite replay harness on 2026-07-25 passed 16/16 scenarios with Node
24.18.0, SQLite 3.53.1, and Ajv 8.20.0. It proved deterministic schema upcasting,
complete replay, snapshot-plus-tail recovery after detachable payload erasure,
explicit non-rebuildable feeds, current-scope replay authorization, gap and
integrity preflight, all-feed preflight before broker reconstruction, and durable
consumer-inbox suppression.

The evidence selects these constraints:

- complete replay accepts only privacy-minimal payloads whose required history,
  schemas, and upcasters remain available for the support horizon;
- erasable payloads require snapshot-plus-tail or non-rebuildable semantics;
- compaction cannot pass a verified snapshot watermark;
- missing payloads or schemas fail before any projection or broker feed changes;
- replay authorization is evaluated at replay time before output;
- snapshot-plus-tail broker recovery publishes a snapshot reference plus the
  validated tail, not fabricated historical events.

The retained `Journal privacy and replay` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

Exact retention durations, archive tiers, legal holds, encryption/key management,
privacy-erasure approval, and external audit access remain open.

The poison-message quarantine lifecycle also remains open: owner, redacted record
shape, classification transitions, operator authorization, correction and
reclassification, release or replay, retention, erasure, and audit. A terminal
transport acknowledgement is allowed only after the redacted quarantine record
commits; quarantine cannot become a raw prompt, attachment, or credential store.

## Resolution

Open.
