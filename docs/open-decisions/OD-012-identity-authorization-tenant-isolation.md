---
id: OD-012
type: open-decision
status: open
owner: architecture/security
summary: Define principal, authorization, service identity, and hosted tenant-isolation semantics.
related:
  - ADR-0117
  - architecture.context-map
  - domain.contexts.access-control
  - domain.contexts.orchestration-scope
  - ADR-0021
  - ADR-0079
  - ADR-0080
  - OD-031
  - OD-032
  - OD-011
  - ADR-0103
  - architecture.implementation-readiness-gates
  - contract.migration.desktop-first-slice.v1
  - research.identity-provider-comparison-2026-10-21
  - research.iam-critical-decisions-review-2026-10-23
---

# OD-012: Identity, Authorization, and Tenant Isolation

## Decision required

Define principal types, tenant/project membership, service identities,
authorization checks, API authentication, secret references, and hosted isolation.

## Constraints

A configured product authority provider owns external principal, membership,
grant, and external Tenant or Project lifecycle facts. Orchestration Scope owns
stable provider-neutral Orchestrator scope identity, binding, admission, and
disposition coordination. Every application feature owns the authorization port
and business invariants it consumes; ACLs translate provider decisions without
becoming durable authorities. This decision selects the managed and standalone
provider topology and which operations require authoritative synchronous
decisions or bounded local projections, including revocation and fail-closed
behavior.

ADR-0021 fixes the client boundary:

- clients and tenant/project subclients are immutable;
- an asynchronous credential provider owns token refresh and secure persistence;
- actor, subject, client, tenant, and delegation facts come from verified auth
  context, never business payloads;
- SDK and domain/application code never store raw credentials;
- audience, resource, scope, tenant, and delegation participate in credential
  cache isolation.

This decision still selects concrete identity providers, grant flows, token
validation, revocation propagation, service identities, and authorization
consistency.

The selected private RPC profile also needs authorized workload enrollment.
Self-hosted Sentry's default insecure validator is not evidence that a caller
is entitled to a service identity. Qualification under the
[private RPC trust profile](../architecture/security-architecture.md#private-rpc-trust)
binds workload identity, protected application/sidecar hops, credential
rotation, and negative bypass fixtures. This service enrollment is separate
from product membership and OD-038 device enrollment; selecting Dapr does not
resolve any of those authority decisions.

OD-031 separately owns semantic claim admission and conflict resolution. The
configured authority provider determines whether a principal may attempt an
operation; it does not
decide whether a Jira observation, agent statement, comment, or model summary is
the accepted business fact. OD-032 separately owns the final pre-side-effect
enforcement chain. Neither concern may be absorbed into one authorization
god-service.

An isolated real-Connect security spike passed 43/43 assertions in three runs. It
proved exact-scope credential cache keys, 100-way single-flight refresh,
compare-and-invalidate after concurrent authentication failure, one bounded forced
refresh, durable stream reconnect, per-boot local credential rotation, and
transactional cursor signing-key rotation. It also exposed a required
minimum-usable-lifetime guard and same-checkpoint auth-churn circuit breaker.

KMS/keychain custody, multi-replica revocation, browser cookie/CSRF behavior, and
distributed clock skew remain open.

A PostgreSQL tenant-isolation spike passed 40/40 checks against PostgreSQL 18.4
and `node-postgres` 8.22.0. It proved that session-level tenant `SET` leaks across
pooled borrowers, while transaction-local binding clears on commit and rollback.
It also proved that table owners bypass ordinary RLS, `FORCE ROW LEVEL SECURITY`
constrains non-bypass owners, and `BYPASSRLS` remains globally privileged.

The accepted persistence constraint is therefore application-enforced tenant
predicates plus hosted PostgreSQL RLS as defense in depth. Runtime, migration, and
elevated maintenance use separate pools and credentials. This evidence does not
select identity providers, grant flows, token validation, or revocation policy,
so this decision remains open.

The retained `PostgreSQL tenant isolation` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

## Provider direction and qualification

The owner's provisional direction is **Keycloak plus OpenFGA**, with ZITADEL plus
OpenFGA retained as the strongest alternative. The dated findings, complete
primary references, comparison scores, and bounded estimates are preserved in
the [provider research report](../research/identity-provider-comparison-2026-10-21.md).
This is not an accepted provider ADR or an implemented integration. OD-012
remains open until the selected slice, identity lifecycle, administrative
boundary, and failure behavior are qualified.

The confirmed baseline permits one human to hold independent memberships in
customers A and B; ending A must preserve B and stable identity. Organization-
specific mandatory SSO and SCIM are separate enterprise growth qualifications.
Neither IAM membership nor an OpenFGA tuple replaces product-owned permission,
Team, Work, Task, grant, or lifecycle policy. The same reusable provider mechanism
must support independent standalone and managed compositions through narrow
consumer-owned ports; standalone operation must not depend on commercial
Platform. Get Modular composition remains owned by ADR-0117, and service topology
remains outside this provider decision.

### Owner-selected directions — 2026-11-26

The owner endorsed the recommended answers in the [18-question follow-up](https://github.com/agent-teams-ai/engineering-research/blob/578b166650b916efa51f011598a42fabadaeff2f/evidence/imports/iam/iam-open-decisions-review-2026-10-28.md)
and requested preservation of the alternatives. The table records the selected
directions with their original first-scope and future-growth conditions; the
archive preserves all options, /10 scores, estimates and historical status.
These selections are product planning input, not an implementation instruction,
provider qualification or retroactive acceptance of every research statement.
OD-012 remains open for its exact contracts and evidence. A subsequent owning
ADR records the selected boundary before dependent production implementation;
it must not silently reopen these choices or rewrite accepted ADR history.

| Question | Selected direction | Remaining owner/evidence boundary |
| --- | --- | --- |
| 01 | Configured product authority stores memberships and rich grants in its PostgreSQL; Keycloak authenticates; OpenFGA projects needed relations. | One writer per fact; no shared business DB or second ACL grant ledger. |
| 02 | Independent common account first; scoped corporate authentication/recovery is the enterprise target. | A-controlled login/recovery must not open B. Identity D3-A now selects progressive independent proof; exact protected-surface parameters and mechanism qualification remain open. |
| 03 | One owner for personal Fully Local, with protected Desktop/CLI enrollment; server self-hosted profile for collaboration. | Stable principal, first-owner claim, rotation and lost-key recovery still need qualification; no allow-all/cloud prerequisite. |
| 04 | Versioned fixed roles and bounded explicit permissions/grantable sets first. | Exact capability catalog and later custom-role need remain product-owned. |
| 05 | Separate Agent-version edit, activation and authority binding. | Agent and Access owners qualify every authority-changing configuration path. |
| 06 | Finite human delegation; administrator-issued organization autonomy first. | Bounded templates are a later growth option, not transitive delegation or automatic renewal. |
| 07 | Authoritative sensitive checks, declared bounded freshness for eligible reads, fail-closed uncertainty. | No numerical SLO or the Identity plan's candidate 60 seconds accepted here. |
| 08 | Atomic single-use approval/budget consumption at the owning operation. | OpenFGA eligibility is not reservation; unknown external outcomes retain reconciliation. |
| 09 | Close affected disclosure and rebuild authorized context after access narrows; isolated sensitive contexts. | Context owner handles lineage; no claim to erase already disclosed knowledge. |
| 10 | Exact-action approvals and execution recheck, starting with one dangerous effect. | OD-032 retains detailed approver, expiry and execution policy; no universal approval engine. |
| 11 | Redacted diagnostics and reducing emergency authority by default. | Temporary customer-authorized support access is future need; recovery remains separately owned. |
| 12 | Product-owned BFF, server-held tokens, protected cookies and exact Target binding. | Browser/CSRF, two-replica refresh and session-scope contracts remain evidence gates. |
| 13 | Verified workload identity plus audience-bound product context at actual service boundaries. | Preserve Dapr trust/enrollment requirements and feature authorization; mTLS alone is insufficient. |
| 14 | Distinct personal/organization connections and separate connect/configure/use rights; one provider first. | OD-034 owns connection and secret custody; no implicit secret disclosure. |
| 15 | Shared FGA store for the first measured authority/environment envelope, with explicit scope and limits. | A narrow routing boundary permits later measured separation; no speculative fleet manager. |
| 16 | Restore with admission closed, reconcile continuity and projections before reopening. | Unprovable continuity needs explicit recovery/new Target; local full rollback cannot be detected from rolled-back evidence alone. |
| 17 | Offboard-to-rehire starts a new membership period with baseline roles only; sensitive grants need fresh decisions. | Access and Authority owns policy; provisioning applies it. Principal lifecycle remains with Identity. Temporary suspension differs. |
| 18 | Bounded personal queue with current authorization before disclosure/counts/pagination and Task deduplication. | Work/query owner qualifies search/cursor semantics; no authorization filter after disclosure. |

The [expanded Identity plan](https://github.com/agent-teams-ai/identity/blob/deb399260bea43e8486e2b6c2c35efeb659e572e/docs/plans/identity-service-implementation-plan.md) is compatible with these directions:
central AccountId, authentication bindings and global lifecycle remain separate
from product principals, memberships, grants, Task/Run authority and SCM secrets.
The service is not an unconditional dependency of Standalone or Fully Local.
Managed Platform and standalone authority may use the same narrow mechanisms
under independently configured trust; neither imports the other's domain/DB.

Before a future Identity integration is admitted, the product owner maps global
logout, account suspend/close and consumer detach separately from local principal
disable, membership end, exact grant/delegation revoke, API-key compromise and
Run sponsorship. Preserve ADR-0079: subject-bound authority and tenant-autonomous
authority have different causes of suspension, and AR owns actual containment.
An account-status lease is not proof of a current resource grant or a stopped
runtime effect.

Identity D3-A now records the owner's selection of progressive independent
proof before protected organizational access, while preserving ordinary
GitHub/GitLab login. Actual session-bound assurance, independent recovery and
the protected resource/action map still need implementation and qualification;
a public provider hostname or mutable factor-enrolled flag is insufficient.
D8 separately retains the finite scope/bound of native per-session logout with
lost delivery. D3 selection neither resolves D8 nor accepts a numerical SLO.

## First IAM implementation increments

The owner requested a finite implementation handoff on 2026-11-26: build the
retained architecture in small useful increments, without implementing all
future capabilities first. This section scopes OD-012 work; the existing
[readiness gates](../architecture/implementation-readiness-gates.md#incremental-implementation-route)
remain the single implementation-admission record. It does not accept a new
production authority provider, principal package or public SPI.

| Increment | Deliverable and owner | Entrance and completion |
| --- | --- | --- |
| I0: existing sandbox authority | Feature owners exercise the exact ADR-0103 flow with one seeded human, existing Agent/profile, test-only Project and bounded synthetic authority. | Contract fixtures can proceed now. New business assembly also needs the bounded Get Modular foundation and applicable role gate. Cover every exposed command, read, feed, MCP call and receipt replay; synthetic credentials never reach a production Target. |
| I1: first real-authority contract | Work Coordination's existing `GetTask` semantics consume one direct-human Project-scoped read decision through a narrow port. Configured authority supplies principal and grant facts. | Implement the proposed fixture below now; admit the exact principal/provider/contract slice before its production adapters. Finish one common conformance corpus, a standalone provider and managed-provider mapping; qualify each real composition separately. |
| I2: first collaboration authority | Extend to the actual exposed Team/Task commands, reads and administration needed by the first collaborative server release. | Add fixed capability/role/grantable catalogs and each feature's own checks, including authorized result replay. Write admission, list/count/cursor disclosure and browser sessions need their own evidence before exposure; I1 alone does not qualify them. |
| I3: execution authority | Run, Agent, Context and AR owners admit the selected execution/delegation and dangerous-effect paths. | Apply ADR-0079, OD-032 and actual Runtime contracts. This is required before the MVP performs those effects, rather than an optional safety feature deferred after execution. |
| Managed integration | Platform implements its narrow source authority and composite scope-admission adapter against the same consumer semantics. | Platform's owner-local work can proceed independently. A real managed profile needs its exact API/SPI and conformance; standalone never waits for the complete Platform or cloud Identity release. |

I0 is the complete bounded surface in the
[sandbox contract](../contracts/desktop-runtime-migration-admission-v1.md),
not permission to put an unconditional allow on handlers outside the first IAM
test. I1 is an integration increment, not the entire MVP. The integrated
[product target](../research/orchestrator-mvp-research-and-collaboration-2026-11-08.md#product-direction-and-delivery-scope)
still needs its subsequent Work/Run/Communication increments. Fully Local
remains required within V1 under ADR-0115, through its own OD-040 path.

The first implementing-agent assignment is the I1 deterministic contract
fixture, independently of production integration: add a bounded
`task-read-authority-v1.test.ts` under `scripts/orchestration-specs/`, using the
existing Task golden semantics and the cases below. Keep candidate types private
to that fixture; do not scaffold product packages or export an SDK from it.
Bind the file to the existing strict TypeScript project, `specs:model` command
and required test-coverage identities rather than leaving it undiscovered.
Use explicit clocks and independent expected outcomes, with no network, real
user data or provider credentials. Run `pnpm specs:model` and the applicable
changed/fast/full gates. Deliver the typed candidate, positive/negative results
and remaining production-admission inputs to the existing OD-012/readiness
record; fixture success cannot mark the real-provider gate passed. Foundation
qualification and the already-planned Identity work can proceed in parallel.

### First real-authority contract candidate

Use the existing `TasksService.GetTask(GetTaskRequest{name}) -> Task`
[golden contract](../../scripts/orchestration-specs/fixtures/desktop-first-slice-v1/agentteams/work_coordination/v1/tasks.proto).
It is admitted for the sandbox scope, not already a published production RPC.
No new Project metadata API or permission-management UI is required for I1.
The proposed application port name is `TaskReadAuthorityV1`; its owner is Work
Coordination. This semantic draft guides typed fixtures, not a new credential
format or frozen Protobuf schema.

Scope is one authenticated human acting directly, one configured authority
realm per invocation, one canonical Tenant/Project binding and one exact Task
resource. A direct Project grant permits only the named task-read capability.
Membership alone grants nothing. Service/agent actors, delegation, group
inheritance, wildcard permissions, lists and feeds are unsupported by this
first port. They are not globally removed from the product.

| Contract part | Required semantics for the fixture and owning contract |
| --- | --- |
| Trusted invocation | Unique invocation reference, verified human actor and equal subject, authenticated client, configured authority realm/incarnation, principal-binding revision, assurance proof and its original finite expiry. Inbound adapters derive these facts; public request payloads cannot create them. |
| Resource | Exact canonical `Task.name`, Orchestrator Tenant/Project, opaque authority Tenant/Project references and the current authority-scope binding revision. Work checks actual resource ownership; Platform cannot assert Work state or Orchestrator admission revisions. |
| Decision request | Explicit version and one typed task-read action, intended receiver and invocation deadline. No generic arbitrary action string or provider DTO enters the Work domain. |
| Allowed result | Same invocation, receiver, actor/subject/client, exact resource and scope binding; source evidence references; observation time, finite validity and audit reference. The receiver compares them to its trusted request before disclosure. |
| Other results | Typed denied, insufficient-proof, stale, indeterminate, unavailable or unsupported outcome. None discloses Task content or silently falls back to another provider. |
| Source evidence | Exact principal/binding lifecycle evidence, membership period and revision, direct grant identity/revision, policy/model identity and source incarnation. A provider may assert only facts owned by it or evidence obtained through the corresponding owner's port. |
| Consumer boundary | Work owns resource resolution, its local lifecycle/admission and disclosure conditions. The ACL translates only; it does not write membership/grant facts or retain a second authority ledger. |

Use validated exact representations for revisions and instants under the
existing persistence/contract rules. An allowed result belongs to one
invocation; it is not a bearer token, a reusable grant, permission for another
handler or a global account-status lease. Public error mapping must not expose
whether an unauthorized Task exists. A managed network receiver independently
validates workload, audience and human proof; a service token plus an arbitrary
subject field is insufficient.

#### Principal binding and lifecycle candidate

Authentication and product-principal binding remain distinct. For standalone
server, verified configured issuer and subject map to a stable local product
principal without requiring cloud Identity. Managed integration maps the
configured Identity issuer/incarnation and AccountId to PlatformPrincipalId.
Never link by email, display name, an IdP hint or a browser-selected issuer.
Personal Fully Local has a separate protected enrollment/recovery contract in
OD-040; server OIDC qualification does not qualify that local contract.

The proposed Orchestrator registry binds authority realm/incarnation plus its
opaque principal identity to stable Orchestrator authorship. Tenant membership
is a separate relationship, so ending membership in A does not erase the human
or their independent B relationship. Bindings have unique source keys,
revisions and retained history; restoring a different source incarnation or
replacing an external identity never silently claims the former owner's data.
OD-011/OD-012 must accept this narrow ownership and package route before
materializing it; no new generic Identity context is accepted by this text.

| Owned fact | Minimum transition and concurrency rule |
| --- | --- |
| Product principal/binding | Identity owner distinguishes active, suspended and retired identity/binding. Revisions are monotonic; stable identity is not reassigned. Access consumes lifecycle evidence through a port, never a foreign database transaction. |
| Membership period | Access owner distinguishes active, temporarily suspended and ended. An ended period cannot be reopened by a delayed enable; rehire starts a new period. |
| Direct grant | Bind exact principal, membership period, Project scope, capability, policy version and finite validity. Revoke/expiry cannot be undone by writing over the same grant identity. A replacement grant has its own identity and explicit dependency on the current membership period. |
| Owner-local mutation | Require expected revision and stable command identity. Mutation, command outcome and outbox commit together inside the owning consistency boundary. Duplicate same intent replays; a conflicting intent or stale revision has no effect. |
| Cross-owner state | Use owned ports and bounded evidence, never a joint Identity/Access/Work transaction. Source revisions form an explicit evidence vector; there is no invented global authorization revision. |

Rehire receives only the selected baseline policy, with fresh decisions for
sensitive grants. A temporary suspension can resume the same period, but does
not extend an expired grant. Administrative lifecycle commands and fixtures may
qualify this model before a public administration UI exists; they must not
become an unprotected production back door.

#### Source truth, projection and freshness

For the selected Keycloak/OpenFGA direction, the conservative I1 candidate is:
current source grant predicate **and** matching projection evidence **and** FGA
allow **and** Work's local disclosure conditions. OpenFGA cannot create a right
missing from the configured authority's source facts. For a single direct
grant this costs extra calls and may temporarily deny valid access; its purpose
is to qualify the chosen projection boundary before richer relationships.

- Access owns grant/membership changes, outbox and projection acknowledgements.
  The publisher uses a distinct immutable proof identity for the exact grant
  revision and its dependencies. A stale write cannot overwrite a successor
  proof, and acknowledgement CAS cannot mark that successor projected.
- Evaluation uses the exact store, model, source incarnation and proof identity.
  Missing projection or an unknown gap fails closed. Cache bypass alone does
  not prove that the graph contains a source change.
- After the external graph check, revalidate the current grant/membership
  predicate and matching evidence vector, including still-valid external
  identity/assurance evidence. A change causes rejection or a bounded fresh
  evaluation. An old graph allow cannot defeat a current source revocation.
- The first profile has no reusable positive decision cache. Source or graph
  outage never reuses the last allow and never switches managed authority to
  a local owner. An ACL has no durable projection queue or grant store.
- A read still has a finite interval between last authority observation and
  disclosure. Specify its deadline, original proof expiry and clock-skew bound
  before production exposure; delayed delivery does not restart validity.
  No zero-window revocation guarantee or product-wide numeric TTL is implied.

Product-defined fixed role templates map to explicit capabilities at the
authority owner. A Keycloak role/organization claim is not a replacement for
current product grants. The same technical OIDC, FGA-client and conformance
mechanisms should have one implementation usable by independently composed
providers; product policy, principal records and databases stay with their
owners. Do not publish a universal IAM framework to implement this one check.

#### First conformance corpus

| Case | Required independent expected result |
| --- | --- |
| Direct access | Current human proof, active membership, explicit grant, exact Project/Task and current projection allow disclosure. Membership without grant denies. |
| Isolation | Wrong issuer, realm, audience, client, Tenant/Project, Task scope or Target generation denies before content disclosure; caller payload cannot change trusted identity. |
| Binding/lifecycle | Suspended principal, ended membership, stale binding or changed source incarnation denies. Rehire does not revive an old grant; A removal preserves independently authorized B. |
| Revoke and grant again | Current source revoke defeats a delayed FGA allow. A delayed predecessor event/ack cannot reopen the old grant or disable the independent successor. |
| Projection failure | Missing proof, stale model, reordered/duplicate delivery, restart and acknowledgement loss never produce an unsupported allow; recovery converges under the owning publisher. |
| Freshness | Expired assurance, an elapsed invocation deadline, changed source vector or unavailable provider produces a typed non-allow; no cached-allow fallback. |
| Provider substitution | Independently wired standalone and managed adapters pass the same consumer semantics; standalone works without Platform/cloud Identity. A fake managed provider proves only the contract, not real managed integration. |
| Surface containment | Only qualified actions are enabled in a real composition. Sandbox credentials remain test-only. Negative GetTask tests do not qualify CreateTask, lists, feeds, Run admission or MCP agents. |

Before dependent production adapters, record a narrow owning ADR with the
principal-binding topology, exact first capability, provider/package owners,
API/SPI/schema versions and selected read-freshness parameters. Attach the
producer and consumer fixtures and qualify the actual authentication adapters.
The whole OD-012 can remain open for later capabilities. Numerical parameters
and exact artifact versions must be supplied in that bounded record; an agent
must not invent defaults or wait for unrelated enterprise design.

The next write increment uses existing `CreateTask` metadata semantics and
must define the authority-decision-to-Work-commit interval, current replay
authorization and source-revocation race before opening that handler. I1's
read proof does not establish write or runtime-effect safety.

### First contract alternatives and estimate boundary

These are alternatives for the first real-authority conformance increment,
not three new MVPs. Prefer A while the current source and adapter assumptions
hold; B is useful if a write demonstration is essential, and C if all its
feature owners are already ready. No alternative skips required safety checks.

| Option | Confidence / reliability / complexity, each out of 10 | Production/integration LOC | Tests/fixtures LOC | Engineer-days |
| --- | --- | --- | --- | --- |
| A: exact `GetTask` with direct human grant | 9 / 8 / 5 | 1,500–2,800 | 900–1,700 | 8–16 |
| B: `GetTask` plus metadata `CreateTask` and its commit/replay contract | 8 / 8 / 7 | 2,200–4,200 | 1,300–2,500 | 12–23 |
| C: real authority for the complete already-admitted sandbox surface together | 6 / 8 / 9 | 4,500–8,500 | 2,500–5,000 | 25–45 |

These are unmeasured estimates with sizing confidence 3/10, assuming existing
owner contracts and a qualified module foundation. P covers the bounded
consumer port, provider/ACL integration and source/projection slice; T covers
the respective contract and failure corpus. Exclude the shared Identity
service, UI/BFF, general administration, Run/Task engine implementation,
generated code, vendor code, SQL/infrastructure setup and release operations.
Do not add alternative totals or duplicate overlap with Identity's estimate.
All three require their declared threat/failure scope to pass; reliability
scores do not certify a running system. Current documentation adds zero
production or test code.

### Deferred scope and extension seams

Corporate SSO/SCIM breadth, custom roles, nested grant inheritance, delegation
templates, cross-organization federation, support impersonation, FGA sharding
and positive-cache fast paths do not block I0/I1. Exact delegated agent
authority, protected lists/feeds and dangerous-effect approvals are deferred
only until the first increment that uses them, never after those surfaces ship.
Fixed-role limitations must be visible; unsupported capabilities fail closed.

Preserve stable identities, membership periods, source incarnations, typed
feature ports, owner-local transactions/outbox and versioned contracts from
the first retained code. New principal/capability variants must not widen old
sessions or grants. Future enterprise or managed adapters may require explicit
schema/contract migrations; this architecture avoids a second business engine,
not all future refactoring. No empty contexts, all-purpose authorization bus or
complete plugin/scale fleet is required to start the bounded work.

## Remaining IAM decisions and evidence

The [critical-decisions review dated 2026-10-23](../research/iam-critical-decisions-review-2026-10-23.md)
extends the provider comparison with the following unresolved contracts and
qualification questions. Its dated scores, estimates and unselected alternatives
remain research. The owner-selected direction table above records the later
endorsement; it does not accept an implementation or qualify the preferred stack.

- Shared-account login, account linking, factors, and recovery need an explicit
  trust boundary. Removing membership in A does not prove isolation from A's
  corporate IdP or mailbox when the same person retains access in B.
- Customer administration and SCIM need relationship-scoped lifecycle rules,
  including global credential and recovery writes, delayed reactivation, and
  the continuity of grants after a person is enabled again.
- Fully Local needs a selected authority scope, protected enrollment, stable
  principal custody, rotating boot credentials, and lost-key recovery. The
  personal single-owner direction is now selected above; its precise protocol
  and qualification remain open.
- Browser session custody and native authorization-code flows using Proof Key
  for Code Exchange need exact Target binding, refresh concurrency, logout, and
  stream-reconnect contracts.
- Trusted workload, actor, subject, Agent, Run, and client bindings remain
  distinct. Permission to act does not by itself authorize issuing or renewing
  delegation, or replacing it with an autonomous organization grant.
- Graph qualification must cover source changes not yet projected, stale
  writers, revoke and replacement races, model activation, and restore. OpenFGA
  cache bypass alone cannot prove that a source revocation reached the graph.
  SpiceDB is a bounded consistency comparator, not a selected replacement.
- Protected personal queues, search, exports, and realtime require current
  disclosure rules for counts, ranking, pagination, and cursors as well as rows.
  Policy rollout, audit, and recovery retain their owning consistency evidence.

The report's qualification sequence refines the experiment below. External
connection ownership, worker enrollment, local materialization, and dangerous
effects remain with OD-034, OD-038, OD-040, and OD-032 respectively; this decision
must not absorb those lifecycles into a universal IAM service.

### Proposed acceptance experiment

Use disposable installations and A/B/neutral organizations, one shared human,
customer admins, and a service actor. No IAM fork is allowed. The first slice
runs relevant baseline cases; enterprise cases qualify growth separately.

1. **Stable identity:** join A and B, remove A, and retain B plus the same
   provider-neutral principal; reject silent managed-lifecycle conversion.
2. **SSO growth:** require A's IdP and then B's IdP; test local credentials,
   an existing session, IdP hints, linking, and wrong-organization provenance.
3. **Safe administration:** admin A manages only A's allowed relationships and
   roles; deny B changes, global user deletion, credentials, and escalation.
4. **SCIM growth:** create, update, suspend, and delete A's relationship through
   the selected provisioning path while B and shared identity remain usable.
5. **Revoke and grant again:** revoke an exact proof during admission and dispatch;
   delayed revocation cannot invalidate an unrelated successor proof.
6. **Projection failure:** interrupt IAM/FGA delivery, restart consumers, inject
   duplicates and reordered facts, then prove convergence and gap handling.
7. **Agent authority:** bind subject, actor, client, scope, expiry, and delegation;
   deny widening and prove owner-local Run cutoff without false stop receipts.
8. **Independent operation and load:** run standalone without Platform, then
   managed through the same mechanism; ramp measured agent/SSO traffic and record
   tail latency, saturation, token renewal, failures, and recovery.

The owning ADR must record which cases passed, source/configuration revisions,
custom code and operator work, accepted scope, and remaining gaps. A source
review or passing token exchange alone is not acceptance evidence.

## Resolution

Open.
