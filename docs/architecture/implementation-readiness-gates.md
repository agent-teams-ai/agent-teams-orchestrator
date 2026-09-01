---
id: architecture.implementation-readiness-gates
type: architecture
status: accepted
owner: architecture
summary: Mandatory evidence gates that must pass before the first production orchestration vertical slice is implemented.
related:
  - ADR-0071
  - ADR-0073
  - ADR-0074
  - ADR-0080
  - ADR-0084
  - ADR-0085
  - ADR-0087
  - ADR-0088
  - ADR-0089
  - ADR-0090
  - ADR-0091
  - ADR-0092
  - ADR-0093
  - ADR-0094
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
  - OD-003
  - OD-004
  - OD-005
  - OD-006
  - OD-010
  - OD-012
  - OD-013
  - OD-016
  - OD-017
  - OD-018
  - OD-026
  - OD-033
  - OD-035
  - OD-036
  - OD-037
  - OD-038
  - OD-039
  - OD-040
---

# Implementation Readiness Gates

## Purpose

The first production orchestration package or vertical slice must not be
implemented until all five gates below pass. Documentation, research, diagrams,
contract fixtures, deterministic models, and disposable spikes remain allowed.

These gates admit the first V1 orchestration slice and profile advertising. A
future Fully Local implementation increment follows its separate OD-040
materialization decision after the relevant lifecycle and workflow boundaries
are accepted. Package materialization may then start before Fully Local release
qualification, because the implementation is required to produce that evidence;
it still grants no availability or shipping claim.

Passing a gate does not require resolving every future feature. It requires
enough accepted ownership, invariants, contracts, transition behavior, and
failure evidence that the first implementation will not silently choose an
expensive architecture decision.

## Gate status

| Gate | Current state | Owning authorities |
|---|---|---|
| Run, Work, and topology semantics | In review | Run Orchestration, Work Coordination, Team Topology |
| Communication, Attention, and Agent Context boundary | In review | Agent Communication, Human Notification Management, Agent Attention, Agent Context, and Run Orchestration |
| Public SDK and Desktop compatibility boundary | In review | Feature owners, Control API, SDK, Desktop integration |
| Temporal-ready durable process boundaries | In review | Run Orchestration application and workflow scheduling adapters |
| Deployment authority, target fencing, and runtime connectivity | In review | Access Control, composition, clients, runtime gateway |

`In review` is blocking. A gate becomes `passed` only when its exit evidence is
linked from this document and the owning accepted artifacts. An unresolved
product choice may be explicitly excluded from the first slice; it cannot be
silently assigned a default.

The current independent critique and candidate evidence matrices are recorded in
the [pre-implementation gate critique](../research/pre-implementation-gate-critique-2026-07-30.md).
That report is evidence, not a substitute for the accepted artifacts required to
pass a gate.

ADR-0080 separately gates deployment qualification: Managed Shared SaaS cannot
be declared qualified until Project retirement, owner-local disposition,
cross-tenant isolation, and anti-resurrection conformance pass. That deployment
gate does not require every first vertical slice to implement offboarding, but
no slice may contradict the accepted ownership, epoch, freeze, or receipt model.

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

The repository now has partial executable evidence for the exact
[ADR-0079 Run authority state-machine slice](../../architecture/executable-specs/run-authority-state.json)
and [ADR-0080 Project identity lifecycle](../../architecture/executable-specs/orchestration-project-lifecycle.json).
These fixtures prove suspension-before-successor, monotonic generation, explicit
cancellation, stale-generation rejection, terminal retirement, and opaque late
runtime evidence without authority mutation. They do not cover the other required
Run, Work, topology, fan-out, policy, or recovery evidence above, so Gate 1 remains
`In review`.

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

The gate does not require implementing external vendor connectors, A2A, full
memory, RAG, Conversation-derived context, or a hosted realtime fanout deployment.
ADR-0074 excludes vendor connector management from v1; the minimum Agent Context
slice is identity/role, one Work snapshot, one managed instruction module, one
immutable manifest, and one typed AR application outcome.

## Gate 3: Public SDK and Desktop compatibility boundary

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
- accepted Execution Observation ownership plus v1 evidence, Activity View,
  protected diagnostic payload, feed, cursor, search, deletion, and recovery
  fixtures for every runtime-output surface used by the slice;
- versioned search-snapshot, query-time authorization, freeze-versus-admission,
  reference-projection replay, resource-limit, and committed-only realtime
  fixtures required by ADR-0089;
- disclosure-interval, protected-payload disposition, index commit-position,
  monotonic Run-attribution, gap reconciliation, cross-partition correction, and
  disclosure-safe feed/realtime replay fixtures required by ADR-0092 and
  ADR-0094;
- one behavioral fixture suite runnable through direct SDK, Connect, and every
  affected compatibility adapter;
- activation, single-writer, unknown-outcome, rollback-before-admission, and
  deletion criteria for the affected Desktop adapter. Once the new orchestrator
  accepts a mutation, that mutation is never retried through the old
  orchestrator.

The gate does not require publishing every language SDK or preserving the
current `TeamsAPI` as a public legacy contract.

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

The gate does not require deploying Temporal in every profile or implementing a
Fully Local workflow engine in the first production slice. ADR-0087 defers Fully
Local implementation from V1, while OD-035 keeps the local engine decision
explicit for the future profile.

## Gate 5: Deployment authority, target fencing, and runtime connectivity

Required evidence:

- machine-readable Managed SaaS, Standalone Self-Hosted, Connected Self-Hosted,
  and Fully Local profile states agree with ADR-0087 and ADR-0090;
- the OD-039 qualification framework has a blocking trusted-attestation verifier
  before any profile or capability becomes `qualified`;
- profile qualification is closed over the exact mandatory capability registry
  and evidence bound to subject, adapters, source revision, suites, environment,
  result, and trusted issuer; emptying blockers or adding a file never qualifies
  a subject;
- composition activates exactly the product-authority adapter and independent
  commercial-authority mode declared by the selected profile;
- OD-012 is resolved far enough to prove the selected profile's authentication,
  tenant isolation, service identity, revocation, browser, and feed authority;
- OD-003 is resolved far enough to name the selected profile's persistence
  composition, because the reliability catalog blocks both V1 profiles on
  OD-003 and OD-012;
- every client resource, request, subscription, cursor, cache, optimistic update,
  and Operation handle is fenced by Target identity and client generation;
- profile switching closes the old generation and proves that late results
  cannot update the new view or retry against a different Host;
- when the selected profile advertises `local-device-execution`, that separately
  gated capability passes OD-038 enrollment, outbound channel, revocation,
  reconnect, stale-custody, and Desktop-exit conformance;
- the Host issues scoped short-lived realtime subscription authority before the
  client connects to the edge;
- Standalone Self-Hosted passes an offline fixture with no managed endpoint or
  private registry dependency;
- commercial capability checks, when present, use Host-custodied evidence and
  cannot block cancellation, containment, recovery, deletion, or baseline access
  and export of customer-owned data;
- deferred Fully Local packages retain the exact OD-021, OD-035, and OD-040 gate
  set and are rejected by scaffolding and topology checks until OD-040 names the
  accepted materialization decision.

This gate does not require implementing Fully Local or a commercial capability,
and optional commercial capability does not block a baseline profile.
It does require that a server profile advertise only capabilities whose
authority and connectivity are qualified.

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
