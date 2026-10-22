---
id: OD-012
type: open-decision
status: open
owner: architecture/security
summary: Define principal, authorization, service identity, and hosted tenant-isolation semantics.
related:
  - architecture.context-map
  - domain.contexts.access-control
  - domain.contexts.orchestration-scope
  - ADR-0021
  - ADR-0079
  - ADR-0080
  - OD-031
  - OD-032
  - research.identity-provider-comparison-2026-10-21
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
Platform. Get Modular composition remains owned by ADR-0110, and service topology
remains outside this provider decision.

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
