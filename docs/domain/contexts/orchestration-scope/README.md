---
id: domain.contexts.orchestration-scope
type: bounded-context
status: proposed
owner: orchestration-scope
summary: Model boundary for orchestration tenant and Project identity, authority, admission, runtime bindings, and disposition coordination.
related:
  - ADR-0079
  - ADR-0080
  - architecture.context-map
  - OD-006
  - OD-012
  - OD-019
  - OD-029
blocked_by:
  - OD-006
  - OD-012
  - OD-019
  - OD-029
---

# Orchestration Scope

## Domain vision

Provide one stable, provider-neutral authority for orchestration tenant and
Project scope. Protect admission and terminal retirement while coordinating
owner-local Project disposition without importing external product policy,
runtime internals, or another bounded context's data model.

## Business outcomes and capabilities

- Provision and bind stable orchestration tenant and Project identities.
- Apply exact source-owned restrictions to one authoritative admission gate.
- Manage Project-level runtime placement and binding generations.
- Retire Project identity irreversibly and prevent restore or replay from
  recreating authority.
- Coordinate bounded owner-local disposition obligations and receipts.
- Expose current lifecycle, admission, binding, and disposition projections
  without making projections authoritative.

## Scope

### Owns

- `OrchestrationTenant` and `OrchestrationProject` identity and lifecycle.
- External authority binding slots, source incarnation, and binding revisions.
- Project admission authority, local restrictions, and lifecycle epochs.
- `RuntimeScopeBinding` identity, generation, desired placement, stable AR
  authority-realm/deployment/incarnation references, and opaque AR scope
  references.
- Rebuildable deployment-authority checkpoints and scope-observation projections
  kept separate from binding desired state.
- `OrchestrationProjectDispositionProcess`, participant plans, obligations, and
  opaque owner receipt references.
- The separate runtime-scope disposition feature and its AR-facing consumer
  ports.
- Context-local inbox, outbox, checkpoints, tombstones, receipts, projections,
  and reconciliation.

### Does not own

- Platform Tenant, ProductProject, membership, billing, legal policy, or PII.
- Principal identity, authentication, membership, or grants owned by the
  configured product authority provider.
- Work, Run, Message, Agent Context, Workspace, usage, or notification data.
- AR runtime scopes, sessions, operations, provider effects, artifacts, keys,
  backups, private fences, or technical disposition actions.
- Physical deletion rules for another bounded context.
- Product export or legal-hold case management.

## Ubiquitous Language

- **OrchestrationTenant**: stable non-reusable tenant scope inside Orchestrator,
  bound opaquely to one external authority realm.
- **OrchestrationProject**: stable tenant-scoped orchestration identity whose
  terminal lifecycle is `OPEN -> RETIRED`.
- **ProjectRestriction**: one exact source-owned reason that closes a typed set
  of Project capabilities without clearing other sources.
- **ProjectAdmissionAuthority**: the local versioned gate used by owning use
  cases to admit Project mutations.
- **Retirement epoch**: monotonic Orchestrator fence advanced when Project
  identity becomes terminal.
- **RuntimeScopeBinding**: stable Project-owned association to one AR deployment,
  authority realm, incarnation, and runtime scope, with one active generation
  per binding ID. Endpoint changes inside that lineage do not rebind it.
- **Deployment authority checkpoint**: reconcilable observation of AR-owned
  deployment incarnation and accepted authority generation; it never grants
  authority or advances binding generation by itself.
- **Participant catalog**: release-governed list of owner-local disposition
  capabilities and data categories.
- **Participant obligation**: bounded coordination record for one owner,
  resource lineage, catalog revision, and expected receipt.
- **Owner freeze**: owner-local CAS that closes new Project writes and fixes the
  inventory high-water mark before disposition.
- **Disposition receipt**: immutable owner-authored evidence for one exact local
  obligation; feeds may transport it but do not replace it.

## Invariants and business rules

1. Tenant, Project, binding, restriction, command, and receipt identities are
   tenant-scoped, globally unambiguous, and never reused after retirement.
2. `OrchestrationProject` has one authority owner and one terminal transition.
3. Provisioning, readiness, suspension, disposition, and evidence never become
   Project identity states.
4. Adding or clearing an exact restriction and advancing admission revision is
   atomic; one source cannot clear another.
5. Cancellation and retirement commit have one Project CAS winner.
6. Retirement commit advances deletion epoch, records receipt and process, and
   appends outbox atomically.
7. Project admission, binding creation, rebind, and new owner writes reject a
   stale lifecycle or deletion epoch.
8. Every participant freezes locally before inventory or irreversible action.
9. Detailed disposition evidence remains owner-local. A coordinator stores only
   bounded obligations and opaque receipt references.
10. Unknown outcome, feed gap, missing receipt, provider residue, backup gap, or
    shared-key uncertainty cannot become success.
11. A retired identity cannot be restored by backup, replay, delayed delivery,
    stale worker, or fresh external authorization.
12. External user-owned workspace source is unlink-only.
13. Project disposition detaches shared tenant credentials, routes, accounts,
    and keys; it cannot revoke or erase them for unrelated consumers.
14. Cryptographic erasure requires owner proof of exclusive key scope and full
    encrypted-copy coverage.

## Aggregates and consistency boundaries

### Aggregate decision matrix

| Root and identity | Protected invariants | Commands | Transaction | Concurrency and growth |
| --- | --- | --- | --- | --- |
| `OrchestrationTenant` | Stable identity, authority binding, admission, Project-creation epoch | Provision, bind, restrict, retire | Tenant state, receipt, audit, outbox | CAS; Project fan-out uses bounded pages and index high-water mark |
| `OrchestrationProject` | `OPEN -> RETIRED`, lifecycle revision, deletion epoch | Provision, bind, commit retirement | Project state, receipt, process ref, outbox | CAS; no participant collection |
| `ProjectAdmissionAuthority` | Effective gate and independent restriction ownership | Add or clear exact restriction | Restriction row, gate revision, receipt, outbox | Source revision CAS; restrictions are separate bounded records |
| `AuthorityBinding` | External binding uniqueness and incarnation continuity | Bind, rebind, quarantine | Binding index and receipt | Unique key plus generation CAS |
| `RuntimeScopeBinding` | One active generation and explicit deployment/scope lineage | Provision, activate, rebind, suspend | Binding desired state and outbox | Generation CAS; observations remain projections |
| `DeploymentAuthorityCheckpoint` | Observed AR incarnation/generation continuity without changing desired binding state | Ingest observation, reconcile gap, rebuild snapshot | Checkpoint, inbox, projection revision | AR-owned generation; gap or mismatch fails dispatch closed |
| `ProjectDispositionProcess` | Immutable plan revisions and truthful obligation outcomes | Start, supplement, reconcile | Process revision, obligation work item, outbox | Work items are paged and can be partitioned independently; no unbounded aggregate list |

Provisioning, retirement, and disposition processes may share one physical
database schema initially, but they keep explicit repositories and consistency
boundaries. No transaction crosses another bounded context.

## Tactical building blocks

### Entities and value objects

Candidate value objects include tenant and Project IDs, lifecycle and admission
revisions, retirement epoch, authority realm and source incarnation references,
binding identity and generation, restriction identity and source revision,
catalog revision, immutable plan digest, participant key, obligation status,
command ID, receipt ref, and cursor.

Exact names and public wire representations remain governed by OD-019 and the
owning contract ADR. No external DTO becomes a domain entity.

### Domain services, policies, specifications, and factories

- Admission specification evaluates current lifecycle and authoritative gate.
- Retirement policy verifies exact preconditions for the terminal CAS.
- Binding continuity policy decides rebind, quarantine, or new generation.
- Participant-plan factory resolves one static catalog revision and creates
  bounded work items.
- Disposition completion policy evaluates exact owner receipts without
  reinterpreting them.

Policy resolution for legal hold or retention is an external port and opaque
evidence input, not a domain rules engine inside this context.

### Domain events versus integration events

Domain events describe local transitions such as Project retirement commitment,
admission revision change, binding generation activation, and obligation update.
Published integration facts reveal only stable scope, revision, outcome, and
opaque evidence needed by consumers. Private policy facts, AR fences, raw
provider data, PII, and another context's receipt body do not cross the boundary.

## Commands, events, and errors

Candidate command families:

- provision or bind orchestration Tenant and Project;
- add or clear an exact Project restriction;
- commit or query Project retirement;
- provision, rebind, suspend, or query RuntimeScopeBinding;
- start, supplement, reconcile, or query Project disposition;
- ingest one exact owner receipt;
- submit or query one runtime-scope disposition obligation.

Every mutation has a command ID, canonical digest, trusted tenant and Project
scope, expected owner revision, authenticated caller capability, and declared
audience. Outcomes keep accepted, stale, conflict, not-found-without-disclosure,
unsupported, unknown, and reconcile-required distinct.

## Processes and state machines

Retirement commitment is only `REVERSIBLE`, `COMMITTED`, or `CANCELLED`.
Participant obligations progress independently through pending, executing,
satisfied, policy-retained, unsupported, unknown, or reconcile-required. A read
projection may compose user-facing progress but cannot authorize a command.

The process hierarchy is:

```text
external Platform or Standalone retirement process
  -> OrchestrationProjectDispositionProcess
       -> owner-local Orchestrator participants
       -> runtime-scope disposition per binding lineage
            -> AR TechnicalDispositionPlan
```

## Concurrency and conflict model

- Tenant Project-creation CAS races Tenant retirement and fixes a bounded scan
  high-water mark.
- Project cancel CAS races irreversible retirement commit.
- Restriction add/clear CAS races admission evidence issuance.
- Binding creation or rebind CAS races Project retirement.
- Every owner freeze races queued and delayed writes in that owner's local
  transaction boundary.
- Receipt replay compares exact command ID and digest; different content is a
  conflict.
- Catalog supplements are append-only immutable revisions.
- One strongly consistent writer authority exists per Tenant or Project lifecycle
  partition in v1; multi-region active-active lifecycle requires a new protocol.

## Domain verification scenarios

- Two independent restrictions are applied; clearing one leaves admission
  closed.
- Retirement cancellation and commit race in both orders.
- A delayed owner command loses to the owner freeze or appears below its frozen
  inventory high-water mark.
- Binding generation N+1 races retirement and is either rejected or included.
- Lost acknowledgement recovers by original receipt query.
- Feed duplicate, reordering, and gap never manufacture completion.
- New catalog revision supplements an in-flight process without mutating the
  original plan.
- Restore from an older backup remains fenced by the external retirement anchor.
- External workspace survives while owned execution allocation is disposed.
- Shared credential and key references detach without revoking sibling users;
  exclusive-key and shared-key cryptographic erasure take opposite outcomes.
- Unknown provider, backup, key, or hold evidence remains reconcile-required.

The [Project lifecycle executable specification](../../../../architecture/executable-specs/orchestration-project-lifecycle.json)
proves only the accepted `OPEN -> RETIRED` identity submodel, cancellation before
commit, stale-epoch rejection, and anti-resurrection behavior. It does not model
admission restrictions, disposition progress, policy, or Agent Runtime state and
does not remove this dossier's open-decision blockers.

## Context relationships

- Platform or Standalone Authority is upstream through a private managed
  lifecycle ACL and opaque authority evidence.
- A configured product authority provider supplies identity and grant decisions
  through ACLs implementing feature-owned authorization ports. The exact managed
  or standalone provider topology remains open under OD-012.
- Every Project-scoped bounded context consumes lifecycle and admission facts and
  implements its own disposition capability.
- Workspace Registry owns materialization custody and cleanup.
- Run Orchestration owns Run authority and runtime target inventory.
- Runtime ACL maps only the runtime participant's technical intent to AR.

## Persistence ownership

Orchestration Scope owns its schema or SQLite database, migrations, inbox,
outbox, command receipts, binding indexes, disposition work items, projections,
and tombstones. It does not join or mutate another context's storage. Hosted
repositories require trusted tenant predicates and RLS defense in depth.

## Security and authorization

- Trusted tenant scope comes from authenticated context and canonical binding,
  never payload or workspace configuration.
- Wrong-tenant, stale-epoch, wrong-incarnation, and unauthorized not-found paths
  do not reveal resource existence.
- Tombstones contain the minimum non-sensitive identity and epoch required to
  prevent resurrection.
- Break-glass is capability-scoped, audited, and cannot weaken terminal or
  evidence invariants.

## Open questions

- Exact public resource identity and contract shapes remain under OD-019.
- Identity-provider, grant, and hosted isolation detail remains under OD-012.
- Exact policy source, retention classes, legal holds, and export semantics
  remain under OD-029.
- Concrete aggregate splits and first vertical slice remain under OD-006.
- Cross-system PITR anchor and multi-region lifecycle protocols require
  deployment-specific decisions and qualification.

## Implementation links

No production package exists. The package catalog reserves the future boundary;
materialization waits for the first accepted vertical slice and readiness gates.
