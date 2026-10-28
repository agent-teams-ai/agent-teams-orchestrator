---
id: ADR-0115
type: adr
status: accepted
owner: architecture/composition
summary: Adopt the approved native Fully Local V1 scope into canonical main while preserving shared semantics, Target isolation and release qualification.
approved_by: product-owner
accepted_at: 2026-10-22
supersedes:
  - ADR-0087
  - ADR-0090
superseded_by: []
related:
  - ADR-0030
  - ADR-0060
  - ADR-0064
  - ADR-0088
  - ADR-0091
  - ADR-0093
  - ADR-0097
  - ADR-0103
  - ADR-0113
  - ADR-0114
  - architecture.deployment-profiles
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - architecture.persistence
  - architecture.testing
  - OD-021
  - OD-035
  - OD-036
  - OD-040
---

# ADR-0115: Canonical Fully Local V1 Adoption

## Context

On 2026-10-22 the product owner explicitly requires native Fully Local Desktop
in V1 alongside Managed SaaS and Standalone Self-Hosted Server. Local operation
must remain in planning and qualification from the beginning, with shared owned
behavior rather than parallel local and hosted products.

The accepted scope was published as source ADR-0112 on the architecture branch.
That branch cannot be merged as a canonical ADR catalog because its earlier
accepted identities collide with main and parallel work. This is a fresh
canonical adoption of the approved local scope, not a renumbering or rewrite
of source ADR-0112. Its original body, accepted ledger and source commit remain
unchanged.

## Decision

### Immutable source and canonical mapping

Adopt the approved requirements and retained rationale in
[source ADR-0112: Fully Local V1 with shared backend profiles](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0112-fully-local-v1-with-shared-backend-profiles.md)
at exact reviewed snapshot
`3a68590e98e3acc77eb1f27e0938f08e93307b50`. Its accepted immutable payload digest
is `sha256:b3d83e9ed9ff3c57e0c0ffa8843b6ce5f21d948a86e43a05b176194224fc0f47`.

Source references to module/composition adoption resolve to ADR-0113; source
backend, PostgreSQL, launcher, private RPC, eventing, scale and shared reference
responsibilities resolve to ADR-0114. This new record owns the canonical V1 scope
and its bounded supersession. Source ADR numbers remain qualified by immutable
source context and do not become aliases for other canonical records.

Canonical ADR-0103 remains the accepted first sandbox runtime migration admission
with its exact business scope, contract and evidence. Required local V1 scope
neither revokes that admission nor expands it. This record does not merge or
adopt the separate parallel collaboration/module work.

### Required V1 profiles and bounded supersession

V1 requires Managed SaaS, Standalone Self-Hosted Server and native Fully Local
Desktop. The complete V1 release includes the required profiles and their
mandatory evidence-backed capabilities. Implementation may advance through small
vertical slices; the first server slice need not implement every local capability.
Local contracts, implementation and qualification remain tracked V1 obligations.

Supersede only the Fully Local release deferral in ADR-0087 and ADR-0090. Carry
forward their remaining requirements: one logical application core, independent
standalone operation, explicit capability negotiation, Target generation fencing,
enrolled local-device execution, Host-issued realtime authority, and independent
product/commercial authority. ADR-0091 and ADR-0093 retain qualification authority;
ADR-0093 and ADR-0097 retain the distinction between package implementation
admission and release evidence. Their later clarifications remain applicable.

Historical server-first or future-local wording in other accepted source records
describes their acceptance context. It does not establish a second current
release policy. Their persistence, launcher, placement, lifetime and security
decisions remain effective within this revised release scope. Connected
Self-Hosted remains a separate future profile.

The existing reliability registry records Fully Local with
`releaseScope: v1-target` and `qualification: blocked`, retaining its existing blockers and
mandatory `local-host-runtime-execution` capability. No profile or capability
becomes implemented, qualified or available merely because this scope is accepted.

### Shared behavior within unchanged owners

Local and server compositions within each product/bounded context reuse:

- domain/application implementations, invariants, commands, queries and narrow
  owned ports;
- public SDK/Connect behavior, resource identities and applicable declared private
  service contracts;
- context-owned PostgreSQL schemas, immutable migrations, SQL mappings,
  transactions and applicable adapter family;
- JetStream adapters, owned inbox/outbox, ordering and recovery semantics;
- one business-behavior conformance suite for each shared capability through its
  applicable profile adapters.

Profile names, Desktop and cloud availability do not select business-rule branches
in domain/application code. Do not fork local/hosted use cases, migration trees
or repositories for identical semantics. Reuse does not merge Platform,
Orchestrator or AR domains, allow another context's table access, or justify an
unowned shared domain, service locator or common universal supervisor.

Composition selects authority adapters and credential bootstrap, protected
endpoints/discovery, connection and resource budgets, filesystem custody,
installation, updates, rollback, backup/restore and operational recovery. Native
OS supervision and Compose/Kubernetes lifecycle remain different adapters with
their own failure evidence. ADR-0114's exact central backend reference and
ADR-0113's module pins remain unchanged by this release-scope adoption.

### Explicit native and hosted Targets

Desktop attached to a hosted Target uses its public Host API, starts no unused
local database, broker, Orchestrator or sidecar, and receives no SQL credentials.
Fully Local is an explicitly selected local Target with its own authoritative
state, protected data root and local authority adapter.

Baseline Fully Local orchestration requires no Agent Teams cloud account, hosted
Platform runtime or managed commercial service. External model/provider
capabilities retain their declared networking requirements. This does not promise
offline inference from every provider. A Target failure cannot trigger silent
local/cloud fallback, cross-Target command retry, state synchronization or
credential reuse that creates another authority.

The Local Supervisor manages native PostgreSQL, `nats-server`, admitted backend
role processes, required `daprd` pairs and other admitted components through
narrow component adapters. The selected `embedded-postgres` approach remains
inside its PostgreSQL adapter. Docker is not an end-user prerequisite.
Supervisor owns availability/deployment lifecycle; application contexts own
orchestration and AR owns provider execution and custody. Supervisor does not
proxy normal public control traffic or contain an orchestration domain.

The service role map and first-feature process isolation adopted by ADR-0114
apply to native local profiles. Shared implementation does not collapse selected
process boundaries or add a sidecar per Agent. Private RPC follows standard
gRPC/Dapr; durable JetStream handlers use their direct adapter and acquire no
sidecar without a real invocation need. Local resource limits require evidence
for supported hardware. Enterprise aggregate concurrency is not a promise that
every Desktop executes thousands of Agents.

### Implementation admission and unresolved workflow

The three reserved local package policy entries remain `deferred` under the
exact OD-021, OD-035 and OD-040 implementation-start gates. This now means
unresolved contracts required for V1, not exclusion from V1. Resolve those
contracts and record the owning materialization decision before creating the
first local packages. Final release qualification follows implementation; it
cannot be required before the code producing its evidence can be admitted.

OD-035 must select and qualify a local durable workflow adapter behind the
existing owned workflow ports for V1. This adoption selects neither OpenWorkflow,
bundled Temporal nor a custom scheduler. Shared application semantics retain
durable restart/recovery, command identity, cancellation, retry and reconciliation.
An in-memory production fallback is not a local profile. The hosted Temporal
boundary remains unchanged. Canonical ADR-0103's scoped initial in-process
adapter over durable feature process state remains its existing sandbox
admission; it does not resolve the general local durable workflow question.

### Evidence for every advertised native release

Existing owning qualification requires protected transport, identity and workload
enrollment, database/broker recovery, actual local AR execution and an explicit
supported OS/architecture matrix. Every advertised Windows/macOS/Linux tuple
needs installed-package evidence for startup, component failure, bounded drain,
restart, signing/integrity, updates, compatible rollback and actual backup/restore.
Native discovery and application/sidecar pairing are exercised on that profile.

Container tests, unrelated platform CI and a working PostgreSQL launcher are
not native release qualification. Qualify shipped update transitions and retain
data/authority fencing under the existing local lifecycle and persistence rules.
Use existing shared-behavior conformance and add checks only for concrete
uncovered native/deployment risks. No extra test framework or duplicate suite is
selected by this adoption.

### Preserved historical records and atomic lifecycle delta

Keep source ADR-0112 at its original identity, path, body and accepted baseline.
Keep all main accepted bodies and existing baseline tuples intact. For canonical
ADR-0087/0090, change only permitted lifecycle fields to `superseded` and identify
this new canonical successor in `superseded_by`. Append this new accepted record
through supported baseline promotion. Its `supersedes` relationship does not
claim to supersede an unrelated source/canonical ID.

The owner's current integration instruction records this fresh adoption.
Historical source acceptance remains at its original date; no source history or
approval assertion is rewritten. Proposed integration alone never activates
supersession. This record's acceptance and predecessor lifecycle changes form
one coherent reviewed change.

## Consequences

- Fully Local remains visible in V1 planning, the registry, navigation and release
  evidence while sharing the same owned application semantics.
- Local workflow, packaging, lifecycle, security, recovery and supported OS
  qualification remain on the V1 critical path. Library selection and generated
  boilerplate cannot replace those obligations.
- Separate deployment adapters preserve authority, credentials, resource bounds
  and distinct failure domains without duplicating business behavior.
- Existing blocked profiles remain unavailable pending evidence; required V1
  scope grants no automatic implementation-start or release approval.
- No runtime package, empty service, new workflow/IAM mechanism, dependency
  upgrade, migration or qualification claim is introduced by this record.

## Rejected alternatives

- Defer Fully Local after V1 despite the owner's explicit scope, or quietly retain
  historical release deferral as current policy.
- Rewrite the accepted source record or canonical predecessors' bodies instead
  of recording a fresh successor with bounded carryforward.
- Fork local/cloud business layers, PostgreSQL migration families or orchestration
  kernels and rely on keeping their fixes synchronized.
- Use a universal launcher/domain supervisor, require Docker for the native
  end-user experience, or depend silently on SaaS to make local appear usable.
- Mark local qualified, unlock packages from roadmap scope, select unresolved
  workflow/IAM, or substitute container results for installed native evidence.
