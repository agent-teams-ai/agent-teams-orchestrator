---
id: domain.modeling-standard
type: domain-standard
status: accepted
owner: architecture/domain
summary: Full DDD discovery and tactical modeling requirements for bounded contexts.
related:
  - ADR-0051
  - ADR-0042
  - domain.tactical-modeling-patterns
  - OD-006
  - OD-011
---

# Full DDD Modeling Standard

## Purpose

Full DDD in this repository means applying both strategic and tactical DDD where
the domain is complex. It does not mean creating an interface, entity, repository,
or package for every class or noun.

The strongest abstraction boundary is the bounded context. Inside a context,
abstractions follow real domain variation, invariants, and ownership.

Full DDD has three required dimensions:

1. strategic modeling defines subdomains, bounded contexts, language, ownership,
   relationships, and Published Languages;
2. tactical modeling expresses aggregates, entities, value objects, policies,
   domain services, specifications, domain events, repositories, and process
   managers where their semantics are proven;
3. evolutionary modeling preserves compatibility, migrations, replay, recovery,
   observability, and context-extraction paths as the model changes.

Passing only one dimension is not Full DDD. Folder structure cannot compensate
for missing language, invariants, behavior, or operational evolution.

## Strategic DDD requirements

Every proposed bounded context must document:

- the business capability and expected outcomes;
- core, supporting, or generic subdomain classification;
- its Ubiquitous Language and terms that differ from neighboring contexts;
- model ownership and excluded responsibilities;
- upstream/downstream relationships;
- Published Language owner and compatibility policy;
- ACL or context-bridge ownership;
- synchronous versus asynchronous interaction;
- consistency, latency, availability, and failure expectations;
- extraction and security considerations.

A context boundary is accepted only when language, invariants, lifecycle, and
ownership support it. Repository layout alone is not evidence.

## Tactical DDD requirements

For every aggregate candidate, record:

- aggregate root and identity;
- invariant protected by the boundary;
- commands that may change it;
- domain events it can emit;
- transaction boundary;
- optimistic-concurrency or conflict rule;
- maximum collection growth;
- external facts required for a decision;
- repository need and query exclusion;
- rejected smaller and larger boundaries.

Entities, value objects, domain services, factories, policies, and specifications
are introduced only when their domain role is explicit.

Repositories exist only for aggregate roots. Query models do not use aggregate
repositories.

Implementation follows the aggregate-centered placement and behavior rules in
[Tactical DDD Modeling Patterns](tactical-modeling-patterns.md). An aggregate is
not an anemic persistence record: its root owns intention-revealing state
transitions and makes invalid transitions impossible or explicit domain outcomes.

## Policy vocabulary

Use precise names:

- **domain policy**: business decision that participates in domain behavior;
- **application policy**: use-case coordination, retries, or authorization flow;
- **execution policy**: product decision about runtime capabilities and risk;
- **delivery policy**: communication scheduling and retry behavior;
- **infrastructure policy**: adapter configuration such as broker retention.

Plugins cannot replace domain policies that protect invariants.

## Process managers

Long-running or cross-aggregate behavior is modeled explicitly as a process
manager or state machine. Its documentation identifies:

- owner bounded context;
- durable state and source of truth;
- accepted commands and consumed events;
- emitted commands and events;
- timers and deadlines;
- idempotency and correlation identities;
- retry versus business compensation;
- cancellation and late-arrival behavior;
- terminal states and recovery.

A process manager is not automatically an aggregate or a new bounded context.
Durable commands emitted by a process manager are staged as transactional
command-dispatch records with its state change. They are not sent before commit and
are not modeled as historical facts.

## DRY interpretation

Within one bounded context, one business rule has one authoritative
implementation. Across bounded contexts, similar names or serialized structures
may intentionally be duplicated because they have different meaning, lifecycle,
ownership, or compatibility.

Semantic coupling is more expensive than small mapping code. Generic base
aggregates, repositories, domain events, and business errors are prohibited.

## Acceptance gate

A core context cannot move from Proposed to Accepted until:

1. its domain dossier is reviewed;
2. critical scenarios and failure cases are event-stormed;
3. aggregate boundaries are justified by invariants and concurrency;
4. context relationships have explicit owners and consistency;
5. terminology conflicts are resolved or documented;
6. architecture tests can enforce the intended package and export boundary;
7. an ADR records the accepted boundary.

For the first implementing vertical slice, the gate also requires:

1. each aggregate has the required decision matrix;
2. domain behavior and integration contracts use separate event types;
3. persistence and public schemas have explicit mappers rather than becoming
   domain types;
4. domain, concurrency, rehydration, and property-test scenarios are named;
5. domain navigation identifies each aggregate and owning feature without a
   repository-wide source search.
