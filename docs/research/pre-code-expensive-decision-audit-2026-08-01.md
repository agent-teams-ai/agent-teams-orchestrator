---
id: research.pre-code-expensive-decision-audit-2026-08-01
type: research
status: active
owner: architecture
summary: Parallel audit of architecture choices that become disproportionately expensive after production packages materialize.
related:
  - ADR-0071
  - ADR-0072
  - ADR-0073
  - ADR-0074
  - ADR-0075
  - ADR-0077
  - ADR-0105
  - ADR-0108
  - ADR-0109
  - architecture.deployment-profiles
  - architecture.persistence
  - architecture.testing
  - architecture.implementation-readiness-gates
  - OD-003
  - OD-004
  - OD-006
  - OD-010
  - OD-012
  - OD-013
  - OD-016
  - OD-019
  - OD-021
  - OD-029
  - OD-032
  - OD-033
  - OD-034
---

# Pre-Code Expensive Decision Audit, 2026-08-01

## Scope and method

This read-only audit compared the orchestrator at `a48fb35` with behavioral
evidence from the legacy Electron branch `refactor/hosted-web-feature-boundaries`.
Independent critics examined domain boundaries, runtime integration, public SDK,
side-effect uncertainty, migration, security, data lifecycle, and future
integrations. Legacy code was treated as a scenario oracle, never as target
architecture.

The audit asks which omissions create data, identity, authority, or compatibility
migrations that are much more expensive after packages and public contracts grow.

## Decisions confirmed during the audit

- ADR-0073 accepts Agent Context as a separate bounded context but does not
  authorize package materialization before Gate 2.
- ADR-0074 excludes Jira, Notion, Discord, and a general connector/plugin platform
  from v1 while OD-034 preserves the future installation boundary.
- ADR-0075 introduces an exact default-deny source dependency policy. Semantic
  LikeC4 edges do not grant imports.

## Required before the first production slice

### Run, Work, Team, and runtime identity

Use narrow aggregates and feature-owned durable process managers. Work
Coordination alone mutates Work lifecycle. Team Topology owns Team versions and
roster. Run Orchestration owns Run authority, plan promotion, participant
activation, placement coordination, and cleanup processes. AR identities remain
opaque runtime evidence.

The remaining specification must settle transition tables, generation and fence
keys, stale-result rejection, participant replacement, Work cancellation races,
and terminal authority without creating one cross-context transaction.

### Side-effect uncertainty and cancellation

Every external effect needs durable intent, dispatch identity, claim generation,
typed acceptance evidence, reconciliation, and cleanup state. Business
cancellation, external-effect status, and cleanup status are independent axes.

If dispatch commits before cancellation, cancellation cannot pretend the effect
never existed. An unknown effect without target fencing blocks automatic
replacement. Exactly-once applies only to authoritative internal transitions;
external effects require idempotent target support or explicit uncertainty.

### AR Published Language

Before the Runtime Gateway slice, define capability-scoped consumer ports,
capability negotiation, admission, receipts, control and output feeds, recovery,
permission decisions, and typed next actions. Orchestrator public Operation,
orchestrator child command, AR RuntimeOperation, provider invocation, and dispatch
identity remain distinct.

AR owns Protobuf, Buf, descriptor sets, capability catalog, and golden fixtures.
The orchestrator owns its consumer ports, ACL, and process-level conformance. No
repository copies the other's domain models.

### Public SDK and future ownership migration

ADR-0071 correctly separates caller request ID from server Operation identity.
For v1, the new orchestrator is the first and only authoritative owner of each
implemented capability. The Desktop compatibility adapter translates current IPC
and DTO behavior; it does not preserve old-orchestrator command ownership,
receipts, or domain state. Normal retry resolution therefore stays with the same
feature-owned command receipt and does not require a historical owner-affinity
index, admission route token, or central command directory.

Those mechanisms become relevant only if a live bounded context is later moved
between independently deployed owners while existing command receipts remain
valid. Such a move requires a separate ADR and migration protocol. An ordinary
version rollout against the same logical owner and persistence authority is a
schema and release-compatibility concern, not an owner-affinity migration.

The public contract also needs one machine-readable Operation catalog, typed
errors, business-specific cancellation, pagination and cursor authorization, and
TS/Go golden fixtures before SDK release.

### Security contract

Use distributed security authorities plus shared technical primitives, not a
Security bounded context. Before code, specify:

- trusted tenant/project scope on every aggregate, row, event, inbox/outbox,
  cursor, cache key, blob reference, and idempotency scope;
- immutable verified ActorContext, delegation, authority revision, and
  revocation behavior;
- opaque purpose-checked SecretRef resolution that never returns raw secrets to
  application code;
- confidentiality and content tags as separate axes with propagation rules;
- workspace binding generation, product trust decision, and AR-native
  enforcement as separate facts;
- redacted audit intent committed with state and outbox;
- signed release compatibility metadata for bundled sidecars.

OAuth provider, policy engine, KMS, service identity framework, and sandbox
implementation are adapter choices and can be deferred.

### Data lifecycle and disaster recovery

Define lifecycle semantics now and exact durations later. Every durable asset
needs a policy reference, retention and replay class, erasure disposition, backup
and restore class, and payload owner.

The pre-code contract must include:

- a validated horizon graph relating replay, redelivery, inbox dedupe,
  idempotency tombstones, migration, and disaster recovery;
- monotonic deletion epoch checked by replay, restore, delayed outbox, and blob
  recovery;
- a new deployment/restore epoch that stales old leases, tokens, cursors, and
  realtime cache positions;
- an outbox durability barrier classification for irreversible effects;
- owner-scoped blob references and PITR-aware garbage collection;
- disk-pressure states that preserve stop, cleanup, repair, and export capacity.

Orchestration Scope coordinates Project disposition under ADR-0080. Every bounded
context owns its local erase or anonymize behavior. Persistence and eventing
platforms own storage mechanics, never product deletion semantics.

### Release compatibility

Before Local Supervisor implementation, define a composed compatibility manifest
for Supervisor, Host, AR, NATS, Centrifugo, storage readers/writers, artifact
digest and signature, activation order, and rollback eligibility. A component
failure degrades only the capabilities it owns; for example, Centrifugo loss does
not invalidate durable commands.

## Legacy scenarios that must become fixtures

- primary runtime can start while another participant is still provisioning;
- a secondary lane can fail while the Run remains operational but degraded;
- bootstrap confirmation does not prove current liveness;
- timeout, output limit, and failed termination can leave outcome unknown;
- a spawn intent without ownership handshake becomes operator-required;
- late progress, cancellation before canonical Run identity, and short-lived
  in-memory progress must not define the new contract;
- delivery accepted, mailbox committed, runtime accepted, response pending, and
  acceptance unknown are distinct facts;
- best-effort deletion, attachment cleanup, fixed message caps, and hard-coded
  retention are negative fixtures, not target behavior.

## Safe to defer

- external vendor connectors and public plugin SPI;
- full RAG, vector storage, generalized memory, and Context branch graphs;
- Temporal deployment, multi-region orchestration, and service mesh;
- exact legal retention durations and production RPO/RTO numbers;
- specific IdP, KMS, object store, policy engine, and container or VM sandbox;
- rolling multi-region migration and automatic rollback across irreversible
  storage migrations.
- live capability ownership migration, historical owner-affinity indexes,
  admission route tokens, and a central command directory until a bounded
  context is actually extracted between independently deployed owners.

## Recommended specification order

1. Run/Work/Team aggregate and transition matrix.
2. AR capability contract and conformance bundle.
3. Side-effect, cancellation, unknown-outcome, and cleanup state machines.
4. Public Operation/error catalog, cancellation, and reconciliation contracts.
5. Tenant, ActorContext, SecretRef, trust, and data-classification contracts.
6. Data lifecycle, deletion/restore epochs, horizon graph, and disk-pressure
   contract.
7. Release compatibility manifest and first executable cross-boundary fixtures.

This report is evidence only. Accepted ADRs, owning dossiers, schemas, and open
decisions remain normative.

## 2026-10-21 review addendum

### Scope and review method

The owner requested overlapping independent criticism of the scalable service
plan, including the complete product vision: one team through thousands of
simultaneously executing agents, multiple human users and clients, polyglot
services, server Compose and Kubernetes, hosted-target Desktop, and a future
native local profile. Cheap AI-generated boilerplate does not remove distributed
failure, authority, upgrade, or support costs.

Nine independent reviewers using GPT-6.1 with reasoning effort `xhigh` received
the same detailed brief and answered the same six questions before reading peer
reports. Their specialties covered boundaries twice, protocols, native storage,
security, capacity, delivery cost, deployment, and governance. They inspected
the immutable PR79 source at `8f761d3`, current main at `98f6531`, and the separately
prepared `8483949` composition/collaboration change where applicable. That
separate source snapshot is not evidence of publication or merge.

The original PostgreSQL comparison dated 2026-10-03 and the retained transport,
launcher, restore, integrity, and multi-writer evidence were available to every
reviewer. Existing Linux synthetic results were not counted as new experiments,
packaged Windows/macOS evidence, or achieved enterprise capacity. Read-only
source and merge-tree inspection added integration evidence, not load results.
Three further critics using the same model and reasoning setting then read all
nine final reports and the synthesis, independently of the other cross-reviews.
They challenged protocol/trust conclusions, placement/capacity, and evidence/
governance respectively. All twelve reports are complete. Common inputs and one
model family make opinions correlated; review agreement is not independent
experimental replication.

### Agreement and substantive dissent

| Topic | Review outcome | Practical meaning |
|---|---|---|
| Narrow Dapr, standard gRPC/Protobuf, public Connect, direct JetStream | All nine recommend retaining the current direction while qualifying its actual profiles | No new private transport or custom registry is justified by this review |
| Nine coarse roles | All preserve the accepted policy for implementation; none proves nine is an optimal fixed count | Roles appear with actual features, not empty services or one service per module/agent |
| Mandatory isolation from the first feature | Delivery review prefers a compact initial placement for Team CRUD, bounded Observation reads, and minimal Context assembly; other reviews also identify their weaker initial resource argument | Early Team isolation is an explicit owner tradeoff that exercises a real stateful boundary, not a demonstrated throughput requirement |
| Shared Coordination and Derived roles | Repeatedly identified as the most fragile groupings | Ordinary delivery must not block cutoff/recovery; index rebuild must not block owned usage admission/rating |
| Native PostgreSQL and selected launcher | No evidence justifies changing the accepted engine or wrapper selection | Qualification remains per artifact, OS, architecture, lifecycle, update, and restore capability |
| Large concurrent execution capacity | No review claims it is measured | Model workload and AR/provider execution require separate evidence |

The strongest alternative to Dapr is standard gRPC with existing platform
discovery, balancing, and identity mechanisms. It does not require writing a
private RPC framework. Standard Protobuf/gRPC supplies the language-neutral
contract; Dapr supplies a selected invocation runtime. A comparison must hold
authentication, receipts, admission, recovery, drain, supported languages, and
deployment forms constant. Adding a second stack speculatively would increase
the support surface before either profile is qualified.

Retaining an accepted choice does not prove its comparative superiority. A
future direct-gRPC proposal could justify a successor through lower total cost
at the same guarantees even if Dapr is technically workable. Neither comparative
cost nor production superiority was measured by these reviews.

The dissent does not authorize a hidden local fallback or an implementation
exception to ADR-0109. A compact placement would need an explicit later decision
and evidence for the actual supported workload. The current owner mandate
remains the governing choice.

The dissent concerns initial server placement as well as a future native
profile. A bounded Run path with Team, durable coordination, and Observation
intake/query already reaches five named roles. A true Context assembly feature
adds a sixth; the existing main manifest read/bootstrap alone does not trigger
that assembly role. This is a conditional reading of the map, not a measured
minimum installation or a requirement to create missing capabilities.

### Adversarial review corrections

The three cross-reviewers challenged the common conclusions instead of counting
additional votes. They produced three concrete corrections:

1. A shared process can demonstrate bounded interference and control progress
   under a declared failure model. It cannot demonstrate independent process
   crash, global memory-exhaustion, or credential-compromise isolation between
   its handlers. When that independence is required, the role must split.
2. Inspection of the retained Dapr `1.18.7` source at
   `b32a815fa2260983e181b95272ea555fe17d3895` found that transparent gRPC proxy
   local-target selection compares the application ID alone, while ordinary
   direct invocation compares application ID and namespace. After successful
   resolution of the same application ID in another namespace, the proxy's
   local branch is therefore selected in that source path. This is a static
   counterexample, not an executed cross-namespace exploit, a finding about the
   latest release, or a failure of the distinct Control-to-Team IDs in S3.
   The route/testing rules now require actual namespace-sensitive qualification
   before advertising such a profile, or explicit rejection of unsupported
   combinations. See the immutable
   [proxy source](https://github.com/dapr/dapr/blob/b32a815fa2260983e181b95272ea555fe17d3895/pkg/messaging/grpc_proxy.go)
   and [direct invocation source](https://github.com/dapr/dapr/blob/b32a815fa2260983e181b95272ea555fe17d3895/pkg/messaging/direct_messaging.go).
3. A fresh canonical integration record must carry the original decisions'
   supersession effects, not just source links. Otherwise old monolith-first
   and local-database rules could remain authoritative beside their replacements.
   The exact planned lifecycle transition belongs in the proposed record's
   body until acceptance; the current Foundation rejects active supersession
   metadata on a proposed ADR. The acceptance change applies the new decision's
   lifecycle edges and predecessor statuses together while retaining historical
   body/path/digest tuples.

### Findings incorporated into current documents

Two concrete omissions were independently identified in the placement/resource
description:

1. Approval expiry/revocation reconciliation and Consumption Governance expiry,
   period rollover, and reconciliation lacked explicit background placement.
   The role map now places their future admitted handlers in Coordination.
   Usage Metering's own admission, checkpoints, and quarantine are also explicit;
   Execution Observation does not acquire that authority. No unresolved domain
   model or new S3 capability is accepted by this placement clarification.
2. A connection budget expressed as replicas plus surge did not explicitly count
   terminating instances and overlapping rollouts. The current resource rules
   count all pools in all simultaneously live instances and qualify actual
   closure, bounded drain, and overlap. A readiness change does not release SQL
   resources by itself. This follows documented
   [Kubernetes Deployment behavior](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#updating-a-deployment).

The review also made existing qualification obligations more concrete:

- Self-hosted workload enrollment, sidecar peer invocation, and both application
  hops are separate trust questions. Dapr's documented default insecure Sentry
  validator cannot establish entitlement to a service identity. The
  [private RPC trust profile](../architecture/security-architecture.md#private-rpc-trust)
  now requires negative enrollment and bypass evidence. This is an existing
  release blocker made precise, not a newly demonstrated product exploit.
- Many independent Runs and tenants and one concentrated Run or tenant are
  distinct load shapes. Run authority gates, feed heads, and quota keys may
  serialize conflicts despite more replicas. The testing strategy now names
  both shapes; it does not weaken fences or promise an unmeasured limit.
- Separate consumers, schemas, or SQL pools do not establish CPU, memory,
  event-loop, or failure isolation inside a shared process. Existing role split
  triggers apply before shipping a workload that cannot preserve neighboring
  control and recovery progress.
- Agent instructions now record the owner's comparison format: expected
  reliability, confidence, and complexity out of ten, with scoped manually
  maintained code ranges and explicit uncertainty.

### Deployment and storage evidence limits

The current Dapr resolver table labels Kubernetes and mDNS Stable, while generic
Consul, NameFormat, and SQLite resolvers are Alpha. This is a component-specific
distinction, not a verdict that all Dapr discovery is immature. One working
Compose app/sidecar pair does not qualify arbitrary replica scaling, and native
or container multicast availability must be demonstrated on the supported
network. A small declared Compose replica envelope and a separately qualified
Kubernetes scaling envelope remain consistent with the accepted deployment
forms. See the [resolver catalog](https://docs.dapr.io/reference/components-reference/supported-name-resolution/)
and [mDNS limitations](https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-mdns/),
reviewed on 2026-10-21.

The original storage report rated Rust native PostgreSQL 8.5/10 and Node native
PostgreSQL 8/10 for their respective launcher contexts. It did not select a
Desktop framework or compare equivalent end-to-end startup intervals. The later
Node selection remains consistent with that evidence. Isolated launcher
containment and observer checks address specific wrapper failures; they do not
prove OS process custody, Supervisor adoption, signed installation, interrupted
updates, or product restore on every released platform. Hosted-target Desktop
does not start this local infrastructure. Fully Local remains deferred.

### Comparable estimates and decision boundaries

Scores describe expected robustness after the stated controls, evidence
confidence, and engineering/operational complexity. Ten means strongest
robustness, strongest evidence, or greatest difficulty respectively. They are
not uptime or production-readiness measurements. Code ranges are forecasts;
confidence in the ranges below is only 3/10.

The following comparison uses one security review's common scope: S3
Control-to-Team, two tenants, two Team replicas, a representative Go replacement,
trusted context, workload enrollment/rotation, bounded admission/drain/retry,
lost-reply recovery, and actual Compose/Kubernetes rejection cases. Existing
domain/storage logic, issuer infrastructure, full IAM, native packaging, UI,
AR, generated code, and vendor code are excluded. It is not total S3 cost.

| Alternative | Reliability / confidence / complexity | Integration code | Qualification tests | Configuration |
|---|---|---|---|---|
| Selected Dapr with qualified trust and both application hops | 8 / 7 / 7 | 2,200-4,500 lines | 4,500-9,000 lines | 600-1,300 lines |
| Standard gRPC with platform discovery and managed workload identity | 8 / 6 / 7 | 2,500-5,500 lines | 4,500-9,500 lines | 450-1,100 lines |

Other reviews scoped smaller transport-only increments, PostgreSQL lifecycle,
or broader deployment work. Their numbers overlap and must not be added,
averaged as a common estimate, or multiplied by nine roles. No measured
whole-project development percentage follows from this review.

Engineering can select exact bounded fixtures, adapters, pins, shutdown order,
and initial tested limits within the accepted policy. Product choices remain
the local support envelope,
availability and recovery commitments, and any actual change of placement or
supported profiles. Already approved Dapr, Compose/Kubernetes, and native
PostgreSQL choices do not need repeated confirmation without new evidence.

### Owner follow-up: capacity and test selection

On 2026-10-21, the product owner selected the approach that scales better and
confirmed risk-based testing. The primary capacity target is aggregate admitted
execution across independent Runs, including Runs within one team and tenant.
The [deployment profile](../architecture/deployment-profiles.md#concurrent-execution-target)
owns this decision and the separate per-Run qualification requirement. Thousands
within one Run are not a baseline release requirement; Agent occupancy and
semantic Run boundaries remain unchanged.

The [testing policy](../architecture/testing-strategy.md#risk-based-test-selection)
requires concrete risk coverage and the smallest sufficient test layer, avoids
redundant or implementation-mirroring tests, and preserves mandatory gates.
These are documentation clarifications; they neither add production behavior
nor establish measured capacity.

### Integration with current main

PR79's accepted FMS ADR-0103 and main's accepted sandbox ADR-0103 are distinct
histories with the same permanent ID. Main/848 also has accepted ADR-0110 for
mandatory Get Modular and FMS adoption. Read-only merge inspection found four
textual conflicts against main and sixteen against `8483949`; these counts are not
counts of architecture defects. A textually clean merge can still misdirect a
stable reference or erase scoped admission.

The installed Foundation 1.7.2 protects accepted body/metadata digests, paths,
and unique IDs. Simple renumbering or baseline replacement is not an authorized
repair. Importing raw ADR-0105/0109 without ADR-0104 leaves missing relations;
importing ADR-0104 makes its historical FMS reference to ADR-0103 misleading in
the new catalog. A human crosswalk alone does not change current ID semantics.

The recommended integration proposal starts from current main/848, preserves
PR79 and its exact original ledger as immutable provenance, and prepares a new
proposed canonical integration record for the already selected service,
storage, and role scope. Current ADR-0103 continues to own sandbox admission;
ADR-0110 continues to own module composition. The old branch records remain
available by immutable source links instead of being renamed into the catalog.
The new record requires explicit acceptance under the existing ADR rules before
canonical promotion; publication of separate drafts does not imply acceptance
or authorize merge.

The integration proposal must explicitly preserve the supersession of ADR-0001
and ADR-0011, the bounded replacement of SQLite-specific rules in ADR-0025,
ADR-0048, and ADR-0052, and all carried-forward guarantees. A proposed record
describes these planned changes without active `supersedes` metadata. At owner
acceptance, apply the selected successor edges and predecessor
`status`/`superseded_by` changes atomically through the ordinary governance
workflow; never edit their protected bodies or manufacture a replacement
baseline. This is necessary semantic reconciliation, not only link repair.

Main's bounded Sandbox Manifest read and Host bootstrap are not full semantic
assembly. Its scoped admission must survive integration, while the first real
assembly feature still meets the selected role gate. This audit does not revert
main's accepted slice, accept the entire model, or create a new global gate.
