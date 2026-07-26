---
id: domain.index
type: index
status: active
owner: architecture/domain
summary: Navigation and discovery requirements for business-domain documentation.
---

# Domain Documentation

This directory contains business-domain knowledge. It is distinct from
`docs/architecture`, which describes solution structure and technical boundaries.

Start from the [bounded-context dossier index](contexts/README.md). Contexts remain
proposed until the required discovery artifacts and acceptance gate are complete.

## Required discovery artifacts

Before a core bounded context is accepted and implemented, its domain dossier must
contain:

1. domain vision and business outcomes;
2. business-capability map;
3. context-specific Ubiquitous Language;
4. event-stormed business scenarios;
5. command and domain-event catalog;
6. invariant and business-rule catalog;
7. aggregate and transaction-boundary decisions;
8. concurrency and conflict model;
9. policies, specifications, factories, and domain services where justified;
10. process-manager and state-machine definitions;
11. domain error taxonomy;
12. upstream/downstream relationship contracts.

Use [the Full DDD modeling standard](modeling-standard.md) for acceptance criteria
and [Tactical DDD Modeling Patterns](tactical-modeling-patterns.md) for aggregate,
entity, value-object, policy, event, repository, and implementation rules.

Do not fill these artifacts with guessed nouns or directory-driven models. They are
produced from current behavior, domain-expert language, edge cases, invariants, and
concurrency analysis.
