---
id: research.pre-implementation-gate-critique-2026-07-30
type: research
status: active
owner: architecture
summary: Independent critique of the four mandatory readiness gates and the expensive decisions that must remain explicit before production implementation.
related:
  - ADR-0067
  - ADR-0066
  - ADR-0065
  - architecture.implementation-readiness-gates
  - architecture.migration-boundary
  - architecture.public-control-contracts
  - OD-005
  - OD-006
  - OD-010
  - OD-013
  - OD-016
  - OD-019
  - OD-026
  - OD-028
  - OD-033
---

# Pre-implementation Gate Critique, 2026-07-30

## Question

Which decisions can be completed autonomously before implementation, which
evidence is still missing, and which small set of choices genuinely requires
product-owner attention because changing it later would alter product semantics
or strategic boundaries?

## Method

Independent critics reviewed the accepted architecture, open decisions, context
dossiers, SDK and migration contracts, legacy Electron evidence, and future
Temporal boundary. The review was read-only apart from documentation corrections
in this repository. It did not launch agents, providers, or runtime commands.

The critics were asked to preserve Clean Architecture, Hexagonal Architecture,
Full DDD, SOLID, and DRY without introducing generic frameworks before a concrete
domain invariant justified them.

## Consensus

The foundation is internally coherent, but all four readiness gates correctly
remain blocking. The dominant risks are no longer the selected technologies.
They are:

1. leaving tactical consistency boundaries implicit;
2. treating an atomic database pointer change as atomic transfer of external
   execution authority;
3. hiding product semantics in SDK defaults;
4. allowing process managers, resume logic, or Operations routing to become
   cross-context god-components;
5. declaring migration parity without executable fixtures in both repositories.

The first production slice can remain small. The architecture evidence required
before it starts cannot be skipped.

Existing spike reports demonstrate feasibility, but their disposable harnesses
do not satisfy a gate. Every gate needs a version-controlled executable fixture
suite that remains runnable as the implementation evolves.

## Gate 1 evidence: Run, Work, and topology

### Leading tactical model

| Model | Leading tactical role | Transaction authority |
|---|---|---|
| `OrchestrationRun` | Small aggregate root | Run lifecycle, promoted plan reference, authority generation, closure intent, terminal business outcome |
| `RunPlanVersion` | Immutable domain artifact | Created once after validation; never promoted by mutating the artifact |
| `RunPlanTransitionProcess` | Feature-owned application process state | Own transition state and dispatch intent; request a separate revision-checked Run promotion |
| `RunParticipant` | Run-scoped aggregate candidate | Stable concrete occupant identity; no unbounded activation or runtime history collection |
| `ParticipantActivationProcess` | Feature-owned application process state | Reconcile readiness evidence for one participant and plan generation |
| `ManagedRuntimeBinding` | Opaque application integration record | Refer to AR capability identity without importing AR domain state |
| `WorkExecution` | Work Coordination aggregate | Business execution lifecycle and Work revision |
| `WorkPlacementProcess` | Run-owned application process state | Claim, select, dispatch, reconcile, and admit one placement generation |
| `RuntimeOperation` | AR aggregate | Provider-visible technical work only |

The exact repository and containment decision for `RunParticipant`,
`ParticipantActivationProcess`, and `ManagedRuntimeBinding` still needs a
transaction and cardinality matrix. It must not be inferred from table layout.

### Required corrections

- Successor preparation and cutover mode are independent axes. A successor is
  always staged. The first implementation uses a quiesced cutover barrier;
  additive and rolling cutovers remain later capabilities.
- Only one transition may enter side-effecting cutover for a Run generation.
  Competing proposals may validate in parallel but must claim the transition by
  compare and swap before external effects.
- Plan promotion is irreversible. A correction creates a successor plan rather
  than rolling an aggregate pointer backward.
- `RunParticipant`, stable responsibility slot, activation generation, runtime
  binding, and AR operation are distinct identities.
- Topology is pinned by plan version. Topology drift proposes an explicit replan;
  it never mutates an active Run implicitly. Immediate security revocation remains
  authoritative regardless of plan pinning.
- One `WorkExecution` has at most one current placement in the initial model.
  Replacement creates a successor placement. Provider retries remain inside AR.
- Work Coordination is the only authority that commits Work completion or
  cancellation. Provider timestamps and event arrival order never decide a race.
- A process manager commits its own state and dispatch intent before invoking a
  revision-checked aggregate command. Cross-aggregate and cross-context database
  transactions are forbidden.

### Mandatory fixtures

- competing initial plan promotions and competing replans;
- crash before and after Run promotion commit;
- uncertain quiesce and stale old-runtime dispatch;
- topology drift before and after cutover;
- required and optional participant activation failure;
- placement replacement and late predecessor output;
- completion and cancellation in both commit orders;
- duplicate and conflicting closure commands;
- business closure with residual technical cleanup;
- terminal immutability and explicit successor Run;
- large participant cardinality without loading collections into Run.

## Gate 2 evidence: Communication, Attention, and Context

### Leading strategic split

```text
Agent Communication
  conversations, audience, product mailbox, acknowledgements

Human Notification Management
  human inbox, presentation preferences, mute, snooze, digest,
  acknowledgement and escalation

Agent Attention
  agent relevance, novelty, coalescing, expiry,
  orientation need and bounded disruption intent

Agent Context
  provenance-aware composition, manifests, validity, lineage,
  semantic checkpoints, materialization evidence

Run Orchestration
  wake, safe-point, action authority, activation, resume decision

Agent Runtime
  provider compilation, technical materialization, runtime input
```

Alert facts and severity remain with their semantic source owner. Task comments
remain Work Coordination facts. A generic Delivery bounded context is not
justified; delivery records remain feature-owned while sharing only technical
outbox, inbox, idempotency, transport, and serialization primitives.

### Required corrections

- Direct conversations, bounded groups, and channels share one Conversation
  model with different membership and history policies. A one-shot multicast is
  not silently converted into shared conversation history.
- Delivery is vector evidence, not one status. Committed, dispatch-committed,
  mailbox-committed, runtime-accepted, context-applied, presented, read,
  acknowledged, acted, and replied are different facts.
- A task comment remains one Work-owned source fact. Independent consumer ACLs may
  map it to human-notification, agent-attention, and context-refresh commands. It
  never creates a Conversation message implicitly.
- A `ResumeGate` is a pure Run-owned decision over immutable evidence references.
  It does not synchronously query every bounded context, own authorization, or
  materialize provider context.
- Context convergence is declared per source facet as state-head or
  discrete-ledger. Comments, messages, approvals, revocations, and withdrawals
  cannot be coalesced as state heads.
- Source owners issue coverage evidence. A list of observed records does not prove
  complete coverage.
- Required context that is stale, forbidden, incomplete, or indeterminate cannot
  authorize an external side effect. Preconditions are checked again immediately
  before the owning use case commits an effect.
- Model summaries and provider-native compaction never become semantic truth.
  Rehydration combines a verified semantic checkpoint with current source facts.
- Safety, revocation, context assembly, and ordinary source processing need
  independent capacity lanes so noisy tenants cannot starve authority changes.

### Mandatory fixtures

- direct, group, one-shot multicast, join, leave, and history visibility;
- duplicate, edited, revoked, expired, reordered, and unauthorized messages;
- one task-comment fact independently consumed by notification, attention, and
  context processing without Conversation duplication;
- suppression of attention while source invalidation remains active;
- source gap, stale cursor, source reincarnation, and authorization revision;
- invalidation storm with bounded coalescing and tenant fairness;
- required context unavailable and explicitly read-only orientation;
- materialization result lost, reconciled, and never blindly reinjected;
- provider compaction, restart, replacement, and semantic rehydration;
- authority revoked immediately before an external side effect.

## Gate 3 evidence: SDK and migration

### Leading public surface

```text
OrchestratorClient
  project(scope)
    runs.create|get|list|cancel|subscribe
    runs.participants.get|list
    workExecutions.create|get|list|cancel|subscribe
    operations.get|subscribe
```

`Run`, public `Operation`, and `WorkExecution` are independent resources.
Participants are run-scoped read-only resources. Internal plan transitions,
activation processes, runtime bindings, placements, and AR operations are not
public SDK resources.

The SDK remains handwritten. Protobuf, Buf, and Connect define the cross-process
control boundary; generated types remain behind the SDK backend. JSON Schema
independently defines integration-event envelopes. Feature-specific feeds are
preferred to one generic event client.

### Required corrections

- `CreateRun` has one fixed durable creation result. Readiness snapshot, feed, and
  typed SDK waits remain independent observer capabilities under ADR-0067.
- `AbortSignal` cancels local waiting only. Product cancellation uses
  feature-specific commands such as `runs.cancel` or
  `workExecutions.cancel`.
- The stable public error envelope contains a code, category, recommended action,
  correlation reference, optional retry or operation reference, and typed safe
  details. Clients never parse human text.
- Page tokens bind scope, principal, filters, and sort. Pagination is part of v1
  response shapes.
- An Operations facade is a composition-owned static router to feature owners. It
  has no central business repository, transaction, or service-locator behavior.
- Canonical compatibility fixtures must be versioned and executable in both this
  repository and the Electron repository.

### Migration cutover

Migration proceeds by capability cohort rather than arbitrary IPC method:

```text
freeze legacy fixtures
  -> read-only projections
  -> provisioning reliability cohort
  -> runtime observation and control
  -> Conversation
  -> Work
  -> logs and diagnostics
  -> destructive and configuration capabilities
```

For each scope, route ownership moves through:

```text
LEGACY -> FREEZING -> reconcile -> snapshot plus watermark
       -> route-generation compare and swap -> NEW
```

Writer ownership is selected and persisted before a command starts. Unknown
outcomes are never repeated through a different owner. Shadow traffic is allowed
for reads, not mutations. Rollback changes only new command routing; accepted
legacy commands remain with their original owner until reconciled.

The legacy `TeamsAPI` is broad and has unequal IPC and hosted implementations.
Transport presence is not evidence of behavioral parity. Unsupported hosted
capabilities need an explicit capability matrix rather than optimistic stubs.

### Mandatory fixtures

- idempotent create with response loss and client restart;
- fixed CreateRun outcome plus readiness snapshot/feed/wait convergence;
- local wait cancellation versus product cancellation;
- pagination token scope and expiry;
- cursor handoff from snapshot to live feed without a gap;
- binary Protobuf and ProtoJSON presence and exact-integer behavior;
- previous SDK against an additive new server;
- direct, Connect, IPC, and HTTP compatibility adapters;
- migration crash at every cutover state and proof of no dual writer;
- legacy progress, snapshot, message, task, and log projections.

## Gate 4 evidence: Temporal-ready process boundaries

The first slice requires explicit feature-owned process states:

| Process | Authoritative application state |
|---|---|
| `RunPlanTransitionProcess` | staging, validation, cutover claim, promotion observation |
| `ParticipantActivationProcess` | requirement evidence and participant readiness |
| `WorkPlacementProcess` | claim, placement, AR request, reconciliation, result admission |
| `RunClosureProcess` | authority fencing, product cancellation, cleanup, finalization |

`ContextActivationProcess` is designed with Gate 2 and may be implemented in a
later slice. Attached CLI support adds a sponsorship process, but frequent
heartbeats are not workflow signals.

### Scheduler boundary

```text
application database
  business state and authoritative process state

inbox, outbox, and command receipts
  accepted effects and delivery evidence

in-process or Temporal scheduler
  wake-up and durable scheduling progress only

AR
  runtime execution facts and technical recovery
```

There is no universal `RunWorkflow`, base saga, business step DSL, or generic
retry framework. Shared workflow code is limited to technical clock, scheduling,
inbox/outbox, dispatch records, idempotency helpers, and deterministic fixtures.

Each scheduler activity invokes one narrow idempotent application command with a
stable semantic command ID. Product commands commit through application APIs
before an outbox notification wakes the scheduler. Product queries read
application persistence. Timers also have an application `nextWakeAt`.
`OUTCOME_UNKNOWN` enters reconciliation rather than dispatching a new effect.

An in-process scheduler and Temporal cannot be active for the same process
generation without an explicit scheduler-ownership fence. Temporal becomes a
replaceable scheduling adapter, not an alternate source of business truth.

The first later Temporal migration candidate is `WorkPlacementProcess`, followed
by `RunPlanTransitionProcess`. This sequence tests cancellation, stale
generation, cross-context commands, AR ambiguity, and reconciliation without
creating one workflow for the entire Run.

### Mandatory fixtures

- scheduler failure before application commit;
- application commit followed by lost scheduler response;
- duplicate, stale, and reordered wake notifications;
- timeout overlapping a retry with the same command identity;
- cancellation during dispatch and outcome-unknown reconciliation;
- missing scheduler for an active process and stale scheduler for a terminal one;
- application restore or deployment epoch invalidating old scheduler authority;
- Temporal outage while application process state remains recoverable;
- representative workflow replay and continue-as-new state bounds.

## Autonomous decisions

The following changes follow existing accepted ownership and can proceed without
product-owner intervention:

- tactical aggregate and process-state matrices;
- prohibition of cross-aggregate and cross-context transactions;
- quiesced first-version cutover with staged successor planning;
- one current placement per `WorkExecution`, with successor placement on
  replacement;
- feature-specific process managers and no universal workflow framework;
- pure evidence-based Run resume decision;
- feature-specific cancellation APIs and feeds;
- run-scoped read-only public participants;
- composition-only Operations routing;
- cross-repository compatibility fixture distribution;
- capability-based hosted migration instead of claiming complete API parity;
- first valid business outcome may close a Run while bounded technical cleanup
  continues in a separately observable process;
- unavailable required context blocks action while an explicitly non-actioning
  orientation mode may remain available;
- hard interruption is excluded from v1; delivery supports next checkpoint and
  after-operation boundaries first;
- active legacy operations finish under their selected legacy owner and are not
  adopted live by the new Orchestrator;
- correction of stale documentation and machine-readable ownership references.

These are leading findings until the owning accepted artifacts are updated. This
research report is not itself a normative decision.

## Product-owner decision set

Only choices that alter strategic boundaries or visible product policy should be
escalated:

1. accept the exact strategic split and shared technical boundary among Agent
   Communication, human notifications, agent attention, and Agent Context.

Dynamic group-history policy and hard interruption remain explicitly outside the
first production slice. They must not receive accidental defaults in
implementation.

## Cross-cutting reliability matrix

Every gate fixture suite also covers:

- duplicate, stale, and reordered commands, events, and scheduler notifications;
- state, command receipt, and outbox atomicity with a crash at each boundary;
- lost commit acknowledgement and PostgreSQL failover;
- JetStream redelivery with acknowledgement only after durable application
  commit;
- `OUTCOME_UNKNOWN`, reconciliation, and prohibition of a second effect;
- authority revocation, deletion epoch, or safety-feed gap immediately before
  dispatch;
- disk full and overload behavior that fails closed without losing an already
  accepted command;
- bounded queues, per-tenant fairness, and an independent safety lane;
- erasure that cannot be undone through backup restore, replay, outbox
  redelivery, or projection rebuild;
- capability cutover crash and rollback without two writers;
- tenant isolation and a noisy tenant that cannot starve safety work.

Multi-region active-active authority, exact retention durations, production SLO
numbers, and automatic regional failover remain deferred until deployment
evidence justifies their complexity. The first hosted design must preserve
portable identities and fencing without pretending that these operational
policies are already selected.

## Limitations

- This report is architecture critique, not executable proof.
- Tactical role recommendations still require the matrices and fixtures listed by
  each gate.
- Exact AR Published Language names remain owned by the AR repository.
- Region topology, retention periods, SLO values, and production quotas require
  deployment evidence and are not inferred from the modular-monolith design.
