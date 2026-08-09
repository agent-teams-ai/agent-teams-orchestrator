---
id: domain.contexts.execution-observation
type: bounded-context
status: proposed
owner: execution-observation
summary: Strategic dossier for admitted runtime evidence, protected diagnostics, normalized activity, durable feeds, and authorized search.
blocked_by:
  - OD-004
  - OD-006
  - OD-029
related:
  - ADR-0019
  - ADR-0028
  - ADR-0055
  - ADR-0058
  - ADR-0069
  - ADR-0083
  - ADR-0084
  - architecture.context-map
  - architecture.runtime-boundary
  - architecture.security
  - OD-029
  - OD-004
  - OD-006
---

# Execution Observation

## Classification and purpose

Execution Observation is a supporting bounded context. It turns authenticated AR
runtime facts into protected evidence and deterministic product activity that a
human can inspect across Claude, Codex, OpenCode, and future runtimes.

Its purpose is not to decide whether execution succeeded, complete Work, control
providers, or reproduce an observability platform. It answers narrower product
questions:

- What did an admitted runtime report?
- Which user-safe activity can be supported by that evidence?
- How complete, fresh, and trustworthy is that interpretation?
- Which protected provider diagnostics may this subject inspect or export?
- How can the user browse, subscribe to, and search the resulting history?

The strategic boundary is accepted by ADR-0083. This detailed dossier remains
proposed until event storming and executable fixtures prove the exact aggregate,
transaction, retention, and public-contract boundaries. No production package is
materialized from this dossier alone.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| Observation Evidence | An admitted, source-addressed record of what AR published, with scope, provenance, integrity, classification, and completeness metadata. |
| Evidence Envelope | The immutable minimum identity, source coordinates, scope, timestamps, versions, integrity metadata, and optional protected payload reference. |
| Protected Diagnostic Payload | Encrypted provider-native content available only through stricter disclosure and lifecycle capabilities. It is not canonical evidence. |
| Safe Preview | A bounded, redacted, render-safe subset of diagnostic content permitted in activity, feed, search, or default export. |
| Activity Projection | A rebuildable provider-neutral interpretation supported by one or more evidence records. It is not runtime truth or an Aggregate Root. |
| Activity View | The authorized public representation of one activity projection. |
| Activity Effect | A typed claim about a target with its own evidence strength, such as an attempted command or causally confirmed file modification. |
| Activity Evidence Link | A versioned many-to-many relation describing how evidence originates, progresses, terminates, supports, contradicts, or supersedes activity. |
| Semantic Registry | The versioned registry of activity kinds, detail schemas, safe fields, correlation rules, and renderer profiles. |
| Live Fragment | A provisional bounded-lifetime streaming update without a durable application cursor. |
| Durable Activity Feed | The context-owned committed activity-change stream used for replay and recovery. |
| Search Projection | A disposable, authorized, rebuildable index of allowlisted safe activity fields. |
| Index Generation | One complete immutable search projection generation selected atomically after verification. |
| Source Watermark | The source or context cursor through which projection or index input is known to be applied. |
| Diagnostic Gap | Explicit evidence that expected raw, source history, or processing continuity is unavailable. |
| Deletion Epoch | Monotonic scope-local disposition evidence preventing deleted data from returning through replay, indexing, or restore. |

Do not use `log` as a domain synonym for all of these concepts. Operational logs,
runtime output, Observation Evidence, Activity Projection, durable feed, and
search index have different authorities and guarantees.

## Ownership

### Owned here

- evidence admission, source identity, canonical digest, and conflict quarantine;
- observation classification and disclosure-safe representation;
- deterministic normalization and semantic registry;
- evidence-to-activity correlation and per-effect evidence strength;
- activity correction, retraction, invalidation, completeness, and rebuild;
- protected diagnostic payload manifests, access, export, and local lifecycle;
- durable activity feeds, snapshots, cursors, and public Activity Views;
- allowlisted search documents, query semantics, cursors, generations, and
  rebuild;
- context-local retention disposition and execution of externally decided
  project deletion.

### Owned elsewhere

| Concern | Authority | Relationship |
|---|---|---|
| Runtime session, operation, provider process, technical permission, recovery, and private fence | AR | AR publishes versioned facts; Runtime ACL translates. |
| Run and participant lifecycle, cutoff, desired state, placement, and product recovery consequence | Run Orchestration | Run publishes attribution and cutoff facts; Observation never mutates Run. |
| Work and task lifecycle | Work Coordination | Activity may reference Work but cannot complete or reassign it. |
| Tenant/project identity, admission, freeze, and disposition | Orchestration Scope | Supplies accepted scope and coordinates cross-context deletion. |
| Product authorization | Access Control | Supplies authorization decisions; disclosure policy cannot grant access. |
| Legal retention periods and legal hold | Open under OD-029 | Observation implements only accepted disposition instructions. |
| Usage quantities and money | Usage Metering and Usage Accounting | Activity is not billable usage evidence unless a separate contract admits it. |
| Platform traces, metrics, and operational logs | Platform Observability | Operational telemetry is not the product activity ledger. |
| Client realtime transport | Realtime adapter under ADR-0058 | Carries bounded changes and wake-ups; owns no durable history. |

The Runtime ACL is stateless. It cannot become a shared runtime-event database,
normalizer, search service, or authorization owner.

## Feature slices

The future context package may materialize only slices justified by an accepted
vertical slice. The intended feature ownership is:

```text
execution-observation/
  features/
    evidence-ingestion/
    activity-normalization/
    activity-feed/
    diagnostic-payload/
    observation-search/
    observation-lifecycle/
```

- `evidence-ingestion` owns authenticated admission, idempotency, conflict,
  quarantine, source checkpoints, and gap records.
- `activity-normalization` owns the semantic registry, deterministic mapping,
  correlation, effects, corrections, and projector versions.
- `activity-feed` owns committed changes, snapshots, public cursors, reset, and
  Activity View construction.
- `diagnostic-payload` owns protected content, bounded preview, encryption,
  access, export, rotation, and physical cleanup capabilities.
- `observation-search` owns the engine-neutral query, search documents, cursor,
  indexer, generation, rebuild, and capability negotiation.
- `observation-lifecycle` owns context-local retention execution, deletion
  receipts, tombstones, and anti-resurrection checks.

The slices can share context-private types through explicit public feature APIs.
They cannot reach into each other's adapters, tables, or implementation folders.

## Tactical DDD model

Full DDD does not require ceremonial aggregates for append-only evidence or
read projections.

### Domain policies and services

- `EvidenceAdmissionPolicy` validates binding, scope, source identity, supported
  schema, integrity, stale execution disposition, and replay position.
- `ObservationClassificationPolicy` classifies content and selects a redaction
  profile.
- `ObservationDisclosurePolicy` determines which classified representation may
  be considered for an already-authorized purpose. It does not authorize users.
- `SearchabilityPolicy` selects allowlisted fields and analyzer profiles.
- `ActivityNormalizationPolicy` maps evidence through the semantic registry.
- `ActivityCorrelationService` produces versioned many-to-many evidence links.
- `EffectEvidencePolicy` limits every effect claim to its available proof.
- `RetentionDispositionPolicy` maps accepted retention instructions to local
  payload, projection, search, and tombstone actions.

### Value objects

Expected value objects include `EvidenceId`, `SourceCoordinates`,
`AuthenticatedRuntimeBindingRef`, `EvidenceDigest`, `ActivityId`,
`ActivitySequence`, `ActivityRevision`, `ActivityKind`, `EffectClaim`,
`Completeness`, `ProjectionGeneration`, `SourceWatermark`, `ProtectedPayloadRef`,
`RedactionProfileVersion`, `DeletionEpoch`, and opaque authorized search cursors.

### Records and projections

`ObservationEvidence`, `ActivityProjection`, search documents, feed records,
payload manifests, and tombstones are immutable facts or projections, not
automatically Aggregate Roots. Repository terminology is reserved for a future
aggregate that owns real consistency invariants. Append/query capabilities use
ledger, store, projection, feed, or query names.

### Process managers

Feature-owned durable process managers may coordinate:

- source gap reconciliation;
- blue/green projection or index rebuild;
- payload key rotation;
- retention and physical cleanup;
- project deletion participation;
- quarantined evidence reprocessing after a registered schema upgrade.

They own timers, retries, checkpoints, leases, and reconciliation cursors. They
cannot grant access, invent activity facts, change Run state, or override a
deletion epoch.

## Evidence and activity models

### Observation Evidence minimum

```text
EvidenceEnvelope
  evidenceId
  authenticatedRuntimeBindingRef
  tenantId + projectId
  runtimeSessionRef
  public executionEpoch?       observation only
  sourceSystem
  sourceStreamId
  sourceItemId
  sourceSequence?
  sourceSchemaVersion
  occurredAt?
  observedAt
  ingestedAt
  classification
  redactionProfileVersion
  canonicalDigest
  completeness
  safePreview?
  protectedPayloadRef?
  correctionOrSupersessionRef?
```

Provider timestamps never define uniqueness, idempotency, authorization, or
cross-feed causal order.

### Activity Projection minimum

```text
ActivityProjection
  activityId
  activityRevision
  activitySequence
  projectionGeneration
  semanticRegistryVersion
  normalizerVersion
  correlatorVersion
  kind
  actor and target references
  safe summary and typed details
  effects[]
  completeness
  occurredAtRange?
  firstObservedAt
  lastObservedAt
  evidenceLinks[]
  correction and invalidation state
```

Each effect contains:

```text
effectId
kind
targetRef
claim: intended | attempted | observed | causally-confirmed | contradicted | uncertain
evidenceBasis
evidenceRefs[]
verifiedBy
```

`verifiedBy` names a registered evidence mechanism or policy version, never a
free-form assertion by an agent.

### Initial semantic categories

The first registry should support a small provider-neutral vocabulary rather
than encode every provider event as a new type:

- runtime lifecycle and readiness;
- assistant/user-visible message;
- plan or progress update;
- disclosed reasoning summary, never hidden chain-of-thought;
- tool requested, started, completed, failed, canceled, or uncertain;
- command started, output checkpoint, completed, failed, or canceled;
- file read, created, modified, deleted, moved, or effect uncertain;
- search requested and bounded result summary;
- network request and safe response summary;
- approval or runtime interaction requested and resolved;
- artifact created or updated;
- warning, diagnostic gap, and unknown provider activity.

Provider-specific details remain namespaced evidence or protected payload. Adding
a category requires typed detail schema, safe-field allowlist, renderer profile,
correlation rules, and N/N-1 fixtures.

## Commands, queries, and events

Candidate application capabilities are narrow and feature-owned:

```text
AdmitRuntimeObservation
RecordDiagnosticGap
AppendEvidenceCorrection
ReprocessQuarantinedEvidence
RebuildActivityProjection
ApplyObservationDisposition
RotateDiagnosticPayloadKeys
RebuildObservationSearch

GetActivityTimeline
GetActivitySnapshot
ResumeActivityFeed
SearchActivities
GetDiagnosticPayload
CreateDiagnosticExport
```

Candidate integration/public facts include:

```text
ObservationEvidenceAdmitted
ObservationEvidenceQuarantined
ObservationEvidenceCorrected
ActivityChanged
ActivityProjectionReset
DiagnosticPayloadUnavailable
ObservationSearchGenerationActivated
ObservationDispositionCompleted
```

Exact public command and message names require contract design. These names are
modeling candidates and do not create v1 contracts by appearing here.

## Transaction and consistency boundaries

One context database transaction may atomically persist:

```text
source receipt and checkpoint
+ evidence envelope
+ protected payload manifest reference
+ safe activity projection changes
+ durable activity feed changes
+ indexing outbox work
```

Physical blob write happens before this transaction as staged durable content.
Search indexing happens after commit through an idempotent outbox consumer.
Neither blob storage nor search backend joins the database transaction.

Projector state updates and its source checkpoint commit atomically. Rebuild uses
a new generation and deterministic replay, validates before cutover, and retains
the old generation for bounded recovery. A lease and fence prevent concurrent
writers to the same generation.

## Ordering, feed, and realtime

- Source order exists only within a source stream that promises it.
- `activitySequence` is stable UI order, not causal proof.
- Late evidence may update an existing activity at a later activity revision
  without inserting a new sequence between already-read pages.
- Committed changes use `upsert`, `retract`, `invalidate`, or `reset`.
- `LiveFragment` is provisional, expires, and has no durable application cursor.
- Gap, authorization epoch change, projection generation change, or expired
  cursor requires snapshot plus a new cursor.
- Centrifugo history can bridge a short reconnect only. The durable activity feed
  remains authoritative.

## Search and diagnostic payload invariants

- Timeline is available when search is unavailable or rebuilding.
- Search indexes only allowlisted, redacted fields.
- Raw provider payload is accessed by reference and authorized on every read.
- Query scope is derived from authenticated context.
- Cursor is encrypted, signed, expiring, and bound to query, scope,
  authorization epoch, snapshot watermark, and generation.
- Chronological search is a required baseline. Relevance, phrase, prefix,
  language stemming, and deep snapshot pagination are adapter capabilities.
- SQLite FTS5 and PostgreSQL FTS are semantically conformant for the baseline,
  not ranking-equivalent.
- Search generation rebuild is blue/green and cannot expose partial results.
- A current deletion tombstone hides data even through old search generations,
  open cursors, realtime cache, and delayed indexing work.

## Security and privacy invariants

1. Runtime payload cannot select tenant, project, user, Run, Work, or visibility.
2. Access Control authorizes the subject and purpose; Observation Disclosure
   limits content but cannot broaden that authorization.
3. Full diagnostic payload, safe activity, search, export, and telemetry are
   separate disclosure surfaces.
4. Every representation is redacted before leaving its stricter boundary.
5. Untrusted output is rendered without raw HTML or executable terminal control.
6. Hidden chain-of-thought is neither requested nor exposed.
7. Raw export has a separate permission, audit trail, expiry, encryption,
   manifest, checksum, and authorization at creation and download.
8. Cross-tenant plaintext deduplication and globally comparable content hashes
   are prohibited.
9. PostgreSQL RLS is defense in depth and never replaces application scope.
10. Unknown schemas fail closed for rendering, indexing, export, and effects.

## Failure and edge-case matrix

| Scenario | Required outcome |
|---|---|
| Exact duplicate source item | Return the retained admission outcome without another activity effect. |
| Same source identity, different digest | Quarantine as integrity conflict; do not project or index. |
| Out-of-order or late source item | Preserve source coordinates, update through a new activity revision, and never invent global causality. |
| Source cursor gap | Record explicit gap, request replay or snapshot, and reset affected projection/feed when continuity cannot be proven. |
| Unknown source schema | Retain restricted safe evidence and payload reference; do not render arbitrary fields or infer effects. |
| Stale public execution epoch | Apply the AR-published stale disposition; do not infer or expose the private fence. |
| Runtime binding mismatch | Reject or quarantine before persistence outside the evidence-conflict area. |
| Blob write succeeds, DB transaction fails | Blob remains staged and is removed by fenced orphan collection after grace and recheck. |
| DB commit succeeds, index fails | Timeline remains available; outbox retries with the same idempotency key. |
| Index acknowledgement is lost | Repeat the upsert for the same revision safely. |
| Committed blob is missing or corrupt | Return typed payload-unavailable state and preserve operational evidence. |
| Disk or quota is exhausted | Drop provisional fragments first, restrict verbose raw and indexing next, never silently lose mandatory evidence. |
| Rebuild while ingestion continues | Build a new generation from watermark, catch up, verify, then atomically switch. |
| Permission changes between pages | Reauthorize, invalidate the cursor when required, and return no now-hidden result. |
| Deletion races indexing or replay | Tombstone wins immediately; delayed work cannot resurrect content. |
| Key rotation crashes | Continue reading allowed old/new versions and resume reconciliation without plaintext fallback. |
| Retention races export | Recheck disposition and authorization before artifact creation and download. |
| Arbitrary old backup is restored | Keep deployment quarantined until current erasure ledger, deletion epochs, and key state reconcile. |
| Slow realtime client | Coalesce safe projection updates, preserve reset ability, and never drop committed deletion or invalidation. |
| Malicious Markdown, ANSI, bidi, or link | Sanitize or visibly encode it; never execute or trust it. |
| Provider claims a file edit in prose | Represent an assertion or uncertain effect, not a confirmed file modification. |
| Activity evidence later contradicts an effect | Append contradiction/correction, increment activity revision, and update feed/search without rewriting source evidence. |

## Local and server adapters

| Capability | Future fully local profile | Server profiles |
|---|---|---|
| Canonical state | Context-owned SQLite | Context-owned PostgreSQL |
| Protected payload | Encrypted local filesystem adapter | S3-compatible encrypted object adapter |
| Search | SQLite FTS5 | PostgreSQL `tsvector` and GIN |
| Realtime | Replaceable local edge when profile is implemented | Hosted Centrifugo adapter |
| Encryption keys | OS-backed or packaged local secret adapter, still open | KMS-backed adapter |

The application observes the same authorization, evidence, activity, deletion,
timeline, and chronological search outcomes. Physical locking, ranking, backup,
partitioning, and maintenance are adapter-specific.

## First usable slice

The minimum server-profile slice should include:

- AR Published Language ACL for control and output evidence;
- evidence receipt ledger, gap, conflict quarantine, and deterministic
  normalization;
- activity projection, snapshot, durable feed, and realtime changes;
- bounded safe preview and protected payload reference;
- hosted encrypted object adapter and PostgreSQL search adapter;
- chronological search, filters, authorized cursor, completeness, and freshness;
- correction, invalidation, deletion tombstone, index rebuild, and backpressure;
- crash, isolation, cursor, deletion, restore, and rebuild conformance fixtures.

It does not require OpenSearch, vector search, AI summarization, cold archive,
legal-hold policy, multi-region active-active search, cross-tenant deduplication,
or a fully local Desktop implementation.

## Acceptance evidence before materialization

1. Event-storm provider output, streaming, duplicate, gap, correction,
   cancellation, stale execution, retention, and deletion scenarios.
2. Accept the exact AR observation Published Language version used by fixtures.
3. Define the v1 Activity View, feed change, snapshot, and search query contracts.
4. Prove source identity, projection identity, effect evidence, and transaction
   boundaries with model/property tests.
5. Prove staged payload, outbox indexing, blue/green rebuild, key rotation,
   disk-full, and anti-resurrection behavior with fault injection.
6. Prove PostgreSQL tenant isolation and authorization-epoch cursor invalidation.
7. Verify renderer safety against malicious Markdown, ANSI, Unicode controls,
   links, paths, and provider JSON.
8. Add the context package and feature manifests only for the accepted first
   vertical slice; do not pre-create every feature directory.

## Open questions

- Exact legal retention and hold authority remains OD-029.
- Exact local key storage and local protected-payload backup policy remain part
  of the future Fully Local profile.
- The initial public semantic-registry categories and typed detail schemas need
  contract fixtures before package materialization.
- AR exact output-feed schemas, cursor guarantees, and capability negotiation are
  waiting on its Published Language draft.
