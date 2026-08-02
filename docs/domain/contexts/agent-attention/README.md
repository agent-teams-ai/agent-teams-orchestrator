---
id: domain.contexts.agent-attention
type: bounded-context
status: proposed
owner: agent-attention
summary: Model boundary for agent relevance, orientation need, bounded disruption intent, and attention-loop control.
blocked_by:
  - OD-026
  - OD-033
related:
  - ADR-0068
  - architecture.context-map
  - architecture.eventing
  - domain.contexts.human-notification
  - OD-026
  - OD-028
  - OD-033
---

# Agent Attention

## Domain vision

Determine which verified source changes justify re-orienting a particular agent
for a purpose without treating every event as prompt content, waking runtimes
indiscriminately, or confusing attention with execution authority.

## Scope

### Owns

- recipient relevance, novelty, urgency, expiry, and semantic no-op suppression;
- source supersession evidence and bounded coalescing;
- purpose-specific orientation demand and disruption intent;
- attention budgets, loop suppression, and deterministic admission outcomes;
- evidence that attention was admitted, deferred, superseded, expired, or
  resolved.

### Does not own

- source facts, conversations, task comments, or human notification preferences;
- context content, provenance, freshness, manifest assembly, or compaction;
- Run activation, safe-point selection, interruption, process lifecycle, or
  technical context application;
- safety, revocation, access, or policy authority.

## Ubiquitous Language

Candidate terms are `AttentionCase`, `OrientationDemand`, `PurposeRef`,
`SemanticSubjectRef`, `SourceRevision`, `DecisionGeneration`, and
`OrientationIntent`.

These terms remain proposed until event storming proves exact boundaries. They are
not aliases for notification items, runtime messages, or context contributions.

## Invariants and business rules

- An attention decision identifies one agent, purpose, semantic subject, source
  revision, policy snapshot, and decision generation.
- Replayed, stale, superseded, or semantically unchanged source facts cannot cause
  duplicate orientation effects.
- Urgency never grants permission to start, wake, pause, interrupt, or kill a Run.
- Suppressing attention never marks context fresh and never suppresses an
  authority or revocation path.
- Feedback causation and bounded budgets prevent self-sustaining attention loops.

## Aggregates and consistency boundaries

The leading candidates are `AttentionCase` for one source-revision assessment and
`OrientationDemand` for bounded coalescing toward one agent purpose. Their exact
aggregate split, concurrency keys, and growth bounds remain open.

## Domain events versus integration events

Domain events remain private. Each source integration event enters through a
consumer-owned ACL and becomes a local application command. Published orientation
facts expose opaque references and decisions, not source content, prompt text, or
Run commands.

## Processes and state machines

A candidate lifecycle is:

```text
OPEN -> DEFERRED | SUPERSEDED | EXPIRED | RESOLVED
```

Run Orchestration independently decides whether an accepted orientation intent
becomes a next-checkpoint update, after-operation update, wake proposal, or no
runtime action.

## Context relationships

- Source bounded contexts publish verified semantic facts.
- Agent Context independently owns content validity and manifest composition.
- Run Orchestration consumes orientation intent and owns activation consequences.
- AR receives only provider-specific technical input through the Runtime ACL.
- Human Notification Management consumes source facts independently.

## Persistence ownership

The context owns its schema, migrations, repositories, inbox, outbox, projections,
and Unit of Work. Shared schedulers and broker clients cannot read its tables or
decide its business policy.

## Open questions

OD-026 and OD-033 own exact aggregates, orientation profiles, convergence,
context activation handshake, capability negotiation, and first-slice scenarios.

## Implementation links

No production package is materialized until the Full DDD evidence gate passes.
