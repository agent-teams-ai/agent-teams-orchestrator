---
id: ADR-0112
type: adr
status: accepted
owner: architecture/composition
summary: Require native Fully Local alongside both server profiles in V1 while preserving shared semantics, Target isolation, and evidence-based release gates.
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
  - ADR-0105
  - ADR-0106
  - ADR-0108
  - ADR-0109
  - ADR-0111
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

# ADR-0112: Fully Local V1 with Shared Backend Profiles

## Context

The product owner explicitly requires Fully Local in V1 on 2026-10-22, alongside
the server profiles, so local operation remains part of implementation planning
from the beginning. The owner also requires shared behavior and clear local and
hosted boundaries, rather than two product implementations that drift.

ADR-0087 excluded Fully Local implementation and qualification from V1, and
ADR-0090 repeated that release scope. Platform already targets local standalone
operation in V1. This decision resolves the release-scope difference without
claiming that either product has implemented or qualified its local profile.

## Decision

### Required V1 profiles and bounded supersession

V1 requires Managed SaaS, Standalone Self-Hosted Server, and native Fully Local
Desktop. The release plan is not complete until the required profiles and their
mandatory capabilities have passed the existing evidence-based qualification.
Implementation may proceed through small vertical slices; the first server slice
does not have to implement every local capability at once. Local contracts and
qualification work remain explicit V1 obligations, not an untracked later phase.

Supersession replaces only the Fully Local release deferral in ADR-0087 and
ADR-0090. Carry forward their remaining requirements: one logical application
core, independent standalone operation, explicit capability negotiation, Target
generation fencing, enrolled local-device execution, Host-issued realtime
authority, and independent product and commercial authority. ADR-0091 and
ADR-0093 continue to govern qualification; ADR-0093 and ADR-0097 continue to
separate package implementation admission from release evidence. Their later
clarifications take precedence over the superseded records' historical wording.

References to server-first or future-local scheduling in other historical ADRs
describe the scope at their acceptance, not a second current release policy.
Their persistence, launcher, role placement, lifetime, and security decisions
remain in force. Connected Self-Hosted remains a separate future profile.

The reliability registry records Fully Local as `releaseScope: v1-target` and
`qualification: blocked`, retaining its existing blockers and mandatory
`local-host-runtime-execution` capability. No evidence entry becomes qualified
merely because this decision is accepted.

### Shared behavior and separately owned deployment mechanisms

Within each product and bounded context, local and server compositions reuse:

- domain and application implementations, invariants, commands, queries, and
  narrow owned ports;
- public SDK/Connect behavior, resource identities, and declared private service
  contracts;
- context-owned PostgreSQL schemas, immutable migrations, SQL mappings,
  transaction semantics, and the applicable persistence adapter family;
- JetStream adapters and owned inbox, outbox, ordering, and recovery semantics;
- one business-behavior conformance suite for each shared capability, executed
  through the applicable profile adapters.

Profile names, Desktop, cloud availability, and infrastructure products cannot
select business-rule branches in domain or application code. Do not introduce
parallel local/hosted use cases, migration trees, or repositories for the same
semantics. Reuse does not merge Platform, Orchestrator, and AR ownership or permit
cross-context database access. It does not justify a generic shared domain
package, universal service locator, or common process supervisor.

Composition selects deployment mechanisms: authority adapters and credential
bootstrap, protected endpoints and discovery, connection/resource budgets,
filesystem custody, installation, updates, backup/restore, and operational
recovery. Native OS supervision and Compose/Kubernetes lifecycle remain separate
adapters. Their different failure domains require separate operational evidence.
The shared central backend reference adopted by ADR-0111 remains unchanged;
this product release decision does not change any dependency or standard pin.

### Native local and hosted Target boundaries

A Desktop attached to a hosted Target uses its public API and starts no unused
local database, broker, Orchestrator, or Dapr sidecar. It receives no SQL
credentials. Fully Local is an explicitly selected local Target with its own
authoritative state, protected data root, and local authority adapter.

Baseline Fully Local orchestration does not require an Agent Teams cloud account,
hosted Platform runtime, or managed commercial service. External model/provider
capabilities retain their declared network requirements; Fully Local does not
promise offline inference from every provider. Target failure never creates a
second authority or triggers silent local/cloud fallback, data synchronization,
credential reuse, or a retry against another Target.

The Local Supervisor manages native PostgreSQL, `nats-server`, selected backend
role processes, required `daprd` pairs, and other admitted local components
through narrow component adapters. `embedded-postgres` remains behind the
selected PostgreSQL component adapter. Docker is not an end-user prerequisite.
The Supervisor owns availability and deployment lifecycle; application contexts
own orchestration and AR owns provider execution and custody.

The role map and first-feature isolation under ADR-0109 apply locally as well as
on the server. Reuse does not collapse selected process boundaries or introduce
one sidecar per agent. Private RPC uses standard gRPC through Dapr, while durable
JetStream handlers use their direct adapter. Local resource limits are qualified
against supported hardware; enterprise aggregate concurrency is not a promise
that every desktop can execute thousands of agents.

### Implementation and release gates

The three reserved local package policy entries remain `deferred` under the
exact OD-021, OD-035, and OD-040 implementation-start gates. This state now means
unresolved contracts required for V1, not exclusion from V1. Resolve those owned
contracts and record the materialization decision before allowing the first
local packages. Final release qualification follows implementation and cannot be
required before creating the code that must produce its evidence.

OD-035 must select and qualify the local durable workflow adapter for V1 behind
the existing owned workflow ports. This decision selects neither OpenWorkflow
nor a bundled Temporal service nor a custom scheduler. Shared application
semantics require durable restart/recovery, command identity, cancellation,
retry, and reconciliation; an in-memory fallback is not a production profile.
The hosted Temporal boundary stays unchanged.

The existing qualification framework and owning decisions still require protected
local transport, identity and workload enrollment, database and broker recovery,
actual local AR execution, and an explicit supported OS/architecture matrix.
Every advertised Windows/macOS/Linux tuple needs installed-package evidence for
startup, component failure, bounded drain, restart, signing and integrity,
updates, compatible rollback, and real backup/restore. Native Dapr discovery and
application/sidecar pairing must be exercised on that profile. Container tests
or a working PostgreSQL launcher alone do not qualify a native release.

Use existing conformance fixtures for shared behavior and add checks only for
concrete uncovered native or deployment risks. This decision changes release
intent and its existing guard expectations; it creates no runtime packages,
empty services, new test framework, or qualification claim.

## Consequences

- Fully Local is visible in the V1 plan, machine registry, agent instructions,
  and release evidence without a separate product codebase.
- Local workflow, installation, recovery, and OS qualification enter the V1
  critical path; their engineering effort is not removed by shared SQL or AI
  assistance with boilerplate.
- Shared semantic code and targeted conformance reduce drift, while separately
  owned deployment adapters preserve meaningful isolation and operating limits.
- Existing unqualified profiles remain unavailable until their required evidence
  passes; the scope decision grants no automatic implementation-start approval.

## Rejected alternatives

- Defer Fully Local until after V1: rejected by the product owner's explicit
  direction to include the complete deployment picture from the start.
- Duplicate local and cloud business layers: repeats invariants and migrations
  and makes later fixes depend on synchronizing two implementations.
- Force one universal launcher or cloud control service into every profile:
  conflates availability, authority, credentials, and different failure domains.
- Require Docker or silently connect to SaaS to make Fully Local appear usable:
  violates the selected native user experience and Target authority boundary.
- Mark Fully Local qualified or unlock reserved packages from this roadmap
  choice alone: bypasses still-open contracts and evidence-based admission.
