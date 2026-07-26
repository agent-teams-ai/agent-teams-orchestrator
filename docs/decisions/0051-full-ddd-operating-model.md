---
id: ADR-0051
type: adr
status: accepted
owner: architecture/domain
summary: Adopt Full DDD as the operating model for business bounded contexts without imposing ceremonial domain artifacts on technical packages.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0012
  - ADR-0042
  - ADR-0043
  - architecture.feature-module-standard
  - domain.modeling-standard
  - domain.tactical-modeling-patterns
---

# ADR-0051: Full DDD Operating Model

## Context

The orchestrator is expected to evolve for many years across local and hosted
deployments, many agent runtimes, clients, workflow policies, organizations,
tasks, approvals, usage accounting, and consumption controls. Folder conventions
alone cannot protect the distinct language, invariants, lifecycle, consistency,
and compatibility of those capabilities.

Using only tactical class names would produce ceremonial DDD. Using only bounded
contexts would leave aggregate behavior, concurrency, and persistence semantics
underspecified. Full DDD therefore needs strategic, tactical, and evolutionary
modeling with enforceable Clean Architecture boundaries.

## Decision

Full DDD is the required operating model for business bounded contexts.

### Strategic DDD

Every bounded-context candidate must justify:

- subdomain classification and business capability;
- Ubiquitous Language and terminology conflicts;
- model, data, policy, and lifecycle ownership;
- protected consistency and security boundaries;
- upstream and downstream relationships in the Context Map;
- Published Language, Open Host Service, and Anti-Corruption Layer ownership;
- synchronous and asynchronous collaboration semantics;
- extraction path, compatibility policy, and team ownership.

There is no target or maximum number of bounded contexts. Evidence from language,
invariants, lifecycle, security, and ownership determines the topology.

### Tactical DDD

Every domain-heavy feature uses the applicable tactical building blocks:

- entities with stable identity and lifecycle;
- immutable value objects with semantic validation and behavior;
- aggregates with one aggregate root and named transactional invariants;
- intention-revealing aggregate commands and typed domain failures;
- factories for nontrivial valid creation;
- domain services for pure business behavior spanning values or entities;
- domain policies for named variable business decisions;
- specifications for composable business predicates;
- domain events representing completed internal facts;
- repositories only for aggregate roots;
- process managers for durable cross-aggregate, cross-context, timer, or external
  coordination.

These are available modeling tools, not a checklist requiring every feature to
contain every artifact. An aggregate candidate is accepted only after its
invariants, commands, events, transaction boundary, concurrency profile,
collection growth, external facts, and rejected alternative boundaries are
documented.

Aggregate roots exclusively mutate state inside their consistency boundary.
Entities cannot be loaded or saved independently through repositories. Cross-
aggregate references use typed identities. Application use cases load an
aggregate, supply verified external facts, invoke domain behavior, and commit the
result through a capability-scoped Unit of Work.

Domain events remain internal domain facts. Application code maps them to
versioned integration events or durable command-dispatch intent in the same Unit
of Work. Public contracts, persistence rows, ORM models, Temporal.io histories,
and provider payloads never become domain objects.

### Evolutionary DDD

Every accepted model also defines:

- optimistic concurrency, idempotency, fencing, and ambiguous-outcome behavior;
- versioned Published Languages and integration-event compatibility;
- schema migration, replay, correction, and projection rebuild semantics;
- observability that uses domain language without leaking private state;
- recovery, retention, privacy, and deletion behavior;
- local SQLite and hosted PostgreSQL semantic conformance;
- safe bounded-context extraction without cross-context table access.

Model evolution uses additive compatibility, explicit migration, and replay
evidence. A Temporal.io workflow may schedule a process manager, but workflow
history is not aggregate state and cannot become the only business source of
truth.

### Clean Architecture and feature ownership

DDD does not replace Clean Architecture:

- domain owns business behavior and has no infrastructure dependencies;
- application owns use cases, consumer-owned ports, and transaction coordination;
- inbound adapters invoke application capabilities;
- outbound adapters implement persistence, eventing, runtime, clock, calendar,
  workflow, and external-system ports;
- composition selects implementations without entering domain or application.

Every artifact remains inside its owning feature. Similar concepts in different
bounded contexts may intentionally use different models and explicit mappings.
There is no repository-wide `shared-domain`, generic aggregate base class, generic
repository, universal business event, or canonical model spanning contexts.

Integration, platform, SDK, application-host, and tooling packages follow strict
feature ownership and dependency direction but do not invent aggregates or
entities when they contain no business domain. This is part of Full DDD, not an
exception to it.

### Navigation and verification

Domain-heavy features provide an aggregate-centered navigation index naming roots,
invariants, commands, events, policies, repositories, and owner paths.

Verification includes:

- aggregate transition and invariant tests;
- property-based value-object and arithmetic tests;
- model-based and real-database concurrency traces;
- aggregate rehydration through every persistence profile;
- domain-event tests separated from integration-contract fixtures;
- architecture tests for layer, feature, package, and context boundaries;
- context-map and Ubiquitous Language review before a boundary is accepted.

## Consequences

- Business rules have explicit semantic owners rather than handler, workflow, or
  adapter ownership.
- Agents navigate from context to feature to aggregate instead of searching a
  flat technical layer.
- More modeling evidence is required before production packages materialize.
- Small mapping duplication is accepted when it prevents semantic coupling
  between contexts or infrastructure profiles.
- Technical packages remain simpler because they are not forced into artificial
  tactical DDD.

## Rejected alternatives

- Apply only a lightweight or balanced subset of DDD to core business contexts.
- Create every tactical pattern in every feature regardless of domain evidence.
- Use ORM entities or public DTOs as the domain model.
- Put business policy in Temporal.io workflows, controllers, repositories, or
  provider adapters.
- Share one canonical domain model across bounded contexts.
