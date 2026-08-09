---
id: ADR-0083
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: execution-observation
summary: Establish Execution Observation as the supporting context for protected runtime evidence and deterministic user-facing activity.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0019
  - ADR-0026
  - ADR-0028
  - ADR-0037
  - ADR-0055
  - ADR-0058
  - ADR-0069
  - architecture.runtime-boundary
  - architecture.security
  - domain.contexts.execution-observation
  - OD-029
---

# ADR-0083: Execution Observation Evidence and Activity Model

## Context

Users need one coherent account of what many runtime providers are doing without
losing the provider-native diagnostic material needed for investigation. AR
publishes provider-neutral runtime facts and provider output, but it does not own
team, task, Run, user disclosure, search, or product activity semantics. Run
Orchestration owns execution intent and lifecycle consequences, not a growing
diagnostic ledger or a presentation taxonomy.

Mapping provider events directly into UI rows would couple every client to AR and
provider schema changes. Treating raw output as the product history would expose
untrusted or sensitive data, make corrections and deletion unsafe, and make
search infrastructure authoritative. Using an LLM to normalize activity would
make replay nondeterministic and could turn untrusted output into invented facts.

## Decision

Create the supporting bounded context `Execution Observation`. It owns the
product meaning and lifecycle of:

- admitted `ObservationEvidence` derived from authenticated runtime facts;
- protected diagnostic payload manifests and bounded safe previews;
- deterministic correlation into user-facing `ActivityProjection` records;
- context-owned durable activity feeds and their public `ActivityView`;
- observation disclosure, redaction, searchability, and local retention
  disposition policies;
- correction, invalidation, replay, rebuild, gap, and deletion behavior for its
  own records.

It does not own:

- RuntimeSession, RuntimeOperation, provider process, technical recovery, or
  technical permission enforcement, which remain AR-owned;
- Run, participant, Work, or task lifecycle, which remain with their business
  contexts;
- product authorization, which remains Access Control-owned;
- global project disposition, which remains Orchestration Scope-owned;
- legal retention policy or legal hold, whose authority remains open under
  OD-029;
- platform traces, metrics, and logs;
- hidden model chain-of-thought.

The Runtime ACL remains stateless. It translates AR Published Language into the
consumer-owned ingestion contract and cannot persist evidence, assign product
semantics, or authorize disclosure.

### Evidence before interpretation

Every accepted source item becomes or updates a typed evidence envelope before
it can affect a durable activity projection. At minimum the envelope preserves:

```text
evidenceId
authenticatedRuntimeBindingRef
tenant and project scope
runtimeSessionRef
public executionEpoch when supplied by AR
source system, stream, item identity, and schema version
sourceSequence when supplied
occurredAt, observedAt, and ingestedAt
classification and redactionProfileVersion
safe payload summary or protectedPayloadRef
integrity and completeness metadata
```

Scope comes only from an authenticated runtime binding. Payload-supplied tenant,
project, principal, Run, Work, or agent identifiers are claims to validate or
quarantine, never authority.

Evidence identity is namespaced by the complete source coordinates. A duplicate
with the same canonical digest is idempotent. The same source identity with a
different digest is an integrity conflict and enters quarantine. A public
`executionEpoch` supports observation and diagnostics but never substitutes for
AR's private execution fence.

The minimum evidence envelope is logically immutable. Correction, contradiction,
supersession, invalidation, redacted replacement, retention deletion, and
crypto-erasure append controlled lifecycle records or remove protected payload;
they do not rewrite historical source identity silently.

### Deterministic normalization

Normalization is a pure, versioned, deterministic mapping from admitted evidence
and registered semantic rules. It cannot call a model, tool, network service,
clock, random source, or provider. Replaying the same evidence with the same
normalizer and semantic-registry versions produces the same result.

An `ActivityProjection` is a rebuildable user-facing interpretation, not an
Aggregate Root and not execution truth. One activity may cite many evidence
records, and one evidence record may support, contradict, progress, terminate,
or supersede several activities. `ActivityEvidenceLink` stores that relation and
the correlator version.

An activity effect is never stronger than its evidence. Each effect records its
own target and claim state:

```text
intended | attempted | observed | causally-confirmed | contradicted | uncertain
```

For example, command output mentioning a file path is not proof that the file was
modified. Causal confirmation requires a source capable of proving that effect.

The semantic registry is extensible and versioned. It includes safe generic
categories for lifecycle, messages, plans and summaries, tool use, command
execution, file operations, search, network operations, approvals, artifacts,
and unknown provider activity. It does not expose hidden chain-of-thought.
Provider-published reasoning may appear only as an explicitly disclosed,
redacted summary category.

Unknown or newer source schemas remain durable safe evidence with a namespaced
unknown kind and restricted payload reference. Arbitrary provider JSON is not
rendered, indexed, exported, or promoted into product semantics automatically.

### Ordering and completeness

There is no global causal ordering across runtime feeds. Evidence records retain
source sequence and all three timestamps. A context-assigned monotonic
`activitySequence` supplies stable chronological UI and pagination order only;
it must not be interpreted as source causality.

Activities declare completeness independently from lifecycle outcome:

```text
provisional | complete | interrupted | gap | unknown
```

Missing source history, stale execution output, a dropped optional raw payload,
or unavailable reconciliation is represented explicitly. It cannot be converted
into a successful or complete activity by absence of further events.

### Durable and live publication

The authoritative activity feed is committed in the same context transaction as
the safe activity projection. Realtime delivery is a replaceable wake and live
fanout mechanism under ADR-0058.

Durable activity changes support `upsert`, `retract`, `invalidate`, and `reset`,
with activity identity, revision, feed cursor, projection generation, and source
watermark. Gap, incompatible projector version, rebuild cutover, permission
change, or expired cursor causes an authoritative snapshot-plus-cursor reset.

High-frequency streaming fragments may be published as explicitly provisional
`LiveFragment` records. They have bounded lifetime, no durable application
cursor, and cannot be mistaken for committed history. Terminal or checkpoint
evidence is persisted before its durable activity change is published.

### Independent versioning

The following surfaces evolve independently and start with one public v1 only:

- AR Runtime Published Language;
- evidence envelope and protected payload format;
- semantic registry and normalizer;
- correlator and activity projector;
- public `ActivityView`;
- durable `ActivityChange` and recovery protocol.

An internal version increment does not create a public v2. Public compatibility
changes follow the single-initial-version rule in ADR-0037.

## Consequences

- Clients receive one stable, provider-neutral activity model while protected
  provider evidence remains available under stricter access.
- AR and Run Orchestration retain their existing authorities.
- Normalization, correction, disclosure, and replay become testable without an
  LLM or provider process.
- Projection and evidence lifecycle add storage, versioning, and conformance
  cost.
- Search and raw-payload physical behavior require a separate decision because
  they cannot share one database transaction.

## Rejected alternatives

- Let each client normalize provider events independently.
- Store only normalized activity and discard provider evidence.
- Use raw runtime logs as the canonical activity feed.
- Let Run Orchestration own an unbounded user-facing diagnostic ledger.
- Infer file, command, or network effects from model prose.
- Use an LLM as the authoritative normalizer.
- Publish hidden chain-of-thought as a product activity category.
