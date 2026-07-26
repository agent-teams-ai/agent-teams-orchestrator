---
id: ADR-0042
type: adr
status: accepted
owner: architecture/domain
summary: Determine bounded-context topology from domain evidence without a numerical target or ceiling.
approved_by: product-owner
accepted_at: 2026-07-26
supersedes:
  - ADR-0007
related:
  - architecture.context-map
  - domain.modeling-standard
  - OD-011
---

# ADR-0042: Evidence-Driven Bounded-Context Topology

## Context

ADR-0007 correctly established focused bounded contexts containing
domain-capability feature slices, but it also selected an eight-to-ten-context
target before discovery was complete. Subsequent analysis found independently
evolving organization-topology and usage-accounting capabilities while preserving
distinct identity, authorization, policy, and approval languages.

A numerical target creates the wrong incentive: unrelated models may be merged to
stay below a ceiling, or one coherent model may be split to approach a target.
Neither outcome follows strategic DDD.

## Decision

Use as many business bounded contexts as domain evidence requires. There is no
minimum, target, or maximum count.

A bounded context exists only when a cohesive Ubiquitous Language, model ownership,
invariants, lifecycle, consistency boundary, security boundary, or independent
evolution justifies it. Size, package symmetry, endpoint count, and a desired total
do not justify a context.

The remaining structural rules from ADR-0007 continue:

- every accepted business bounded context becomes a workspace package;
- each context contains feature-owned domain-capability slices;
- a feature is not a smaller bounded context by default;
- Published Languages, ACLs, and versioned integration events protect
  cross-context collaboration;
- integration, platform, SDK, testing, and application packages use feature slices
  appropriate to their role without inventing tactical DDD artifacts;
- proposed contexts reserve language and topology only and cannot materialize code
  until the Full DDD acceptance gate passes.

Context discovery may add, merge, split, rename, or retire candidates. Such a
change follows the documentation and migration process appropriate to whether the
context is proposed, accepted, or already materialized. No implementation change
may be justified solely by keeping the total context count stable.

## Consequences

- Domain boundaries can evolve as the orchestrator gains organization, usage,
  governance, memory, evaluation, and other capabilities.
- Reviewers must evaluate evidence for every boundary rather than comparing a
  package count with a target.
- The number of packages and mappings may grow, but only with explicit ownership
  and acceptance evidence.
- Focus remains mandatory: broad catch-all contexts and one-context-per-use-case
  fragmentation are both architecture violations.
- Context materialization remains incremental; accepting an unconstrained target
  does not require creating every candidate package.

## Rejected alternatives

- Keep eight to ten as a hard or soft target.
- Merge distinct identity, authorization, policy, approval, organization, or usage
  models solely to satisfy a package count.
- Create a bounded context for every feature, endpoint, aggregate, or external
  integration.
- Materialize all candidate contexts before their language and invariants are
  validated.
