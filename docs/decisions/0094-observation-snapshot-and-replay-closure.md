---
id: ADR-0094
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: execution-observation
summary: Close observation snapshot isolation, disclosure intervals, attribution ordering, and replay hydration semantics.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0058
  - ADR-0085
  - ADR-0089
  - ADR-0092
  - architecture.security
  - architecture.testing
  - domain.contexts.execution-observation
---

# ADR-0094: Observation Snapshot and Replay Closure

## Context

ADR-0092 closes the main stale-disclosure and late-attribution risks, but its
single current allowed revision can accidentally hide a still-safe revision from
an older snapshot. Source watermarks alone also cannot freeze search results when
late indexing commits old source data after a cursor is issued.

At-least-once Run attribution needs explicit compare-and-advance semantics. Every
feed, realtime, export, and payload path must honor current disclosure rather
than relying only on search and timeline checks.

## Decision

### Disclosure safety intervals

The current-disclosure projection stores safety dispositions over Activity
revision intervals, not one latest-revision pointer. Publishing a newer safe
revision does not withdraw an older safe revision. A redaction, quarantine,
retraction, or security invalidation closes or denies the affected revision
intervals at a monotonic disclosure epoch.

Snapshot selection first chooses a revision by its snapshot position and then
checks whether that exact revision remains currently safe. A later safety
withdrawal overrides every historical snapshot. An ordinary safe update does not.

### Index-local snapshot position

Every document revision receives a monotonic index commit position only when it
becomes queryable in one generation. A search cursor binds generation plus index
commit position. Documents committed later are excluded even when their source
position is older than the cursor's source watermark.

Source watermarks continue to report completeness and upstream progress; they do
not provide index snapshot isolation. A generation applies index positions in a
contiguous committed sequence or reports a gap and refuses snapshot pagination.

### Monotonic Run attribution

The local Run attribution projection advances by monotonic source revision using
compare-and-advance semantics. Exact duplicate revision and payload is
idempotent. The same revision with different payload is a conflict. A lower
revision is stale and cannot change state. A gap leaves attribution pending and
starts reconciliation; it cannot publish or correct an Activity until continuity
is restored.

Each accepted attribution correction has a deterministic identity derived from
the source stream and revision. Duplicate delivery cannot append another
retraction or successor Activity.

### Disclosure-safe delivery and replay

Current authorization, deletion, and disclosure safety are checked when
hydrating every public Activity View for timeline, `ResumeActivityFeed`, snapshot,
search, export, and diagnostic payload access. Durable feed records carry stable
Activity/revision references and change metadata, not an authority to disclose a
previously materialized view.

For V1, Centrifugo history carries bounded wake-ups and feed positions rather
than replayable Activity content. Reconnect always hydrates authorized views from
the Host and reconciles against the durable feed. A cached or late Activity View
with an older disclosure epoch is discarded.

## Consequences

- Safe historical snapshot revisions remain readable until their cursor horizon
  unless a current safety decision explicitly withdraws them.
- Late indexing cannot alter an already-issued snapshot.
- Out-of-order attribution cannot regress Run visibility or duplicate a
  cross-partition correction.
- Realtime reconnect costs an authorized Host hydration but cannot replay stale
  content from edge history.

## Rejected Alternatives

- Treat the latest safe revision as the only revision visible to every cursor.
- Use source time or source watermark as the index snapshot boundary.
- Apply Run attribution by arrival order.
- Replay materialized Activity content from a non-authoritative realtime cache.
