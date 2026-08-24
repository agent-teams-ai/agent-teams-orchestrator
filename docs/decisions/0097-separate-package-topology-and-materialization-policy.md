---
id: ADR-0097
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/tooling
summary: Keep the Foundation package topology contract separate from Orchestrator-owned package materialization policy.
approved_by: product-owner
accepted_at: 2026-08-23
related:
  - ADR-0038
  - ADR-0081
  - ADR-0090
  - ADR-0093
  - architecture.dependency-rules
  - architecture.feature-module-standard
  - architecture.repository-tooling
  - OD-040
---

# ADR-0097: Separate Package Topology and Materialization Policy

## Context

The package catalog is the target topology Published Language consumed by the
versioned Engineering Foundation scaffolding protocol. That protocol validates a
closed package identity shape before compiling an authority-bound plan.

ADR-0090 and ADR-0093 also require Orchestrator-specific materialization state,
blockers, and decision evidence for reserved Fully Local packages. Adding those
fields directly to the package catalog makes it incompatible with the Foundation
contract and prevents every scaffold plan, including plans for unrelated allowed
packages.

## Decision

- `architecture/package-catalog.yaml` remains the single source of package
  identity, role, path, package name, and owner document. It contains only the
  closed Foundation target-catalog contract.
- `architecture/package-materialization-policy.yaml` is the single source of
  Orchestrator-specific materialization state, blockers, and accepted decision
  references. Its entries refer to catalog package IDs and never repeat package
  paths, names, roles, or owners.
- The topology validator loads and schema-validates both manifests, rejects
  duplicate or unknown policy package IDs, and joins them by exact package ID.
- ADR-0093 activates a closed-world check for the three reserved Fully Local
  policy entries. Deleting a required entry, deleting its catalog package, or
  weakening its exact blocker set fails CI.
- A package absent from the materialization policy is allowed only by this
  implementation-start gate; owner status and all other topology rules still
  apply.
- The scaffolder checks the materialization policy before delegating plan
  compilation to Engineering Foundation. A deferred package cannot create a
  plan or filesystem state.
- Changing a policy entry to `allowed` still requires all declared blockers to
  be resolved and `decision` to name the accepted ADR that resolves OD-040.

This ADR corrects only the storage location implied by ADR-0090 and ADR-0093.
Their fail-closed materialization semantics and separation from deployment
qualification remain unchanged.

## Consequences

- Engineering Foundation can evolve its target-catalog contract independently
  from Orchestrator deployment policy.
- Package identity and materialization authority have separate owners without
  duplicating topology facts.
- Synthetic topology fixtures can exercise the shared catalog contract with an
  empty policy, while the canonical Orchestrator repository retains the stricter
  ADR-0093 closed-world reservation set.
- Every real scaffold plan remains bound to the canonical package catalog and
  owner evidence.

## Rejected Alternatives

- Fork or patch Engineering Foundation to accept Orchestrator-only fields.
- Keep a second generated copy of the complete package catalog for scaffolding.
- Allow arbitrary extension fields in the shared target-catalog contract.
- Make deferred state an undocumented convention enforced only during review.
