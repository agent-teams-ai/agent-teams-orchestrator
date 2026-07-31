---
id: architecture.implementation-readiness-gates
type: architecture
status: accepted
owner: architecture
summary: Mandatory evidence gates that must pass before the first production orchestration vertical slice is implemented.
related:
  - ADR-0071
  - ADR-0062
  - ADR-0063
  - ADR-0064
  - ADR-0068
  - ADR-0067
  - ADR-0066
  - ADR-0065
  - architecture.migration-boundary
  - architecture.public-control-contracts
  - architecture.runtime-boundary
  - architecture.testing
  - research.human-notification-agent-attention-boundary-critique-2026-07-30
  - research.pre-implementation-gate-critique-2026-07-30
  - OD-004
  - OD-005
  - OD-006
  - OD-010
  - OD-013
  - OD-016
  - OD-017
  - OD-018
  - OD-026
  - OD-028
  - OD-033
---

# Implementation Readiness Gates

## Purpose

The first production orchestration package or vertical slice must not be
implemented until all four gates below pass. Documentation, research, diagrams,
contract fixtures, deterministic models, and disposable spikes remain allowed.

Passing a gate does not require resolving every future feature. It requires
enough accepted ownership, invariants, contracts, transition behavior, and
failure evidence that the first implementation will not silently choose an
expensive architecture decision.

## Gate status

| Gate | Current state | Owning authorities |
|---|---|---|
| Run, Work, and topology semantics | In review | Run Orchestration, Work Coordination, Team Topology |
| Communication, Attention, and Agent Context boundary | In review | Agent Communication, Human Notification Management, Agent Attention, and the Agent Context owner selected by OD-028 |
| Public SDK and legacy compatibility boundary | In review | Feature owners, Control API, SDK, Desktop migration |
| Temporal-ready durable process boundaries | In review | Run Orchestration application and workflow scheduling adapters |

`In review` is blocking. A gate becomes `passed` only when its exit evidence is
linked from this document and the owning accepted artifacts. An unresolved
product choice may be explicitly excluded from the first slice; it cannot be
silently assigned a default.

The current independent critique and candidate evidence matrices are recorded in
the [pre-implementation gate critique](../research/pre-implementation-gate-critique-2026-07-30.md).
That report is evidence, not a substitute for the accepted artifacts required to
pass a gate.

## Gate 1: Run, Work, and topology semantics

Required evidence:

- accepted ownership of `OrchestrationRun`, immutable `RunPlanVersion`,
  `RunPlanTransitionProcess`, `ParticipantActivation`,
  `ManagedRuntimeBinding`, `WorkExecution`, `WorkPlacement`, and AR
  `RuntimeOperation`;
- transition tables for Run lifecycle, planning, activation, placement,
  cancellation, completion, successor, and reconciliation;
- concurrency and stale-generation matrix for concurrent create, replan,
  topology drift, participant replacement, late completion, and client-bound
  cancellation;
- typed policy behavior for required and optional participants, continuity,
  completion, quorum, replacement, and partial failure;
- command and event choreography proving that Work Coordination alone mutates
  Work or Task lifecycle;
- executable deterministic fixtures for duplicate, crash, timeout,
  outcome-unknown, compensation, and restart paths.

The gate does not require Temporal or a real AR provider.

## Gate 2: Communication, Attention, and Agent Context boundary

Required evidence:

- accepted strategic ownership, or explicit first-slice exclusion, for
  Conversation, recipient Delivery, Notification, Alert, Attention,
  ContextManifest, and Run-owned context activation;
- aggregate and retention boundaries for direct and group conversations,
  immutable message revisions, per-recipient delivery, subscriptions, task
  comments, and acknowledgements;
- transport-neutral separation of committed, dispatch-committed,
  mailbox-committed, runtime-accepted, context-applied, presented, read,
  acknowledged, acted, and replied evidence;
- exact boundary among source invalidation, attention intent, Run wake or safe
  point, semantic context assembly, and AR technical materialization;
- authority, privacy, deletion, revocation, feedback-loop, overload, fairness,
  gap, and replay scenarios;
- one executable source-to-orientation-to-activation fixture proving that no
  notification, comment, webhook, or model output gains business authority by
  entering context.

The gate does not require implementing every connector, A2A, full memory, or a
hosted realtime fanout deployment.

## Gate 3: Public SDK and legacy compatibility boundary

Required evidence:

- accepted first-slice public resources and capability layout for Runs,
  Operations, Work, participants, feeds, and cancellation;
- exact `CreateRun` result, durable Operation semantics, typed readiness
  snapshot/feed/wait behavior, error taxonomy, command canonicalization, scope,
  pagination, and feed recovery behavior used by the slice;
- handwritten SDK behavior specified independently from Protobuf and transport
  DTOs;
- compatibility disposition and mapping for affected legacy IPC methods,
  `TeamCreateRequest`, `TeamProvisioningProgress`,
  `TeamAgentRuntimeSnapshot`, messages, tasks, and logs;
- one behavioral fixture suite runnable through direct SDK, Connect, and every
  affected compatibility adapter;
- cutover, single-writer, unknown-outcome, rollback, and deletion criteria for
  the migrated capability.

The gate does not require publishing every language SDK or migrating the entire
legacy `TeamsAPI`.

## Gate 4: Temporal-ready durable process boundaries

Required evidence:

- an explicit list of first-slice feature-owned process managers and their
  authoritative application state;
- deterministic process inputs, stable process and command identities, timers,
  checkpoints, cancellation, retry, and reconciliation semantics;
- separation of domain state, application process state, scheduler state, and
  external side-effect dispatch;
- the same command fixtures passing through an in-process scheduler without
  Temporal imports in domain or application code;
- crash and stale-signal matrix covering failure before command acceptance,
  before and after application commit, after result loss, and during
  cancellation;
- a future Temporal mapping for workflow ID, Activities, signals, timers,
  queries, versioning, deployment routing, continue-as-new, and divergence
  reconciliation.

The gate does not require deploying Temporal in the first production slice.

## Review rule

Critics and researchers may resolve local technical questions autonomously when
their answer follows existing ownership and invariants. Product-owner attention
is required only when alternatives change:

- product-visible semantics or defaults;
- strategic bounded-context ownership;
- public compatibility commitments;
- data retention or privacy guarantees;
- automation and failure policy;
- irreversible deployment or operational commitments.

Every such fork is presented separately with concrete options, reliability and
complexity consequences, and the scope that can proceed independently.

## Implementation admission

Before production code starts:

1. each gate has a linked evidence matrix and no unacknowledged blocking fork;
2. every first-slice concept has one semantic owner and one authoritative writer;
3. accepted ADRs and current architecture agree with context dossiers and
   machine-readable relationships;
4. deterministic contract and failure fixtures are version-controlled and exist
   before adapters; a deleted or one-off spike harness is evidence only;
5. `pnpm docs:check` and `pnpm architecture:check` pass.
