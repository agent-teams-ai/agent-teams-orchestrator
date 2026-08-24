---
id: ADR-0085
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: execution-observation
summary: Protect raw observation payloads separately and keep search an authorized rebuildable projection rather than product truth.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0011
  - ADR-0019
  - ADR-0023
  - ADR-0025
  - ADR-0055
  - ADR-0058
  - ADR-0084
  - architecture.persistence
  - architecture.security
  - domain.contexts.execution-observation
  - OD-029
---

# ADR-0085: Protected Observation Payload and Rebuildable Search

## Context

Runtime output may contain source code, prompts, command output, paths, secrets,
terminal control characters, malformed Unicode, or very large provider-native
objects. Users need authorized diagnostic access and fast search, but raw payload,
canonical evidence, timeline projection, realtime delivery, and search index
have different consistency, security, retention, and failure properties.

SQLite, PostgreSQL, filesystem or object storage, and future search engines
cannot participate in one honest atomic transaction. Pretending otherwise would
lose payloads, resurrect deleted text, expose cross-tenant data, or make an index
failure stop canonical ingestion.

## Decision

Execution Observation separates three durable responsibilities:

```text
canonical evidence and safe activity timeline
protected diagnostic payload
rebuildable authorized search projection
```

Search is never a source of truth. Raw payload is never canonical evidence.
Realtime delivery is never durable history.

### Protected payload boundary

Application code uses narrow capabilities such as
`DiagnosticPayloadAccess` and `DiagnosticPayloadLifecycle`. Physical
`BlobStore`, cipher, key wrapping, object identity, and deletion drivers remain
adapter internals and are not general application ports.

Every payload is classified and redacted before a bounded safe preview can enter
an activity, feed, search document, export, or telemetry signal. Full payload is
stored only when its retention class, disclosure policy, quota, and source
contract permit it. Credentials are never intentionally stored; discovered
secret-like material is removed or quarantined according to the active redaction
profile.

Protected payload storage uses envelope encryption. Each object has a distinct
data-encryption key wrapped by an authorized tenant or project key, with algorithm,
key version, and encryption context recorded in its manifest. Rotation normally
rewraps the data key. Interrupted rotation supports old and new key versions until
reconciliation completes.

Cross-tenant content-addressed deduplication is prohibited. Object identity is
random or uses a tenant-scoped keyed digest. Integrity digest, object identity,
and deduplication identity are separate values. Low-entropy sensitive payloads
may disable deduplication entirely.

### Commit protocol

Blob storage and search are outside the context database Unit of Work. Ingestion
uses the following recoverable protocol:

```text
write encrypted payload as staged and durable
-> database transaction:
     evidence envelope
     payload manifest
     safe activity projection
     durable activity feed record
     indexing outbox record
-> commit
-> committed manifest makes the staged blob reachable
-> idempotent indexer applies the outbox
-> orphan collector removes unreachable staged blobs after grace and recheck
```

For a source contract that makes raw payload mandatory, the database transaction
does not commit until durable blob write is confirmed. For optional verbose raw,
canonical evidence may commit with an explicit diagnostic gap. Missing or corrupt
payload after a committed manifest produces `DiagnosticPayloadUnavailable` and
operational evidence; it is never returned as an empty successful payload.

Index upsert identity includes tenant scope, document identity, and revision. An
older revision cannot overwrite a newer one. Lost index acknowledgement is safe
to retry. Index unavailability leaves canonical ingestion and timeline reads
available.

### Search contract

The engine-neutral application query supports only registered fields and bounded
operations. The common baseline includes terms, phrase where supported, prefix
where supported, exact identifiers, paths, typed filters, time range,
chronological order, opaque cursor, completeness, and freshness metadata.

Timeline browsing reads `ActivityProjection`, not the search index. Full raw
payload and arbitrary provider JSON are never indexed. Search indexes only
allowlisted redacted fields.

SQLite FTS5 is the first local adapter and PostgreSQL `tsvector` with GIN is the
first server adapter. They must produce the same authorization and chronological
business behavior, but need not produce the same tokenizer, language stemming,
phrase behavior, ranking, or score. Relevance is an advertised adapter capability,
not a cross-engine guarantee.

`SearchCapabilities` declares analyzer profile and version, supported languages
and text modes, phrase and prefix behavior, relevance support, and pagination
consistency. Natural language, command or code tokens, workspace paths, and exact
identifiers use distinct registered field profiles.

### Pagination and authorization

A cursor is opaque, encrypted, integrity protected, expiring, and bound to:

```text
query fingerprint
subject and authorization epoch
authorized scope fingerprint
index and projection generation
snapshot watermark
analyzer and projection versions
last stable sort tuple
expiry
```

Every page repeats authorization and filters against current visibility and
deletion projections. Tenant or project scope is derived from authenticated
context, not trusted from query parameters or cursor content. PostgreSQL RLS is
defense in depth, never the only boundary.

Chronological pagination uses committed immutable activity sequence plus a stable
tie-breaker. Relevance pagination is available only when the adapter can preserve
a point-in-time snapshot. Otherwise relevance is single-window or returns a
typed unsupported capability outcome.

Search responses expose structured completeness and freshness, including a feed
watermark such as `indexedThrough`, source head, pending age, and reasons such as
index lag, rebuild, source gap, backend unavailability, or scan budget exhaustion.
Wall-clock lag alone is insufficient.

### Rebuild, correction, and deletion

Index rebuild is blue/green:

```text
create a new generation
-> capture source watermark and deletion generation
-> rebuild from authorized safe projections
-> apply changes after the watermark
-> run integrity and conformance checks
-> atomically switch active generation
-> retain the prior generation until bounded cursors expire
```

A partially rebuilt generation is never queryable. If the previous generation
cannot be retained, affected cursors fail with `CursorExpired` and restart from a
fresh snapshot.

A logical deletion tombstone takes precedence immediately over indexes, open
cursors, cached realtime history, delayed outbox work, replay, rebuild, and raw
blob availability. Physical cleanup subsequently removes search documents,
wrapped keys, and blobs. Replayers and restore procedures compare the current
deletion epoch before admitting old data.

Product-managed backup restore remains quarantined until current tombstones,
erasure state, and key state have been reconciled. The product cannot guarantee
erasure after an operator restores an arbitrary complete old backup together with
its old keys and bypasses that process; documentation must state this boundary
honestly.

### Backpressure and degraded storage

Storage pressure preserves data in this order:

```text
control and lifecycle evidence
safe normalized activity
allowlisted searchable text
verbose protected raw payload
provisional live fragments
```

The system first drops or coalesces provisional fragments, then restricts verbose
raw capture and indexing. Deletion intents are never coalesced away. Mandatory
evidence is never silently dropped. If it cannot be committed, affected execution
is paused or enters an explicit storage-degraded recovery state through its owning
authority, and a typed diagnostic gap is retained when possible.

### Export and rendering

Default export contains authorized redacted `ActivityView` records. Full raw
export requires a distinct permission, purpose, audit record, expiry, encrypted
artifact, manifest, and checksum, with authorization repeated at creation and
download.

All runtime text is untrusted. UI adapters use a strict Markdown profile without
raw HTML, sanitize or visibly encode ANSI controls, terminal escapes, bidirectional
controls, and unsafe links, and never execute copied command or file content.

## Required conformance evidence

Before production qualification, local and server adapters cover at least:

- crash between staged blob write and database commit;
- database commit followed by unavailable or ambiguously acknowledged index;
- duplicate source identity and conflicting digest;
- missing or corrupt committed payload;
- retention racing indexing, export, and payload access;
- replay, rebuild, delayed event, and backup restore after deletion;
- authorization change between search pages;
- blue/green rebuild while ingestion continues;
- cursor expiry, generation switch, and analyzer-version change;
- disk full, quota exhaustion, index corruption, and orphan collection;
- key rotation interruption and unavailable key version;
- cross-tenant scope, object, digest, cursor, and result substitution;
- stale runtime execution output and incomplete source history;
- local/server parity for authorization, timeline, deletion, and chronological
  results without requiring equal relevance scores.

## Consequences

- Provider diagnostics remain available without making raw data public product
  state.
- Index loss degrades search rather than ingestion or timeline correctness.
- SQLite and PostgreSQL can use native strengths behind one honest capability
  contract.
- Encryption, key lifecycle, staged objects, deletion, rebuild, and backpressure
  add substantial adapter and operational complexity.
- OpenSearch, semantic or vector search, AI summarization, cold archival, and
  multi-region search are not required for the first implementation.

## Rejected alternatives

- Put database, blob, and search writes in a fictional distributed Unit of Work.
- Index complete raw provider payloads.
- Make FTS or a log engine the canonical timeline.
- Promise equal relevance ranking across SQLite and PostgreSQL.
- Trust tenant scope or authorization encoded by the client cursor.
- Deduplicate plaintext payload globally across tenants.
- Rebuild an index in place while clients query it.
- Let old indexes or backups override a committed deletion tombstone.
- Expose filesystem, S3, KMS, FTS, or OpenSearch primitives to feature use cases.
