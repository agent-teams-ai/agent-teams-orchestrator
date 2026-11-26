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
| 02 | Independent common account first; scoped corporate authentication/recovery is the enterprise target. | A-controlled login/recovery must not open B. Identity's ongoing social-root custody mechanism remains open. |
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

The [expanded Identity plan](https://github.com/agent-teams-ai/identity/blob/aa07b44435339777e3d2b45f9e6b2115732aad6d/docs/plans/identity-service-implementation-plan.md) is compatible with these directions:
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

Two November mechanism choices remain explicit at Identity D3/D8: proof of
ongoing social-root independence (including corporate custody acquired later),
and the finite scope/bound of native per-session logout with lost delivery.
The owner endorsed the independent-account goal, not an unqualified claim that
a public GitHub/GitLab hostname or an optional factor already proves it.

### Remaining IAM decisions and evidence

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
