---
id: OD-036
type: open-decision
status: resolved
owner: architecture/composition
summary: Record the original server-first scope and its successor requiring Fully Local alongside both server profiles in V1.
resolved_by: ADR-0087
related:
  - ADR-0030
  - ADR-0060
  - ADR-0087
  - ADR-0115
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - OD-021
  - OD-035
---

# OD-036: First Usable Deployment Profile

## Decision required

Select the deployment profiles that must be production-qualified for the first
usable release integrated by Web and Desktop clients.

ADR-0087 originally selected Managed SaaS plus Standalone Self-Hosted Server and
deferred Fully Local. The owner replaced that scope with ADR-0115 on 2026-10-22:
Fully Local is now also a required V1 profile. The `resolved_by` field retains
the original decision provenance; ADR-0115 is the current release-scope authority.
The local profile remains unqualified and its implementation-start gates remain
open.

## Constraints

- One logical orchestrator domain and application core serves every profile.
- Profile selection occurs only in composition and deployment capability
  manifests, never as domain or application branching.
- `@agent-teams/orchestrator-sdk` exposes the same product capabilities wherever
  the selected Host advertises them.
- `@agent-teams/orchestrator-local-host` is reserved for the Node-only
  Local Host lifecycle and is not imported by browser-safe or remote SDK code.
- Desktop remains usable as a remote client and may run local AR execution
  components without running a local Orchestrator Host.
- Fully Local delivery cannot introduce hosted assumptions into domain models,
  persistence ports, workflow boundaries, identities, feeds, or recovery
  semantics.
- Self-hosted operation must not depend on the private Agent Teams Platform.

## Options

1. Qualify Managed SaaS and Standalone Self-Hosted Server first; defer Fully
   Local implementation while retaining conformance seams and composition
   manifests. This was selected by ADR-0087 and is now superseded.
2. Qualify both server profiles and Fully Local for V1. ADR-0115 selects this
   option. Native PostgreSQL lifecycle, local workflow, Supervisor, signing,
   updater, and cross-platform recovery enter the V1 critical path.
3. Ship Managed SaaS only. This is fastest but violates the product goal that
   users can operate independently of Agent Teams infrastructure.

## Acceptance criteria

- Every MVP capability states its availability in Managed SaaS, Standalone
  Self-Hosted Server, and Fully Local, with required baseline capabilities
  qualified in each V1 profile.
- Self-hosted setup is one documented deployment flow with no private registry or
  Agent Teams Platform runtime dependency.
- Desktop and Web use the public SDK against either server profile.
- Desktop and supported local clients use the selected local Target through its
  qualified public API; they do not receive direct database access.
- Composition validation rejects unsupported adapter combinations and silent
  fallback.
- Shared PostgreSQL adapters and migrations, Supervisor boundaries, and the
  selected local workflow adapter pass their applicable conformance and native
  packaging/recovery qualification for the declared release matrix.
- Local and server profiles reuse business implementations and public resources;
  their deployment-specific adapters preserve their separate operating limits.

## Resolution

Originally resolved by ADR-0087. Its release deferral is superseded by ADR-0115,
which requires Managed SaaS, Standalone Self-Hosted Server, and Fully Local in V1.
The new scope does not itself resolve OD-021, OD-035, or OD-040, or qualify any
profile for release.

The later [ADR-0116](../decisions/0116-native-temporal-for-fully-local-durable-workflows.md)
resolves OD-035's engine selection. The remaining local implementation-start
and release qualification obligations retain their separate authority.
