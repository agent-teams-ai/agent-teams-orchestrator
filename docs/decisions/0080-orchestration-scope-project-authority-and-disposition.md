---
id: ADR-0080
type: adr
status: accepted
owner: orchestration-scope
summary: Make Orchestration Scope the sole owner of orchestration tenant and Project authority, admission, bindings, and owner-local disposition coordination.
approved_by: product-owner
accepted_at: 2026-08-02
related:
  - ADR-0044
  - ADR-0055
  - ADR-0079
  - architecture.context-map
  - domain.contexts.orchestration-scope
  - OD-012
  - OD-029
---

# ADR-0080: Orchestration Scope Project Authority and Disposition

## Context

The proposed Tenant and Project Registry and the proposed Orchestration Scope
assigned overlapping ownership of orchestration tenant and Project identity,
lifecycle, runtime placement, and admission. Keeping both would create two
authorities for Project state and force every downstream context to decide which
revision or deletion epoch controls a mutation.

At the same time, a hosted Project owns data across Work Coordination, Run
Orchestration, Agent Communication, Agent Context, Workspace Registry, usage
capabilities, projections, and one or more AR runtime scopes. The external
Platform cannot enumerate those internal owners, while the narrow runtime-scope
disposition feature cannot claim whole-Orchestrator completion.

AR ADR-0003 already separates scope admission, cutoff, provider containment,
effect reconciliation, and technical disposition. The Orchestrator needs the
same ownership discipline at its Project boundary without importing AR state or
building a global deletion service.

## Decision

### One bounded context owns orchestration scope authority

Accept `Orchestration Scope` as the sole bounded context for:

- stable `OrchestrationTenant` and `OrchestrationProject` identities;
- external authority bindings and lifecycle epochs;
- coarse Project admission authority;
- Project-level runtime placement and `RuntimeScopeBinding` generations;
- whole-Orchestrator Project disposition coordination;
- runtime-scope disposition intent and AR receipt references.

The earlier proposed Tenant and Project Registry boundary is superseded. Its
identity and lifecycle responsibilities move into Orchestration Scope rather
than surviving as a second context. Historical accepted ADR references to the
old proposal remain historical terminology; current architecture, topology,
package reservation, glossary, and open decisions use Orchestration Scope.

ADR-0055's phrase `Access Control owns product authorization facts` names a
logical provider responsibility, not an accepted mandatory internal bounded
context. Managed or standalone compositions supply a configured product
authority provider; each consuming feature owns its authorization port and
operation-specific invariants. Exact principal binding, grant, revocation, and
provider topology remains open under OD-012.

This acceptance establishes the strategic boundary. The detailed dossier
remains proposed until Full DDD discovery closes its aggregate and contract
questions. No production package is created before the first accepted vertical
slice.

### Identity lifecycle, readiness, and access are separate

`OrchestrationProject` owns one terminal identity transition:

```text
OPEN -> RETIRED
```

Provisioning progress, binding readiness, runtime health, access suspension,
disposition progress, and deletion evidence are separate processes or
projections. `RETIRED` means that the orchestration identity and authority are
terminal and non-reusable; it does not assert physical erasure.

The context owns a separate `ProjectAdmissionAuthority`. Independent normalized
restriction facts carry an exact restriction identity, source, capability scope,
source revision, and status. Their semantics remain source-owned. Orchestration
Scope owns only the effective local gate and admission revision used by
Orchestrator mutations.

Adding or clearing one restriction and advancing the gate revision is atomic.
One source cannot clear another source's restriction. `SUSPENDED` is a read
classification and never a mutation precondition. Every owning use case checks
trusted tenant and Project scope plus current lifecycle and admission evidence;
stale, unavailable, or gapped evidence fails closed.

### Retirement commitment has one linearization point

The external Platform or Standalone Authority owns the product retirement
decision. A stateless Managed Lifecycle ACL maps that decision to an
Orchestrator-owned command without importing Platform domain types.

Within Orchestration Scope, cancellation and irreversible retirement commit
serialize through one `OrchestrationProject` CAS. A winning commit:

- compares the current Project lifecycle, admission, and external binding
  preconditions;
- sets the identity to `RETIRED`;
- advances the Orchestrator-owned deletion epoch;
- fixes the runtime-binding index high-water mark;
- records the command receipt and disposition operation;
- appends the outbox record;
- commits atomically.

The identity never reopens after this commit. A future re-onboarding creates a
new Project identity and bindings. Platform retirement revision, Orchestrator
deletion epoch, and AR scope revision remain distinct fences and are only
correlated through typed evidence.

### Whole-Project disposition is a narrow process manager

`OrchestrationProjectDispositionProcess` belongs to Orchestration Scope because
OrchestrationProject lifecycle supplies its initiating intent and epoch. It
stores only:

- disposition operation and canonical request digest;
- immutable policy and catalog references;
- participant-plan revisions;
- bounded participant obligations and opaque receipt references;
- retry, deadline, gap, and reconciliation state.

It never reads or writes another context's tables, invents another owner's erase
rules, interprets legal policy, or becomes a canonical evidence repository.
Detailed receipts remain owner-local. An overall completion view is a projection
over exact obligation receipts.

Each participating context exposes a narrow owner-local disposition capability.
It first commits a Project freeze against the expected deletion epoch and its
own revision, closes queued writes, and fixes an inventory high-water mark. It
then inventories, erases, anonymizes, unlinks, retains, or proves absence only
for the data it owns.

Participant obligation outcomes distinguish at least:

```text
PENDING | EXECUTING | SATISFIED | POLICY_RETAINED
| UNSUPPORTED | UNKNOWN | RECONCILE_REQUIRED
```

There is no global `QUIESCING -> DISPOSING -> VERIFYING` domain state because
participants progress independently. `UNKNOWN` and `RECONCILE_REQUIRED` are
durable non-terminal conditions and never success.

### Runtime disposition is one participant

The existing runtime-scope disposition feature remains separate inside
Orchestration Scope. For every active or historical `RuntimeScopeBinding`
generation and deployment incarnation inside the resurrection horizon, it maps
the approved Orchestrator technical intent through a stateless Runtime ACL to an
AR-owned immutable `TechnicalDispositionPlan`.

AR owns runtime scope, sessions, operations, output, artifacts, provider state,
worker residue, keys, backups, private fences, category actions, and technical
receipts. The whole-Project process observes one bounded runtime participant
obligation per binding lineage; it does not import AR categories or private
state.

A rebind racing retirement either loses the Project lifecycle CAS or is included
under the fixed binding high-water mark. One AR receipt can never prove complete
Orchestrator Project disposition.

### Catalog and compatibility are release-governed

The participant and data-category catalog is static, typed, versioned, and
reviewed with each release. Runtime discovery of arbitrary disposition plugins
is forbidden.

A new Project-scoped writer cannot be released until it:

- registers its owner and categories in the catalog;
- rejects or safely handles retired deletion epochs;
- supports owner-local Project freeze;
- returns a disposition or verified-absence receipt;
- supplies restore, replay, and delayed-delivery conformance fixtures.

An in-flight process pins its catalog revision. A newly mandatory participant is
added through an immutable append-only supplement rather than changing an
existing plan. Rolling upgrades keep compatible handlers for supported prior
plan, command, and receipt revisions through the declared retirement horizon.

### Policy and irreversible actions

Orchestration Scope carries only normalized technical intent and opaque policy
evidence. Product retention, legal-hold, jurisdiction, export, and compliance
semantics remain external under OD-029.

An immutable policy snapshot defines the requested plan but does not permanently
authorize later erasure. Each owner requires a fresh typed last-mile erase
authorization before an irreversible action. Unknown or changed hold evidence
means retain plus reconcile; it never reopens admission.

No Data Governance bounded context, generic lifecycle framework, dynamic policy
engine, or shared cleanup package is introduced in v1. Such a context requires a
future ADR after independent governance language and use cases are proven.

### Receipts, restore, and operator authority

Every mutation carries one command ID and canonical digest. Exact replay returns
the original durable receipt; reuse with different content is a conflict. A feed
may announce progress but is not completion authority. Gaps and lost
acknowledgements recover through exact receipt query or replay.

Deletion epochs and minimal non-sensitive tombstones survive the maximum retry,
callback, replay, stale-writer, backup, and PITR horizon. Hosted restore keeps
admission closed until it compares restored state with a monotonic retirement
anchor outside the restored backup domain and reconciles all newer epochs.
Standalone profiles use protected state outside ordinary SQLite and document
their full-machine rollback limitation.

Break-glass can fence, revoke, stop, quarantine, retry, and reconcile. It cannot
clear policy holds, rewrite receipts, erase required evidence, reopen a retired
identity, or declare disposition complete.

### Workspace and tenant rules

- External user-owned workspace source is unlink-only.
- Workspace Registry alone disposes system-owned clones, working trees, snapshots,
  and execution allocations; AR owns runtime sandboxes.
- Project disposition detaches a shared tenant credential, provider account,
  route, or key reference but cannot revoke or erase the shared resource for
  unrelated consumers. Its owning context returns exact retained/detached
  evidence.
- Cryptographic erasure is valid only when the owner proves exclusive key scope
  and coverage of every required encrypted copy, replica, journal, snapshot, and
  backup. Shared, deduplicated, or incompletely inventoried key scope forbids it.
- Principal deletion never retires a Tenant or Project.
- Tenant retirement first closes Tenant admission and Project creation by CAS,
  fixes a Project-index high-water mark, and fans out Project retirement in
  bounded pages.
- Private customer content is not cross-tenant deduplicated in v1.
- Shared credentials are detached rather than revoked for other consumers.
- Cryptographic erasure requires proven exclusive key scope and complete copy
  coverage.
- Provider `not_found` is not deletion evidence.

## Consequences

- Downstream contexts receive one stable orchestration tenant and Project
  authority instead of choosing between overlapping contexts.
- Project identity, admission, runtime bindings, whole-Project coordination, and
  runtime-scope participation have one Ubiquitous Language but remain separate
  aggregates and features rather than one god aggregate.
- Platform sees Orchestrator as one participant; AR remains hidden behind the
  Orchestrator-owned lifecycle and Runtime ACL boundaries.
- Owner-local freezes, receipts, and reconciliation preserve context isolation
  and future service extraction.
- More durable obligations and compatibility work are required, but new data
  owners extend a catalog and local capability rather than changing the domain
  boundaries.
- Managed Shared SaaS cannot qualify without tenant/Project disposition
  isolation and anti-resurrection evidence. Dedicated, customer-cloud, Hybrid, and
  multi-region active-active disposition remain profile gates.

## Rejected alternatives

- Keep Tenant and Project Registry and Orchestration Scope as independent
  authorities.
- Assign whole-Project disposition to the runtime-scope feature.
- Let Platform enumerate Orchestrator or AR data owners.
- Use one global lifecycle enum, evidence aggregate, cleanup service, workflow
  engine, or distributed transaction.
- Treat an immutable policy snapshot, feed update, provider `not_found`, or
  accepted downstream command as proof of erasure.
