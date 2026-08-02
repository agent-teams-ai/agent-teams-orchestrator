---
id: domain.contexts.agent-context
type: bounded-context
status: proposed
owner: agent-context
summary: Model boundary for provenance-aware semantic context composition, validity, and continuity evidence.
blocked_by:
  - OD-006
  - OD-029
  - OD-031
  - OD-032
  - OD-033
related:
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

## Domain vision

Give each agent a purpose-relative, current, explainable semantic context without
turning one large prompt into a hidden product protocol or making provider
mechanics authoritative for business meaning.

## Scope

### Owns

- context contribution admission, provenance, source basis, and composition;
- managed instruction precedence, conflicts, omissions, and required-content fit;
- immutable provider-neutral manifests and context contract snapshots;
- semantic validity, invalidation, successor planning, and continuity evidence;
- intake of typed AR materialization evidence.

### Does not own

- Work, Conversation, topology, policy, access, memory, or external-source facts;
- attention priority, wake, interruption, Run activation, or runtime lifecycle;
- provider formatting, tokenization, native caching, compaction, or process state;
- connector installation, credentials, webhooks, cursors, or reconciliation;
- execution authorization, safety enforcement, budgets, or quota decisions.

## Ubiquitous Language

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

## Invariants and business rules

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

## Aggregates and consistency boundaries

The leading mutable aggregate is a small `ContextLineage` that protects successor
and continuity rules. `ContextManifest`, `ContextContribution`, and
`ContextContractSnapshot` are immutable records rather than one growing
aggregate. A durable application process coordinates assembly and invalidation.

Exact aggregate splits, concurrency keys, deletion epochs, and growth bounds
remain proposed until the Gate 2 scenario matrix is accepted.

## Domain events versus integration events

Source integration events enter through consumer-owned ACLs and become local
commands. Agent Context publishes provider-neutral facts about manifest
availability, invalidation, validity, and materialization evidence. It never
publishes raw prompts, credentials, secret-bearing source data, or provider-native
checkpoint material on ordinary event streams.

## Processes and state machines

The minimum vertical slice assembles identity/role, one Work snapshot, and one
managed instruction module into an immutable manifest, sends a typed application
request through the Runtime ACL, and records a typed outcome.

Run Orchestration owns the separate activation and uncertain-outcome process.
Agent Attention independently decides relevance and bounded disruption intent.

## Concurrency and conflict model

Assembly claims one lineage generation and records an exact source basis. Newer
invalidation cannot be cleared by completion of an older claim. Materialization
evidence is accepted only for the expected manifest, runtime generation, and
observable execution epoch. Unknown outcomes require reconciliation; blind
reinjection is forbidden.

## Context relationships

- Work Coordination, Agent Communication, Team Topology, and future semantic
  owners publish source-owned facts.
- Access Control, Policy and Risk, and Consumption Governance publish decisions
  consumed as evidence, not copied authority.
- Agent Attention publishes orientation intent without context content.
- Run Orchestration consumes readiness and materialization evidence and alone
  owns activation consequences.
- AR is reached only through consumer-owned runtime ports and the Runtime ACL.

## Persistence ownership

Agent Context owns its schema, migrations, repositories, inbox, outbox, immutable
artifact references, and Unit of Work. Large or sensitive representation content
may use a replaceable blob adapter while metadata and atomic publication remain
context-owned.

## Security and authorization

Every contribution records sensitivity and provenance. Authorization and egress
decisions are rechecked before disclosure and before action-capable activation.
Raw provider prompts and secret-bearing context are excluded from normal events,
logs, and telemetry.

## Open questions

OD-033 owns OODA convergence and Run activation. OD-029, OD-031, and OD-032 own
retention/erasure, semantic authority, and last-mile safety. Full Conversation,
memory, RAG, provider switching, and branch semantics are deferred until concrete
scenarios prove their need.

## Implementation links

The package is reserved but not materialized. Gate 2 must accept the scenario
matrix, aggregate decisions, contracts, and conformance fixtures first.
