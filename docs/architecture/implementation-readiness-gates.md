---
id: architecture.implementation-readiness-gates
type: architecture
status: accepted
owner: architecture
summary: Mandatory evidence gates that must pass before the first production orchestration vertical slice is implemented.
related:
  - ADR-0117
  - ADR-0103
  - contract.migration.desktop-first-slice.v1
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
  - ADR-0114
  - ADR-0115
  - architecture.deployment-profiles
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
  - ADR-0116
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

These gates admit the first V1 orchestration slice and profile advertising. The
required Fully Local implementation increment follows its separate OD-040
materialization decision after the relevant lifecycle and workflow boundaries
are accepted. Package materialization may then start before Fully Local release
qualification, because the implementation is required to produce that evidence;
it still grants no availability or shipping claim. ADR-0115 puts local contract
resolution, implementation, and qualification on the V1 delivery path. A narrow
first server slice can precede them; completed V1 cannot omit the local profile.

Passing a gate does not require resolving every future feature. It requires
enough accepted ownership, invariants, contracts, transition behavior, and
failure evidence that the first implementation will not silently choose an
expensive architecture decision.

## Gate status

| Gate                                                           | Current state | Owning authorities                                                                                        |
| -------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| Run, Work, and topology semantics                              | In review     | Run Orchestration, Work Coordination, Team Topology                                                       |
| Communication, Attention, and Agent Context boundary           | In review     | Agent Communication, Human Notification Management, Agent Attention, Agent Context, and Run Orchestration |
| Public SDK and Desktop compatibility boundary                  | In review     | Feature owners, Control API, SDK, Desktop integration                                                     |
| Temporal-ready durable process boundaries                      | In review     | Run Orchestration application and workflow scheduling adapters                                            |
| Deployment authority, target fencing, and runtime connectivity | In review     | Access Control, composition, clients, runtime gateway                                                     |

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

## Scoped sandbox implementation admission

ADR-0103 admits only the new server sandbox Team/Run, planned Work metadata and
direct-message slice under the owner's A-F migration mandate. The
[scoped contract and evidence matrix](../contracts/desktop-runtime-migration-admission-v1.md#conformance-fixtures)
provide the five exit proofs for this exact implementation start:

| Gate                         | Scoped exit evidence                                                                                                     | Admission                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1: Run, Work, topology       | Accepted owners, immutable identity/placement contracts, cancellation and stale/unknown models                           | Passed for ADR-0103 scope |
| 2: Communication and Context | Direct audience/child receipt, separate delivery observations, context evidence rejecting text authority                 | Passed for ADR-0103 scope |
| 3: SDK/Desktop               | Versioned Protobuf, exact DTO oracles, request/expiry/ETag/clock and target/feed fixtures                                | Passed for ADR-0103 scope |
| 4: Durable processes         | Feature-owned activation/dispatch/cancel state, stable identities, post-commit dispatch and unknown reconciliation model | Passed for ADR-0103 scope |
| 5: Deployment/authority      | Existing server boundary and bounded test authority, authenticated scope and target generation rejection                 | Passed for ADR-0103 scope |

ADR-0103 covers only the six named context reservations and retains their
strategic owner references. The broad gate table above remains in
review for later capabilities. This admission permits real feature implementation
against synthetic runtime/authority adapters; it does not assert actual storage,
Connect/MCP/Desktop conformance, real provider execution, qualified server
availability, Fully Local materialization or any release qualification. Those
implementation and deployment proofs follow their owning contracts.

## Incremental implementation route

The owner's 26 November preparation request uses the
[existing MVP delivery partition](../research/orchestrator-mvp-research-and-collaboration-2026-11-08.md#delivery-partition-and-agent-handoff--2026-11-26).
This route assigns the next bounded work to existing owners and evidence gates;
it does not replace their decisions, create another backlog or change gate status.

| Next task and owner | Entrance | Exit evidence and limit |
| --- | --- | --- |
| Scope and authority fixtures — architecture/security, feature owners and migration/desktop | Existing ADR-0103 sandbox contract. Documentation, deterministic fixtures and isolated probes may proceed now. | Every admitted command, protected read/feed and receipt replay has trusted context, exact scope and rejecting revoke/expiry/foreign-target cases in the existing contract fixtures; no implicit permission on remaining handlers. |
| Complete foundation preparation — architecture/composition and engineering/tooling | ADR-0113/0117, the owner's full-capability direction and proposed ADR-0118. Foundation work may proceed while implementation is pending. | Full design and common foundation evidence below pass, including nested enforcement, Resources/Observation/native Effect and representative 500-entry growth. Every dynamic and target-dependent capability has its mandatory owner and exit. |
| Retained sandbox handlers — the six ADR-0103 context owners and server/role composition | Scoped ADR-0103 admission plus the common foundation gate and complete qualified dependency closure; record the selected role placement and owned contracts. | Actual owning transactions, receipts/outbox, MCP handlers and synthetic adapters pass restart, lost-response, authority and Target-generation cases. The first role implementation meets its process/transport and source-check gate before acceptance; runtime/provider and deployment qualification remain separate. |
| First real IAM profile — configured authority, identity-binding and consuming-feature owners | An owning scoped decision from the [OD-012 first IAM increments](../open-decisions/OD-012-identity-authorization-tenant-isolation.md#first-iam-implementation-increments) accepts the exact profile and production contracts before dependent code. | Real principal/grant/session and provider-adapter evidence replaces only the declared synthetic boundary; no blanket closure of OD-012, mandatory cloud dependency or second grant ledger. |
| Subsequent MVP and V1 increments — owning Work, Run, Communication, Runtime and profile owners | Separate admission for capabilities outside ADR-0103 and their applicable gates. | The integrated target and three required V1 profiles have their own actual evidence; assignment/completion/review and native Fully Local remain tracked requirements. |

An agent handoff names the owning feature, allowed files, exact admitted behavior,
dependencies, failure cases and check commands. Link its result from the existing
owner/evidence row. Do not create an empty package, widen a dossier's acceptance,
or turn a synthetic adapter into a production default merely to finish a task.

The immediate executable work is documentation/contract fixtures, foundation
seam migration and its qualification. New or expanded business module assembly
still waits for the module foundation below; retained role implementations also
satisfy the [first-materialization role gate](#first-materialization-role-gate).
The complete Keycloak/OpenFGA/shared Identity rollout is not a prerequisite for
ADR-0103's bounded test authority, and that exception grants no real IAM claim.

## Module foundation before business expansion

ADR-0117 makes Get Modular mandatory and adds a composition prerequisite before
new or expanded business module assembly. It does not rewrite the five business
gates or retract ADR-0103's exact sandbox evidence. Existing admission is not
evidence that the new module foundation has passed.

The current implementation state is **pending**. The owner's 26 November
clarification requires the [full foundation plan](composition-and-dependency-injection.md#full-foundation-implementation-plan),
including all module and engineering capabilities, before broad business
expansion. Foundation work, migration of actual seams, disposable qualification
and corrections to already admitted behavior may proceed. A small business MVP
does not reduce foundation design to an isolated static factory example.

Readiness has four explicit meanings:

| State | Required evidence | Present state |
| --- | --- | --- |
| Full design ready | Complete capability/owner/profile/identity/state/lifetime/authority matrix, owned implementation cards, exact candidate sources and unresolved dependencies; reviewed adoption transition | Full proposal recorded; design acceptance, exact adoption and runtime evidence remain pending |
| Common foundation qualified | All common evidence rows below pass on the selected installed cohort, actual source rules and supported compiler | Pending |
| Profile execution ready | The profile's entire dependency closure is qualified, including needed authority, transport, state, target, facade, installation and update mechanisms | Pending except existing separately scoped historical admissions |
| Full foundation ready | Every required target and capability in the committed foundation programme has actual implementation and independent evidence | Pending; a static or common pass cannot use this label |

Broad business expansion requires full design and common foundation
qualification, then the exact execution-ready profile for its dependencies.
A replaceable entry needs the working shared invocation/facade seam before
dependent production behavior. Browser, Desktop, isolated execution and live
updates have mandatory implementation tracks, not unexplained deferrals. Product
V1 still requires Managed, Standalone and Fully Local under ADR-0115.

| Common evidence | Required result | Current state |
| --- | --- | --- |
| Artifact and tool reconciliation | Proposed ADR-0118 cohort, immutable CMS/FMS identities, installed archive/peer/physical identity and complete TS >=7.0.2 closure; coherent tooling migration | Pending; current accepted 0.5.0 pins remain unchanged |
| Real seam migration | Sandbox Manifest and every applicable materialized seam use one GM path; pure helpers classified explicitly; no Awilix or handwritten fallback graph | Pending |
| Nested source conformance | Deepest ownership, visibility, direct-parent assembly, one-level republication, composition-only imports, type-use/load cycles and complete descriptor-map parity/conflicts | Construct activation blocked until real rejecting source fixtures pass |
| Representative installed consumers | Same portable behavior in two independent test Hosts with their own drivers, adapters and lifetime owners; real nesting, meaningful profiles, public packed imports and independent optional/many wiring oracle | Pending |
| Resources and repeated instances | Invalid wiring starts zero factories; runs isolate state; late setup, cancellation, borrowed inputs, raw work, original close, cleanup debt and retry retain correct ownership | Pending |
| Observation, commands and hooks | Real latest-state projection and load settlement; owner-defined hook order/failure; durable occurrences and current authorization cannot be lost through coalescing | Pending |
| Native Effect | Installed native construction, typed failure/defect/interruption, provider sharing, private Layer and borrowed lifetime; dedicated native tests | Pending; Promise smoke/isolation is not native evidence |
| Representative hundreds of modules | 100- and 500-entry Orchestrator-shaped nested/complete-map source fixtures on the supported compiler, with fixed measured budgets and actual source gates | Pending; 500 is the proposed common-foundation target |

The separate larger-growth target is 1,000 entries, with its own compiler,
runtime/source envelope and declared limits. Its status is pending. It is outside
the common acceptance table and does not block that table's 500-entry target;
support at 1,000 cannot be claimed until its own evidence passes.

The [current source review](../research/orchestrator-full-foundation-review-2026-11-26.md#scale-and-source-enforcement)
finds new upstream 500-entry team-map and packed 1,000-declaration evidence. It
does not close the older difficult inherited/nested fixture that timed out at
500. Re-run that shape with the current complete descriptor-union recipe;
retain both the original result and the corrected receipt. No private compiler,
wiring cast, weaker map or silently increased timeout can substitute for proof.

Measure feature, entry, group, package, source depth, graph depth and execution
counts separately. Reviewed Assembly limits include group depth 16, 4,096 total
entry/group nodes and 4,096 selected modules plus borrowed inputs. A product
organization hierarchy is domain data; it does not consume one group level or
container per department or agent. Runtime throughput and concurrency require
their own load evidence, independent of compiler fixtures.

The [dependent foundation rows](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md#full-foundation-integration-handoff)
retain actual installation/update/Browser/Desktop/isolation exits. EF's
GHCR/Harbor and two-independent-product floor is not satisfied by LMU's two
test Hosts. Common conformance uses shared source facts, FMS and GM APIs; it
does not create another parser, graph or generic lifecycle engine. Missing
capabilities stay visibly unavailable and refuse before evaluation/effect.

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

The gate does not require implementing the full local runtime in the first
server slice. ADR-0115 requires Fully Local for V1, and ADR-0116 resolves OD-035
by selecting full native Temporal with PostgreSQL. Local and hosted profiles
use the same engine family behind an engine-independent port, with separately
qualified lifecycle and resource limits. Deterministic in-process test schedulers
remain valid; they do not become an in-memory production local fallback.
OD-005's concrete workflow boundary and ADR-0116's implementation and release
qualification conditions remain applicable.

## Gate 5: Deployment authority, target fencing, and runtime connectivity

Required evidence:

- machine-readable Managed SaaS, Standalone Self-Hosted, Connected Self-Hosted,
  and Fully Local profile states agree with ADR-0115 and ADR-0093;
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
  set, with OD-035 resolved by ADR-0116; scaffolding and topology checks still
  reject materialization until the remaining gates are resolved and OD-040
  names the accepted materialization decision.

The reliability catalog separately blocks profile qualification on OD-003 and
OD-012. The OD-003 blocker is a qualification gate, not a slice-admission
criterion of this gate.

For the first server slice, this gate does not require implementing Fully Local
or an optional commercial capability. Completed V1 requires the local profile
and its mandatory capability evidence under ADR-0115. Every profile advertises
only capabilities whose authority and connectivity are qualified; optional
commercial capability does not block a baseline profile.

## First-materialization role gate

ADR-0114 and the [service role map](deployment-profiles.md#service-role-map)
add a scoped implementation obligation to the existing five gates. They do not
mark any current gate passed or require empty services for undelivered features.
The first PR implementing a selected role, and every PR extending its handler
set, must satisfy the
[placement record](deployment-profiles.md#first-materialization-placement-record)
before that implementation is accepted.

Required evidence is attached to the owning feature and role composition:

- the semantic owner, delivered capabilities, actual consumer, transaction and
  recovery authority, and local, private RPC, or durable semantics are explicit;
- the role is a separately runnable OS process from the roles it must isolate;
  static Host composition cannot register forbidden remote or worker handlers
  in Control Host as a fallback;
- first private S3 integration crosses Control Host to Team Topology through
  standard gRPC and Dapr; all implemented stateful Team methods use the owned
  role rather than duplicated application graphs;
- both server Compose and Kubernetes mappings and required integration lanes
  accompany the role; each advertised form has actual environment evidence;
- owned contracts, trusted scope, scoped SQL credentials, migration authority,
  compatible replicas, resource limits, readiness, drain, and uncertainty
  reconciliation are recorded and exercised at the real boundary;
- rejecting source and composition fixtures cover forbidden dependencies,
  transport leakage, cross-context storage access, and production bypasses;
  their exact test identities and commands are registered in the required
  repository runner with the first implementation;
- independent process/sidecar failure, overload, lost reply after commit, and
  original-outcome recovery pass the applicable
  [role qualification suite](testing-strategy.md#concurrent-execution-and-service-role-qualification).

A `.proto` file, Dockerfile, manifest, source-check declaration, or in-process
fixture alone cannot pass this gate. Production claims stay limited to actually
qualified capabilities and environments. Native Fully Local implementation and
shipping retain OD-040 and their existing separate gates; an undeclared local
fallback cannot satisfy a server integration requirement.

Permitted co-location must be re-evaluated before shipping a feature or raising
its qualified workload when a role-map separation trigger applies. The owning
change supplies a recorded placement outcome and evidence; leaving extraction
as an untracked future task is not an admissible outcome.

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
