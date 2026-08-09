---
id: architecture.runtime-boundary
type: architecture
status: accepted
owner: integration/runtime
summary: Ownership and contract boundary between product orchestration and the ar runtime.
related:
  - ADR-0003
  - ADR-0026
  - ADR-0028
  - ADR-0060
  - ADR-0062
  - ADR-0065
  - ADR-0069
  - ADR-0070
  - ADR-0079
  - ADR-0080
  - ADR-0083
  - ADR-0084
  - architecture.local-host-lifecycle
  - OD-004
---

# Runtime Boundary

## Principle

The orchestrator is the control plane. `ar` is the execution and safety runtime.
Provider implementations belong behind `ar`.

The canonical implementation repository is
[`agent-teams-ai/agent-runtime`](https://github.com/agent-teams-ai/agent-runtime). Repository
location is informational; the versioned Runtime Published Language remains the
only integration authority.

```mermaid
flowchart LR
    Scope["Orchestration Scope Application"]
    Run["Run Orchestration Application"]
    Observation["Execution Observation Application"]
    ScopePorts["Scope Admission and Disposition Ports"]
    RunPorts["Target, Session, and Operation Ports"]
    OutACL["Runtime Command ACL (Outbound Adapter)"]
    InACL["Runtime Event ACL (Inbound Adapter)"]
    ScopeIn["Scope Observation Ingestion"]
    RunIn["Target Observation Ingestion"]
    EvidenceIn["Observation Evidence Ingestion"]
    AR["ar Runtime"]
    Driver["Provider Driver"]
    Provider["Claude / Codex / OpenCode"]

    Scope --> ScopePorts
    Run --> RunPorts
    OutACL -. "implements" .-> ScopePorts
    OutACL -. "implements" .-> RunPorts
    OutACL --> AR
    AR --> InACL
    InACL --> ScopeIn --> Scope
    InACL --> RunIn --> Run
    InACL --> EvidenceIn --> Observation
    AR --> Driver
    Driver --> Provider
```

## Authority matrix

| Responsibility | Owner |
|---|---|
| Team, task, and message intent | Orchestrator |
| Team messages, product inboxes, and coordination delivery | Agent Communication |
| Runtime input and provider output | `ar` |
| Admitted product evidence, protected diagnostics, normalized user-facing activity, activity feeds, and observation search | Execution Observation |
| Assignment and completion policy | Orchestrator |
| Orchestration tenant and Project identity, coarse admission, runtime-scope bindings, and whole-Project disposition coordination | Orchestration Scope |
| Desired runtime state | Orchestrator |
| Provider capability selection policy | Orchestrator using runtime facts |
| Product approval policy, eligible approvers, and decision routing | Orchestrator |
| Making the product approval decision | Human or machine authority selected by Orchestrator |
| Technical runtime permission request and pending state | `ar` |
| Technical capability grant and provider enforcement | `ar` |
| Runtime process and worker lifecycle | `ar` |
| Provider session custody and technical session resume/reattach | `ar` |
| Runtime capacity allocation, provider-account leases, and credential custody | `ar` |
| Orchestration-run continuation | Run Orchestration |
| Business cancellation, timeout, retry, and recovery policy | Run Orchestration |
| Runtime cancellation, timeout, and recovery mechanism | `ar` |
| Workspace registration, materialization allocation, and cleanup | Workspace Registry |
| Authority to use a workspace | Configured product authority provider through a feature-owned authorization port |
| Workspace trust and required isolation properties | Policy and Risk |
| Runtime sandbox, mounts, process isolation, network enforcement, and technical fencing | `ar` |
| Runtime-scope cutoff, technical disposition actions, and runtime evidence | `ar` |
| Git worktree, clone, snapshot, or remote materialization mechanics | Workspace adapters |
| Provider API, CLI, SSE, and protocol translation | `ar` provider driver |
| User-facing projections | Orchestrator projections and client applications |
| Local Orchestrator Host and managed component availability | Local Supervisor |
| Hosted Orchestrator Host and component availability | Deployment platform |
| AR host availability when packaged as a local managed component | Local Supervisor |

There must never be two writers for one runtime mutation or two supervisors for
one agent process.

Orchestration Scope owns project-level `RuntimeScopeBinding`, scope admission and
disposition intent, and the scope-ingestion inboxes, checkpoints, and
projections. Run Orchestration owns participant-level `ManagedRuntimeBinding`,
`RunRuntimeTarget`, Run cutoff obligations, and target/session-ingestion state.
Execution Observation owns evidence receipts, protected payload manifests,
deterministic activity interpretation, its durable activity feed, and rebuildable
search projections. It cannot infer lifecycle consequences or technical
authority from provider output.
`ar` owns runtime scopes, sessions, operations, processes, custody, technical
fencing, provider cursors, and the pre-materialization negative operation-intent
guard.

Whole-Project disposition is coordinated by Orchestration Scope. Its runtime
feature is one participant per binding lineage and calls `ar` only through a
narrow consumer-owned port and the stateless Runtime ACL. Neither Run
Orchestration nor the ACL becomes a Project registry or runtime evidence owner.

The Runtime ACL owns only translation and technical connection state. It must not
become a second durable owner of a binding, observation revision, or recovery state.

Similar concepts on each side of the boundary remain distinct:

- an orchestration Run and an AR runtime session have different lifecycles;
- orchestration continuation and technical session resume/reattach are different
  operations;
- product team messages and runtime input/provider output are different contracts;
- a product approval and a technical runtime permission are different state
  machines.

## Interface segregation and port ownership

One large `AgentRuntimePort` would force consumers and test doubles to depend on
capabilities they do not use. Each consuming application capability owns the
narrowest port it requires, for example:

```text
RuntimeScopeAdmissionPort
RuntimeScopeDispositionPort
RuntimeTargetDispatchPort
RuntimeOperationCutoffPort
RuntimeSessionCutoffPort
RuntimeTargetObservationPort
RuntimeObservationEvidencePort
RuntimePermissionDecisionPort
RuntimeRecoveryPort
```

Names remain proposed until OD-004 is resolved. The Runtime ACL adapter may
implement several ports for convenient composition, but it does not own or export
those abstractions. Consumers request only the capabilities they use.

The accepted v1 integration invariants are:

- one RuntimeSession is associated with at most one independent Run for its
  entire lifetime, including after active use is released;
- reauthorization creates a successor RuntimeOperation and never reopens a cut
  predecessor operation;
- Run dispatch admission and AR dispatch claim are separate linearization
  points joined by durable intent, idempotency, and reconciliation;
- when prevention reaches AR before operation materialization, AR's durable
  negative operation-intent guard prevents the delayed original command from
  reaching a provider.

Capability discovery is explicit. Unsupported resume, runtime-permission
interaction, streaming, or recovery behavior is represented as a typed
capability/result, not an absent optional method or provider-name branch.

The contract must support different topology models:

- one process per agent;
- provider systems with shared-host topology, normalized by AR v1 without
  reusing one `ProviderHostInstance` across `RuntimeSession` identities;
- remote managed execution;
- providers with or without interactive approvals;
- providers with or without native resume.

The orchestrator must not infer process topology from provider identity.

## Readiness and context application

The boundary preserves distinct technical observations:

```text
runtime capability admitted
runtime session available
context application accepted
runtime input accepted
pending technical interaction
provider output active
runtime outcome observed
```

No single observation means that a product participant is ready. Run
Orchestration combines current runtime evidence with the promoted
`RunPlanVersion` and `RunPolicySnapshot` to derive participant readiness, Run
health, and continuation behavior.

Applying a context manifest is not a provider-visible Work operation. AR exposes
a capability-specific context-application result with stable idempotency and
binding identity. A provider adapter that supports a no-turn or `noReply`
mechanism uses it internally. Unexpected assistant or tool output during a
declared no-turn application is a typed anomaly, not successful Work.

Technical evidence carries the freshness and binding information required by the
AR Published Language. The orchestrator never treats cached installation,
authentication, model inventory, process liveness, or an old bootstrap response
as current execution proof.

AR v1 never reuses one `ProviderHostInstance` across `RuntimeSession`
identities. A backing provider service, machine, or process topology may still
be shared outside that private instance identity. Releasing or cancelling one
product binding therefore cannot authorize an inferred whole-host stop. Host
adoption, cross-process startup serialization, process-identity checks,
provider-message ordering, and precedence among contradictory provider
observations are AR and provider-adapter invariants. The orchestrator consumes
their normalized provider-neutral outcomes; it does not reproduce those
algorithms. Any future cross-session `ProviderHostInstance` reuse requires new
AR contract and qualification evidence.

## Published Language and anti-corruption boundary

`ar` owns the canonical, versioned Runtime Published Language/API: wire schemas,
runtime events, command outcomes, errors, capability negotiation, ordering, and
replay semantics. Consumer-owned orchestration ports are internal application
abstractions, not wire contracts.

The Runtime ACL integration boundary maps between these models through separate
roles:

- an outbound command/client adapter implements consumer-owned capability ports;
- an inbound event adapter maps `ar` events into application inputs and invokes
  event-ingestion use cases.

They may share a low-level connection created by composition, but not one broad
adapter module. Orchestrator domain and application code must not import `ar` wire
schemas, and `ar` must not import orchestrator domain models. Both repositories run
the applicable shared contract fixtures against the same Published Language
versions.

## Runtime permissions and product approvals

The permission flow crosses two independently owned state machines. The labels
below are semantic roles, not accepted AR wire command or event names:

```text
ar: technical permission request fact
  -> Runtime ACL
  -> Orchestrator: product approval request
  -> Authority decides
  -> Orchestrator: technical permission decision intent
  -> Runtime ACL
  -> ar: decision acceptance and technical enforcement lifecycle
```

The orchestrator owns approval policy, eligible approvers, routing, product expiry,
and the durable audit record. The selected human or machine authority makes the
decision. `ar` owns the technical request, capability scope, pending runtime state,
decision acceptance, capability grant, and provider enforcement.

The consumer-side normalized decision model must represent the following
semantic inputs. These are placeholders, not an accepted AR wire schema; exact
Published Language fields remain under OD-004:

```text
permissionRequestId
decisionId
idempotencyKey
expectedRequestRevision
expectedCapabilityScopeHash
decisionValidUntil
authorityDecisionRef
```

`authorityDecisionRef` is an opaque audit reference. `ar` does not interpret
orchestrator users, roles, or approval aggregates. Signed `DecisionAttestation` is
deferred until an untrusted network boundary requires it.

`ExecutionFence` is AR-internal technical authority. It never crosses the Runtime
Published Language, Runtime ACL, orchestrator persistence, logs, diagnostics, or
public client contracts. Product clients submit the decision and product evidence.
AR resolves and validates the current internal fence atomically before recording
provider-enforcement intent.

OD-004 may add an opaque, non-authorizing published concurrency guard to the
decision command. The orchestrator never reconstructs such a guard from an
attempt, epoch, process, path, or provider identifier.

The orchestrator treats duplicate, `stale`, `conflict`, and `expired` results as
normal typed outcomes. It must not translate them into an unclassified transport
failure or assume they produced a provider side effect.

The canonical decision semantics require:

- the same `decisionId` with the same canonical payload returns the previously
  recorded result;
- the same `decisionId` with a different payload returns `conflict`;
- stale request revision, published concurrency precondition, validity deadline,
  or capability scope produces no provider side effect.

Decision acceptance is not provider enforcement. The orchestrator observes and
reconciles the distinct runtime lifecycle outcomes published by `ar`, including:

- decision accepted;
- enforcement succeeded;
- enforcement failed;
- enforcement outcome uncertain;
- runtime session resumed.

An uncertain outcome is never blindly retried. Recovery follows the capabilities
declared by `ar`: provider idempotency, state reconciliation, or controlled
recovery.

## Identity and fencing

Commands must carry enough identity to reject stale ownership:

- orchestration run ID;
- runtime session reference;
- aggregate generation or expected revision;
- idempotency key;
- correlation and causation IDs;
- orchestration-side expected generation;
- canonical non-authorizing runtime concurrency guard when the published contract
  requires one.

Opaque runtime references must not be reconstructed from process IDs, paths, or
provider session names.

The public control API may expose a non-authorizing execution epoch for
observation and stale-execution diagnostics. It never exposes an execution fence
or accepts an epoch as proof of runtime authority.

AR owns runtime sessions, execution identity and custody, provider runtime
instances, provider-session bindings, operations, allocation references, provider
accounts, credentials, and recovery generations. Reattachment, takeover, restart,
and successor-generation rules remain AR invariants. The orchestrator treats only
the explicitly published epoch and provider-neutral references as opaque
observations and never infers execution identity from an epoch, process ID,
provider invocation, or reconnect.

The Runtime ACL does not reproduce AR's internal hierarchy. When AR explicitly
publishes a provider-neutral correlation reference, the ACL preserves it as opaque
and non-authoritative. Run Orchestration never stores raw runtime credentials,
account custody, private fences, or authoritative capacity allocation.

## Snapshots and events

Runtime events are facts emitted by `ar`. Orchestration projections combine those
facts with product state. Runtime snapshots are replaceable read models, not
orchestration aggregates.

Public runtime observation APIs keep control and output feeds distinct. A
session-wide merged stream cannot claim one durable cursor or ordering guarantee
unless the Runtime Published Language explicitly provides it.

The v1 Runtime ACL consumes separate control and output feed capabilities. It
neither requires nor synthesizes a merged session feed. Exact AR SDK method names
remain owned by AR.

Every orchestrator-facing snapshot needs:

- runtime reference and provider kind;
- observation timestamp;
- orchestrator observation revision;
- source event cursor or explicit `unavailable`;
- lifecycle and liveness state;
- freshness state: `fresh`, `stale`, `unknown`, or `unavailable`;
- progress evidence;
- pending interaction state;
- outcome or failure classification;
- warning and diagnostic codes;
- desired-state correlation without overwriting desired orchestration state.

If a provider cannot expose a monotonic revision, the Run Orchestration ingestion
handler assigns its own observation revision while preserving the absence of a
provider cursor. A stale snapshot is never silently interpreted as current
liveness.

## Runtime-event ingestion

The `ar` published contract defines:

- canonical schema versions and compatibility policy;
- typed command outcomes and safe error semantics;
- delivery semantics and replay support;
- public session execution epoch plus feed-specific identity and source cursor;
- duplicate, gap, and out-of-order signals available at the source;
- reconnect and replay from a supplied cursor;
- snapshot retrieval when replay is unavailable;
- behavior when a source cursor is explicitly unavailable.

Control/lifecycle observations, bounded-retention output, and large artifacts
have different retention and ordering requirements. The Runtime ACL transports
and translates those feeds without owning their checkpoints. A merged
convenience view cannot invent a global ordering guarantee or one durable cursor;
exact feed names and the runtime SDK surface remain owned by `ar`.

The consumer-owned runtime integration contract defines normalized observation
semantics. Orchestration Scope persists scope provisioning, deployment-authority,
admission, revocation, and disposition observations. Run Orchestration persists
participant, session, operation, output-fence, and cutoff observations. Each
owning capability defines:

- atomic persistence of inbox, cursor, and projection changes;
- local duplicate and out-of-order handling;
- observation revision allocation;
- snapshot reconciliation and gap state;
- the durable cursor supplied on reconnect.

When the source has no replayable cursor, the observation is marked
non-replayable. Reconciliation uses a fresh snapshot and never fabricates missing
history.

Execution Observation separately admits user-visible control and output evidence
through its own consumer port. It stores authenticated source coordinates before
deterministic normalization, keeps protected provider payload behind stricter
access, and publishes a context-owned activity feed. It does not replace the Run
observation projection, use output as lifecycle authority, or expose arbitrary AR
payload to clients. ADR-0083 and ADR-0084 define this boundary.

## Runtime-command idempotency

Mutating runtime commands require a durable command ledger or an equivalent `ar`
guarantee. The contract defines:

- idempotency-key scope, full-receipt retention, and reuse-detection horizon;
- payload hash validation for reused keys;
- replay of the original accepted result;
- unknown-outcome recovery after transport timeout;
- published stale-ownership outcomes and observable public execution-epoch behavior;
- safe retry rules for every mutation.

Internal fencing remains AR-owned and unpublished.

A retry of a session-request command after an unknown transport outcome must not
create a second runtime session. Exact command names remain AR-owned.

The orchestrator interprets an expired-window outcome only within the
reuse-detection horizon promised by the Runtime Published Language. Runtime
request fingerprints follow versioned semantic canonicalization and are not
derived from raw Protobuf bytes.

Every orchestrator runtime mutation is dispatched only after the owning
context-local transaction commits desired state and durable command intent. AR
command acceptance is not proof of provider execution, continuation, or terminal
success. The orchestrator reconciles accepted, in-progress, completed, failed, and
uncertain outcomes through command identity and published observations.

## OpenCode target placement

OpenCode integration belongs in an `ar` provider adapter. Candidate legacy donor
modules include host/profile/session management, event streaming, permission
normalization, MCP handling, execution probes, and provider inventory.

The desktop and legacy orchestrator code are behavioral oracles, not code that can
be copied into the new core without classification.

Classification does not authorize copying a legacy implementation into the new
domain or application core. Legacy code may provide behavioral tests, contract
fixtures, algorithms that are re-derived against current invariants, and temporary
compatibility adapters. New domain behavior is implemented from accepted language,
invariants, and ownership boundaries rather than legacy class or module structure.

## Migration rule

Use an anti-corruption adapter during migration:

1. freeze legacy behavior with contract tests;
2. implement the narrow orchestrator runtime ports against the legacy bridge;
3. implement the same conformance suite for the new `ar` provider adapter;
4. permit shadow reads where useful;
5. never permit dual writes or dual process ownership;
6. switch one capability at a time;
7. remove the legacy bridge only after parity and recovery verification.

## Host-level supervision

The Local Supervisor may ensure and monitor Orchestrator Host availability and,
when packaging requires it, AR host availability. Hosted deployment platforms
perform the equivalent process-availability role.

This never transfers runtime semantics. Only AR starts, adopts, resumes, cancels,
or kills provider sessions and processes. A Supervisor may restart an unhealthy AR
host only through the AR-owned host lifecycle contract; AR then reconciles
execution ownership using durable state and fencing. The Supervisor and
Orchestrator Host never enumerate or terminate OpenCode, Codex, Claude, or another
provider process directly.
