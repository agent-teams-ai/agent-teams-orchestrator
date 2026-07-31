---
id: research.human-notification-agent-attention-boundary-critique-2026-07-30
type: research
status: active
owner: architecture/domain
summary: Independent DDD and reliability critique of shared mechanisms and separate domain ownership for human notifications and agent attention.
related:
  - ADR-0068
  - architecture.context-map
  - architecture.implementation-readiness-gates
  - OD-026
  - OD-028
  - OD-033
---

# Human Notification and Agent Attention Boundary Critique, 2026-07-30

## Question

Should human notifications and agent attention share one bounded context because
they use similar delivery mechanisms, or remain separate because agent
orientation, context validity, and runtime timing have different semantics?

## Method

Four independent critics reviewed the current communication, context, OODA,
eventing, realtime, persistence, and Run authority documents. They evaluated
strategic DDD ownership, tactical process models, reusable technical
infrastructure, product and security behavior, and high-load failure scenarios.
No production code or runtime was exercised.

## Consensus

Human notifications and agent attention belong to one conceptual
`Attention and Notification` subdomain but require two bounded contexts:

```text
Attention and Notification subdomain
  Human Notification Management BC
  Agent Attention BC
```

They may share technical platform mechanisms. They must not share a domain model,
database transaction, repository, status enum, subscription aggregate, or
delivery pipeline.

The wider topology remains:

```text
Source bounded contexts
  -> Agent Communication for intentional conversations
  -> Human Notification Management for human attention
  -> Agent Attention for agent re-orientation need
  -> Agent Context for semantic context content and validity
  -> Run Orchestration for activation timing and execution authority
  -> AR for provider-specific materialization
```

One source integration event may be consumed independently by all three attention
or context paths. The source publishes its authoritative semantic fact. Consumer
ACLs translate that fact into local commands; the source does not import or
construct downstream notification, attention, or context models.

## Human Notification Management

This context owns human-facing attention:

- notification inbox and recipient preferences;
- presentation channels and quiet periods;
- mute, snooze, digest, dismiss, and read state;
- human acknowledgement and escalation routing;
- delivery-channel attempts and privacy-aware presentation receipts.

Candidate language:

```text
NotificationItem
NotificationPreference
DeliveryChannel
QuietPeriod
DigestWindow
Snooze
PresentationReceipt
HumanAcknowledgement
```

Human read state is optional product evidence. It is not business
acknowledgement unless the source use case explicitly requires a separate
acknowledgement command.

## Agent Attention

This context owns whether a source change justifies re-orienting a particular
agent for a purpose:

- recipient relevance and novelty;
- urgency, expiry, defer, and bounded coalescing;
- source supersession and semantic no-op suppression;
- orientation demand and acceptable disruption intent;
- feedback-loop suppression and attention budget;
- evidence that an orientation request was admitted, deferred, superseded, or
  resolved.

Candidate tactical model:

```text
AttentionCase
  agentRef
  semanticSubjectRef
  purposeRef
  sourceRevision
  policySnapshotRef
  decisionGeneration
  expiry

AttentionCase lifecycle
  OPEN -> DEFERRED | SUPERSEDED | EXPIRED | RESOLVED

OrientationDemand
  bounded process state that coalesces cases for one Run purpose
```

`AttentionCase` does not copy Jira, Notion, Work, Conversation, or A2A content.
It stores opaque source references, assessment evidence, revision, supersession,
expiry, and outcome.

Agent Attention does not compile prompts, create context manifests, wake a
runtime, fence an action, or decide that a model understood information. It emits
a typed orientation or disruption intent. Run Orchestration remains the only
owner of safe-point and activation decisions.

## Agent OODA ownership

```text
Observe
  source owners publish verified facts, revisions, coverage, and gaps

Orient
  Agent Attention assesses relevance and timing
  Agent Context composes provenance-aware semantic context

Decide
  source use case, operator, Policy, Access Control, and Run authority decide

Act
  owning use case commits product effects
  AR enforces technical runtime effects

Feedback
  new source facts re-enter admission with causation and loop suppression
```

Agent Context owns what the agent should receive:

- context lineage and bindings;
- contract snapshot and mandatory clauses;
- immutable manifest and exact contribution provenance;
- freshness, coverage, disclosure, semantic fit, and target fit;
- semantic checkpoint and rehydration;
- materialization evidence.

Run Orchestration owns `ContextActivationProcess`:

```text
REQUESTED
  -> WAITING_CONTEXT
  -> WAITING_SAFE_POINT
  -> CLAIMED
  -> MATERIALIZING
  -> APPLIED
  -> RESUMED

side outcomes
  SUPERSEDED | READ_ONLY | HELD | RECONCILING | FAILED
```

A pure Run-owned resume decision consumes immutable evidence references. It does
not synchronously query every bounded context.

## Attention versus authority

Importance and execution authority remain separate:

```text
advisory
  update a later context without waking

orientation-required
  request next checkpoint or after-operation delivery

urgent
  propose wake of an existing Run

safety or revocation fact
  source authority invalidates or fences action independently
  attention may notify but never grants or removes authority
```

Hard interruption remains outside the first slice. A high urgency value never
means kill, pause, wake, or start by itself.

When required context is stale, incomplete, forbidden, or has a source gap,
action-capable execution is held. An explicitly marked read-only orientation mode
may remain available. Blind reinjection after an unknown materialization outcome
is prohibited.

## Shared technical mechanisms

Safe reuse is limited to technical platform primitives:

- transactional inbox, outbox, and idempotency receipts;
- clocks, timers, delayed scheduling, and bounded queues;
- technical fingerprints and delivery-attempt records;
- rate-limit algorithms and per-tenant fairness;
- JetStream transport adapters and connection lifecycle;
- Centrifugo client realtime adapter;
- Connect resumable feed mechanics;
- SQL transaction and Unit of Work tooling;
- tracing, audit, redaction, retention, and deletion infrastructure;
- deterministic conformance and failure harnesses.

Each bounded context defines its own policy, semantic deduplication, retention,
reconciliation, and terminal meaning. A shared scheduler may wake technical work,
but Human Notification decides quiet-period behavior and Agent Attention decides
orientation expiry.

Do not create a new platform package until two concrete context implementations
prove the same technical API. Existing eventing, persistence, observability,
schema, and testing packages remain the first reuse points.

## Forbidden shared domain

The following abstractions would erase real domain differences:

- universal `Notification`, `Attention`, `Delivery`, `Recipient`, or `Event`
  aggregate;
- common priority, severity, status, acknowledgement, or read enum;
- one subscription aggregate for human preferences and agent source bindings;
- one `DeliveryStatus` spanning human presentation, runtime acceptance, context
  application, agent acknowledgement, and domain action;
- one pipeline for human push delivery and agent context activation;
- shared database tables, cross-context foreign keys, or cross-context
  transactions;
- shared domain package imported by both contexts;
- NATS acknowledgement interpreted as presentation, application, understanding,
  or action.

DRY applies to stable technical algorithms and test harnesses, not to unlike
business language.

## Convergence and recovery

Every source facet declares one convergence mode:

- `state-head` for current Jira fields, Notion page revision, and similar latest
  state;
- `discrete-ledger` for messages, comments, approvals, revocations, withdrawals,
  and other facts that cannot be coalesced away.

Supersession is declared by the semantic owner, not inferred from timestamps or
broker ordering. Each ordering scope uses desired, claimed, and applied
generations with compare and swap.

A context delta is only an optimization over an exact known manifest base.
Unknown or stale bases require full rehydration from semantic checkpoint, current
source facts, and mandatory instruction modules. Provider transcript, native
compaction, and model summary are never semantic truth.

Independent capacity lanes are required for:

- safety, revocation, and deletion;
- source reconciliation;
- context assembly;
- Run activation;
- ordinary human notifications.

## Mandatory first-slice fixtures

1. One source fact independently creates a human-notification command, an
   agent-attention command, and a context invalidation where applicable.
2. Human mute does not suppress agent attention or context invalidation.
3. Agent-attention suppression does not mark stale context fresh.
4. Duplicate, delayed, stale, and reordered source facts.
5. One state-head and one discrete-ledger source.
6. Source revocation immediately before an external effect.
7. Agent changes Run, Work, role, or runtime generation during routing.
8. Offline agent misses the retained feed and recovers from current source state.
9. Next-checkpoint and after-operation orientation without hard interruption.
10. Lost materialization response and reconciliation without blind reinjection.
11. Provider compaction followed by semantic rehydration.
12. Feedback loop suppression using causation and semantic no-op detection.
13. JetStream redelivery without duplicate business effect.
14. Centrifugo recovery miss followed by SQL snapshot and cursor recovery.
15. Noisy tenant cannot starve the safety lane.
16. Deletion removes protected data from feeds, outbox, projections, and restore
    paths according to the owning policy.
17. Context application never claims model understanding or domain action.

## Deferred complexity

- hard interruption;
- model-based relevance ranking;
- arbitrary attention-rule DSL;
- active-active multi-region attention authority;
- complex cross-agent escalation policies;
- global broadcast channels;
- mandatory vector database;
- complete A2A adapter;
- email, push, digest, and snooze beyond the minimal human inbox slice.

## Accepted strategic result

Create separate Human Notification Management and Agent Attention bounded
contexts under one conceptual subdomain. Keep Agent Communication, Agent Context,
Run Orchestration, and AR boundaries unchanged. Reuse platform mechanisms through
ports and conformance suites without a DDD Shared Kernel.

ADR-0068 accepts this strategic split. Exact tactical models remain open in
OD-026, OD-028, and OD-033; this report remains supporting evidence rather than
the normative decision.
