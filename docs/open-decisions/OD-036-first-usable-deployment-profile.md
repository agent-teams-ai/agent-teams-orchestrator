---
id: OD-036
type: open-decision
status: resolved
owner: architecture/composition
summary: Decide whether the first usable release qualifies server profiles only while preserving the future fully local composition.
resolved_by: ADR-0086
related:
  - ADR-0030
  - ADR-0033
  - ADR-0060
  - ADR-0086
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - OD-021
  - OD-035
---

# OD-036: First Usable Deployment Profile

## Decision required

Select the deployment profiles that must be production-qualified for the first
usable release integrated by Web and Desktop clients.

The current preferred release scope is Managed SaaS plus Standalone Self-Hosted
Server. Fully Local Desktop remains an explicit architectural profile but its
Local Host, SQLite workflow engine, local realtime sidecars, packaging, and
upgrade lifecycle are not implemented for that release.

## Constraints

- One logical orchestrator domain and application core serves every profile.
- Profile selection occurs only in composition and deployment capability
  manifests, never as domain or application branching.
- `@agent-teams/orchestrator-sdk` exposes the same product capabilities wherever
  the selected Host advertises them.
- `@agent-teams/orchestrator-local-host` is reserved for the future Node-only
  Local Host lifecycle and is not imported by browser-safe or remote SDK code.
- Desktop remains usable as a remote client and may run local AR execution
  components without running a local Orchestrator Host.
- Deferring Fully Local cannot introduce hosted assumptions into domain models,
  persistence ports, workflow boundaries, identities, feeds, or recovery
  semantics.
- Self-hosted operation must not depend on the private Agent Teams Platform.

## Options

1. Qualify Managed SaaS and Standalone Self-Hosted Server first; defer Fully
   Local implementation while retaining conformance seams and composition
   manifests. This is the current preferred option.
2. Qualify Hosted and Fully Local together. This proves parity earlier but adds
   SQLite, local workflow, Supervisor, signing, updater, and cross-platform
   recovery to the first critical path.
3. Ship Managed SaaS only. This is fastest but violates the product goal that
   users can operate independently of Agent Teams infrastructure.

## Acceptance criteria

- Every MVP capability states whether it is available in Managed SaaS and
  Standalone Self-Hosted Server.
- Self-hosted setup is one documented deployment flow with no private registry or
  Agent Teams Platform runtime dependency.
- Desktop and Web use the public SDK against either server profile.
- Composition validation rejects unsupported adapter combinations and silent
  fallback.
- Local-ready ports, SQLite conformance contracts, Supervisor boundaries, and
  workflow engine decision remain explicit and tested with contract fixtures
  where feasible, without shipping an unused local implementation.
- The future Fully Local profile can be added by adapters and composition rather
  than by changing business ownership or public resources.

## Resolution

Resolved by ADR-0086. V1 qualifies Managed SaaS and Standalone Self-Hosted
Server. Fully Local remains a first-class future profile whose implementation and
packaging are deferred.
