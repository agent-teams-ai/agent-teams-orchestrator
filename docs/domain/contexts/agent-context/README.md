---
id: domain.contexts.agent-context
type: bounded-context
status: accepted
owner: agent-context
summary: Scoped sandbox semantics and ownership for agent context.
related:
  - ADR-0103
  - contract.migration.desktop-first-slice.v1
  - ADR-0073
  - architecture.context-map
  - architecture.runtime-boundary
  - domain.contexts.agent-attention
  - domain.contexts.run-orchestration
  - OD-006
  - OD-029
  - OD-031
  - OD-032
  - OD-033
---

# Agent Context

## Accepted implementation scope

ADR-0103 accepts only `src/features/sandbox-manifest/` for the server sandbox
runtime migration. This status describes that bounded scope; it does not admit
other capabilities from the broader model below. Existing accepted ADR invariants
remain binding. The owning reserved package and LikeC4 identity do not change.

## Domain vision

Provide one immutable minimal context manifest without turning text into control authority.

## Scope

Owns: Exact identity/role, one Work snapshot, one managed instruction module and immutable manifest references for the admitted sandbox.

Excluded from this admission: General memory/RAG, Conversation-derived composition, workload automation, source refresh and broader continuity policy.

## Ubiquitous Language

ContextManifest is immutable bill of materials; source reference is provenance; application evidence is technical runtime observation, not proof of understanding.

## Invariants and business rules

Required facts have authorized provenance and exact version. Text cannot grant authority or complete Work. Context application is distinct from a provider-visible Task turn.

## Aggregates and consistency boundaries

| Root and identity | Protected invariants | Commands | Domain events | Transaction | Concurrency | Growth bound | External facts | Rejected boundaries |
|---|---|---|---|---|---|---|---|---|
| Immutable ContextManifest and bounded provenance references | Invariants above | Create/read the minimal sandbox manifest; receive typed application evidence | SandboxManifestCreated; ContextApplicationObserved | One owner-local Unit of Work including receipt, Operation and outbox | Immutable content/version identity and request receipt; conflicting reuse rejects; Run activation checks its exact promoted manifest. | One member/Run in this slice; history and receipts stored separately with finite declared horizons | Authorized Agent role, Work snapshot reference, managed instruction reference and typed runtime application evidence. | No provider-state mirror, cross-context aggregate or shared transaction |

Repositories persist only the owning roots/state; read queries use authorized
projections. Transport schemas and persistence records map to separate domain and
application models. IDs and ExactInstant values enter through explicit ports;
no provider/transport/database type enters business policy.

## Commands, processes and errors

Admit disclosed sources -> freeze manifest -> observe typed application outcome. Missing required evidence remains pending/failed/unknown.

Application processes persist stable child identities, checkpoints and external
intent before dispatch. Domain events above express local facts; integration
publication intent and wire events remain separate mapped surfaces. Typed errors
include forbidden scope, stale authority/ETag, conflicting request and explicit
unknown outcome. A timeout never authorizes an unkeyed effect or legacy replay.

## Concurrency and conflict model

Immutable content/version identity and request receipt; conflicting reuse rejects; Run activation checks its exact promoted manifest.

Persistence owns one context schema, local transaction and forced RLS boundary.
The server borrows its low-level pool; it never borrows another context's Unit
of Work, repository or transaction. Rehydration validates invariants and exact
values rather than trusting a transport DTO.

## Context relationships

Run owns activation and readiness; owning source contexts retain their facts; runtime owns formatting, application and technical execution.

## Security and authorization

Trusted scope and subject come from the selected authority adapter. The sandbox
authority is explicitly test-only, current grants apply on replay and reads, and
no prompt/provider payload can select trusted identity. Raw secrets and protected
payload remain in their owning adapters. This admission does not qualify a
deployment, authorize user-project testing or weaken accepted privacy rules.

## Verification scenarios

Wrong manifest, revoked Run authority, missing required MCP capability or text-only readiness evidence cannot activate a participant.

The [accepted sandbox contract](../../../contracts/desktop-runtime-migration-admission-v1.md)
links deterministic fixtures and exact Protobuf sources. Actual domain,
rehydration, concurrent PostgreSQL transaction, response-loss and restart tests
are required with implementation; their names follow the scenarios above.
Synthetic admission models do not assert adapter or provider qualification.

## Implementation links

The package remains reserved until the canonical Plan/Apply scaffolder runs.
The accepted feature's colocated documentation, public entrypoints, source
boundaries and feature allowlist are materialized in the same implementation
change. No other feature is authorized by this dossier status.

## Excluded model and unresolved questions

OD-006, OD-029, OD-031, OD-032 and OD-033 retain broader semantic admission, retention and continuity questions.

The following retained material describes broader context discovery and existing
ADR references. Proposed behavior outside the accepted feature remains excluded
and must use its owning decision process before implementation.

### Domain vision

Give each agent a purpose-relative, current, explainable semantic context without
turning one large prompt into a hidden product protocol or making provider
mechanics authoritative for business meaning.

### Scope

#### Owns

- context contribution admission, provenance, source basis, and composition;
- managed instruction precedence, conflicts, omissions, and required-content fit;
- immutable provider-neutral manifests and context contract snapshots;
- semantic validity, invalidation, successor planning, and continuity evidence;
- intake of typed AR materialization evidence.

#### Does not own

- Work, Conversation, topology, policy, access, memory, or external-source facts;
- attention priority, wake, interruption, Run activation, or runtime lifecycle;
- provider formatting, tokenization, native caching, compaction, or process state;
- connector installation, credentials, webhooks, cursors, or reconciliation;
- execution authorization, safety enforcement, budgets, or quota decisions.

### Ubiquitous Language

- `ContextLineage`: logical semantic continuity across manifests and runtime
  replacements.
- `ContextContribution`: disclosed, versioned semantic material with provenance.
- `ContextBasis`: opaque source revisions observed during one composition.
- `ContextContractSnapshot`: immutable purpose-relative content requirements.
- `ContextManifest`: immutable bill of materials for one composition.
- `ContextValidityAssessment`: current evidence about freshness, coverage,
  conflicts, revocation, and required-content fit.
- `MaterializationEvidence`: AR observation of what was technically applied,
  omitted, rejected, or left uncertain.

These terms do not imply that the model read, understood, remembered, or obeyed
content.

### Invariants and business rules

- Source contexts remain authoritative; Agent Context stores disclosed derived
  artifacts and opaque source references, not copied aggregates.
- A manifest never grants access or execution authority.
- Required content that cannot be disclosed, reconciled, or fitted fails
  explicitly rather than being silently omitted.
- Revocation distinguishes future nondisclosure from content already disclosed
  to a provider and creates explicit remediation evidence.
- Stale or superseded materialization evidence cannot validate a newer manifest
  or Run authority generation.
- A model summary cannot replace lossless control state, required instructions,
  source revisions, permission evidence, or delivery checkpoints.
- There is no claimed globally atomic snapshot or total ordering across source
  bounded contexts.

### Aggregates and consistency boundaries

The leading mutable aggregate is a small `ContextLineage` that protects successor
and continuity rules. `ContextManifest`, `ContextContribution`, and
`ContextContractSnapshot` are immutable records rather than one growing
aggregate. A durable application process coordinates assembly and invalidation.

Exact aggregate splits, concurrency keys, deletion epochs, and growth bounds
remain proposed until the Gate 2 scenario matrix is accepted.

### Domain events versus integration events

Source integration events enter through consumer-owned ACLs and become local
commands. Agent Context publishes provider-neutral facts about manifest
availability, invalidation, validity, and materialization evidence. It never
publishes raw prompts, credentials, secret-bearing source data, or provider-native
checkpoint material on ordinary event streams.

### Processes and state machines

The minimum vertical slice assembles identity/role, one Work snapshot, and one
managed instruction module into an immutable manifest, sends a typed application
request through the Runtime ACL, and records a typed outcome.

Run Orchestration owns the separate activation and uncertain-outcome process.
Agent Attention independently decides relevance and bounded disruption intent.

### Concurrency and conflict model

Assembly claims one lineage generation and records an exact source basis. Newer
invalidation cannot be cleared by completion of an older claim. Materialization
evidence is accepted only for the expected manifest, runtime generation, and
observable execution epoch. Unknown outcomes require reconciliation; blind
reinjection is forbidden.

### Context relationships

- Work Coordination, Agent Communication, Team Topology, and future semantic
  owners publish source-owned facts.
- Access Control, Policy and Risk, and Consumption Governance publish decisions
  consumed as evidence, not copied authority.
- Agent Attention publishes orientation intent without context content.
- Run Orchestration consumes readiness and materialization evidence and alone
  owns activation consequences.
- AR is reached only through consumer-owned runtime ports and the Runtime ACL.

### Persistence ownership

Agent Context owns its schema, migrations, repositories, inbox, outbox, immutable
artifact references, and Unit of Work. Large or sensitive representation content
may use a replaceable blob adapter while metadata and atomic publication remain
context-owned.

### Security and authorization

Every contribution records sensitivity and provenance. Authorization and egress
decisions are rechecked before disclosure and before action-capable activation.
Raw provider prompts and secret-bearing context are excluded from normal events,
logs, and telemetry.

### Open questions

OD-033 owns OODA convergence and Run activation. OD-029, OD-031, and OD-032 own
retention/erasure, semantic authority, and last-mile safety. Full Conversation,
memory, RAG, provider switching, and branch semantics are deferred until concrete
scenarios prove their need.

### Implementation links

The package is reserved but not materialized. Gate 2 must accept the scenario
matrix, aggregate decisions, contracts, and conformance fixtures first.
