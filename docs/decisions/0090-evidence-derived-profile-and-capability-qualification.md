---
id: ADR-0090
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/reliability
summary: Derive deployment qualification from resolved decisions and conformance artifacts while gating local-device execution independently.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0089
  - architecture.deployment-profiles
  - architecture.reliability
  - architecture.security
  - OD-012
  - OD-037
  - OD-038
---

# ADR-0090: Evidence-Derived Profile and Capability Qualification

## Context

ADR-0089 correctly separates a V1 target from a qualified deployment, but a
profile could still be marked `qualified` by deleting its blockers. It also
listed local-device runtime connectivity among server-profile concerns even
though a server can qualify with independently proven remote capacity.

Product authorization and commercial access may be implemented by the same
Platform deployment but remain different decisions. Composition must not
activate Managed Product Authority and Standalone Product Authority together.

## Decision

The machine-readable reliability catalog owns both deployment profiles and
cross-profile deployment capabilities.

A profile or capability marked `qualified` has:

- no unresolved `blockedBy` reference;
- at least one accepted or resolved decision reference;
- at least one existing conformance artifact under the controlled qualification
  evidence directory;
- adapter bindings that match the accepted profile definition.

CI resolves blocker and evidence decision IDs against document metadata and
fails for missing, already resolved blockers, unaccepted evidence, escaping
paths, or missing conformance artifacts. Clearing an array is not qualification.

Each profile declares exactly one product-authority adapter and an independent
commercial-authority mode:

| Profile | Product authority | Commercial authority |
|---|---|---|
| Managed SaaS | managed Platform | managed Platform |
| Standalone Self-Hosted | standalone | none |
| Connected Self-Hosted | standalone | optional managed Platform |
| Fully Local | local standalone | none |

The `local-device-execution` capability is blocked by OD-038 for server profiles.
It does not block qualification of a server profile that advertises only other
independently qualified runtime placements.

Fully Local remains blocked by its workflow, transport, persistence, eventing,
Supervisor lifecycle, recovery, and distribution decisions. Its package
materialization remains independently deferred under ADR-0089.

## Consequences

- Deployment status becomes evidence-derived rather than a mutable label.
- Runtime placement can evolve independently without duplicating profile models.
- Product and commercial authority cannot collapse into one domain decision.
- Qualification evidence requires a controlled artifact format before the first
  profile can move from blocked to qualified.

## Rejected Alternatives

- Treat an empty blocker list as production readiness.
- Block every server profile on local-device connectivity.
- Model product authorization and commercial access as one authority edge.
- Allow arbitrary external paths to serve as conformance evidence.
