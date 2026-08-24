---
id: ADR-0089
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: execution-observation
summary: Add mandatory snapshot, authorization, deletion, ordering, and realtime safety constraints to Execution Observation.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0019
  - ADR-0058
  - ADR-0084
  - ADR-0085
  - architecture.persistence
  - architecture.runtime-boundary
  - architecture.security
  - domain.contexts.execution-observation
---

# ADR-0089: Observation Protocol Safety Constraints

## Context

ADR-0084 and ADR-0085 establish the correct ownership and storage boundaries,
but an independent pre-implementation critique found several protocol details
that must be closed before code is admitted. A mutable latest-only search
document cannot honor a snapshot cursor. Uncommitted live fragments can bypass
the durable realtime rule. Blob staging can race project deletion. Search that
filters after ranking can leak unauthorized matches through result order.

Execution Observation also consumes authoritative scope and Run facts in
addition to AR evidence. Rebuild must not query another context's current state
or confuse those facts with runtime evidence.

## Decision

### Context-local reference inputs

Orchestration Scope and Run Orchestration facts enter through separate
idempotent inbox consumers. Execution Observation stores context-local reference
projections with source event identity, source revision, checkpoint, schema
version, and deletion epoch. Normalization and rebuild read those projections,
never another context's tables or current query API.

### Ordering scope

The durable activity feed is partitioned by tenant, Project, and Run. Activity
sequence is monotonic only inside that partition. A dedicated Project-system
partition carries admitted evidence that has no Run. Cross-partition search uses
an explicit stable time-and-identity tuple and never claims global causal order.

### Durable publication only in V1

V1 exposes user-visible activity only from committed evidence, safe projection,
feed record, and publication intent. Streaming may be micro-batched, but no
uncommitted `LiveFragment` is sent to a public realtime edge. A future ephemeral
protocol requires its own accepted decision covering admission, redaction,
deletion epoch, bounded loss, resynchronization, and abuse limits.

### Search snapshots and authorization

Search documents are revisioned with validity positions. Revisions needed by an
unexpired cursor remain queryable until that cursor horizon ends. A snapshot
cursor names the index generation and source watermark; if the adapter cannot
retain that view, it returns `CursorExpired` rather than silently changing
semantics.

The authorization and deletion predicates execute inside the search query
before matching, ranking, count, pagination, and cursor advancement. Post-filter
authorization is prohibited. Every page still revalidates the current authority
epoch and fails closed when visibility cannot be proven.

### Admission versus deletion

The database admission transaction compares the current local freeze revision,
deletion epoch, runtime binding revision, and scope state with the values captured
before blob staging. A mismatch commits no evidence, activity, feed, manifest, or
indexing intent. The staged object remains unreachable and is collected only
after a fenced grace and recheck.

Logical deletion remains authoritative over delayed ingestion, replay, index,
cache, and restore work. Conformance includes both deletion-before-admission and
deletion-between-stage-and-commit races.

### Digests and resource limits

Source conflict comparison uses a tenant-scoped keyed digest with a recorded key
version. Payload integrity uses a separate protected integrity digest. Neither
value becomes a cross-tenant object identity or a public secret oracle.

Ingress declares bounded item size, chunk count, expansion ratio, nesting,
object count, and per-partition rate. Compression bombs, unbounded streams, and
oversized unknown schemas are rejected or quarantined before allocation can
exhaust the Host. Mandatory evidence records a typed rejected or incomplete
outcome rather than silently disappearing.

## Consequences

- SQLite and PostgreSQL adapters must retain versioned search documents for the
  supported cursor horizon or advertise no snapshot pagination capability.
- V1 realtime remains slightly less immediate but has one durable and secure
  publication path.
- Scope and Run reference projections add inbox and checkpoint state while
  making replay deterministic and context boundaries explicit.
- Deletion, authorization, and resource-exhaustion races become executable
  conformance cases before adapters are accepted.

## Rejected Alternatives

- Claim snapshot pagination over latest-only mutable search documents.
- Publish raw provider fragments before durable evidence admission.
- Filter unauthorized search matches after ranking or pagination.
- Query current state from Scope or Run Orchestration during rebuild.
- Use one unkeyed digest for conflict comparison, integrity, and object identity.
