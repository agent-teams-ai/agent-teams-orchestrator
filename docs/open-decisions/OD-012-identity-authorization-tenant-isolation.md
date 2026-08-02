---
id: OD-012
type: open-decision
status: open
owner: access-control
summary: Define principal, authorization, service identity, and hosted tenant-isolation semantics.
related:
  - architecture.context-map
  - domain.contexts.access-control
  - domain.contexts.orchestration-scope
  - ADR-0080
  - ADR-0021
  - OD-031
  - OD-032
---

# OD-012: Identity, Authorization, and Tenant Isolation

## Decision required

Define principal types, tenant/project membership, service identities,
authorization checks, API authentication, secret references, and hosted isolation.

## Constraints

Identity Registry owns principal facts. Orchestration Scope owns stable
orchestration tenant and Project identity, lifecycle, and coarse admission.
Access Control owns grants. Every application use case
authorizes its business operation. Decide which operations require authoritative
synchronous decisions and which may use local grant projections, including
revocation and fail-closed behavior.

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

OD-031 separately owns semantic claim admission and conflict resolution. Access
Control determines whether a principal may attempt an operation; it does not
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

## Resolution

Open.
