---
id: ADR-0043
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/governance
summary: Optimize the orchestrator for controlled long-term evolution without speculative domain abstractions.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - architecture.evolution-quality-attributes
  - ADR-0001
  - ADR-0030
  - ADR-0042
---

# ADR-0043: Long-Horizon Evolutionary Architecture

## Context

The orchestrator is intended to support many agent runtimes, clients, deployment
profiles, organizations, and integrations over a multi-decade product lifetime.
Optimizing only for the first working release would create expensive semantic and
compatibility debt. Attempting to predict every future variation would instead
create abstract frameworks with no proven owner or invariant.

## Decision

Treat long-term evolvability, recoverability, security, interoperability,
operability, and testability as architecture quality attributes from the first
production slice.

Preserve them through:

- explicit bounded-context, feature, state, process, and contract ownership;
- dependency inversion and replaceable technology adapters;
- versioned Published Languages and public contracts with compatibility,
  migration, deprecation, and recovery policies;
- local, hosted, multi-tenant, and multi-runtime conformance at the boundaries
  where their semantics must agree;
- durable idempotency, reconciliation, observability, and controlled failure
  handling for long-running work;
- package and architecture gates that make invalid dependencies fail early;
- incremental extraction of contexts only when scaling, security, ownership, or
  deployment evidence requires it.

Long-horizon design does not mean maximizing abstractions. A new abstraction needs
a proven variation, invariant, policy, lifecycle, or replacement boundary and one
named owner. Generic domain bases, speculative plugin points, unused compatibility
layers, and technology-neutral wrappers without a real alternative remain
prohibited.

Architecture decisions prefer reversible choices and explicit seams around
irreversible ones. The project does not promise that schemas and implementations
never change; it requires changes to occur through versioned migration paths and
without accidental ownership transfer.

## Consequences

- Initial slices carry more contract, migration, failure, and conformance work than
  disposable prototypes.
- Domain and public semantics remain insulated from providers and deployment
  technologies.
- Future services, languages, runtimes, and storage engines can replace adapters
  without moving business ownership.
- Reviewers must reject both short-term coupling and unsupported abstraction
  layers.
- Evolution remains deliberate rather than frozen: evidence may supersede an
  accepted decision through a new ADR.

## Rejected alternatives

- Optimize architecture only for an MVP and defer ownership or compatibility.
- Build a universal framework for every imagined future use case.
- Treat no-rewrite as a promise that prevents controlled schema or contract
  evolution.
- Use microservices, plugins, or generic base types as proxies for modularity.
