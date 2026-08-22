---
id: ADR-0092
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: execution-observation
summary: Fence historical disclosure, delay publication until Run attribution is authoritative, and make search revisions append-only.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0084
  - ADR-0085
  - ADR-0089
  - architecture.security
  - domain.contexts.execution-observation
---

# ADR-0092: Current Disclosure and Attribution Fencing

## Context

ADR-0085 and ADR-0089 retain revisioned search documents for snapshot cursors
and route Activity through a stable Run or Project-system feed partition. Three
details need stronger semantics before implementation:

- an old cursor must not reveal a revision withdrawn by a later redaction or
  security invalidation;
- runtime evidence can arrive before the local Run attribution fact;
- index generations need append-only revision behavior without pretending that
  an active generation is a frozen complete snapshot.

## Decision

### Current disclosure fence

Snapshot history is subordinate to current disclosure safety. A context-local
current-disclosure projection records the allowed public revision, redaction
profile revision, and invalidation state for each searchable Activity. A
redaction replacement, quarantine, retraction, or security invalidation commits
this fence before asynchronous reindexing.

Search and timeline queries join the current fence before matching, ranking,
counting, paginating, cursor advancement, or rendering. A stale document revision
is hidden immediately, including through old generations and cursors, until an
allowed replacement is indexed. Cursor snapshot semantics never preserve access
to content that is no longer safe to disclose.

### Run attribution before publication

Run attribution is tri-state: `pending`, `bound(runRef, sourceRevision)`, or
`explicitly-unbound(sourceRevision)`. Evidence may be durably admitted while
attribution is pending, but it cannot create a public Activity, feed record, or
search document. A checkpointed reconciler publishes it only after the local Run
reference projection proves either a binding or an explicit no-Run outcome.

The first public feed partition is selected from authoritative local evidence
rather than arrival order. If Run Orchestration later publishes an authoritative
attribution correction, Observation appends a retraction in the old partition
and a linked successor Activity in the new partition. It never moves an existing
sequence or silently changes an open cursor.

### Append-only index generations

An index generation has immutable identity, analyzer configuration, and schema,
but its document history is append-only while it is being built or is active. An
index `upsert` means idempotently ensuring one exact document revision; it never
rewrites an older revision. Snapshot queries select the newest currently allowed
revision at or before their watermark. A generation is sealed when superseded
and retained only for the bounded cursor horizon.

## Consequences

- Redaction and security invalidation can temporarily hide an Activity while a
  safe replacement catches up; availability never overrides disclosure safety.
- Evidence arriving before Run attribution is retained without guessing a feed
  partition.
- Attribution correction remains append-only and cursor-safe at the cost of a
  linked retraction and successor Activity.
- Search adapters need current-disclosure joins and append-only revision
  conformance in addition to snapshot retention.

## Rejected Alternatives

- Let old snapshot cursors preserve content withdrawn by a newer safety decision.
- Assign Project-system merely because Run attribution arrived late.
- Move an existing feed sequence between partitions.
- Rewrite document revisions in place inside an active index generation.
