---
id: domain.tactical-modeling-patterns
type: domain-standard
status: accepted
owner: architecture/domain
summary: Canonical tactical DDD roles, aggregate-centered layout, behavior rules, and verification expectations.
related:
  - ADR-0051
  - domain.modeling-standard
  - architecture.feature-module-standard
  - ADR-0042
  - ADR-0050
  - OD-006
---

# Tactical DDD Modeling Patterns

## Purpose

This standard makes tactical DDD predictable for contributors and coding agents
without turning DDD vocabulary into ceremonial classes. It applies to business
features whose dossiers demonstrate domain complexity. Integration, platform,
SDK, and tooling packages use their role-appropriate models instead.

## Aggregate-centered feature layout

The owning feature remains the primary navigation boundary. Inside its domain
layer, behavior is grouped by aggregate root before artifact type:

```text
features/quota-reservation/
  domain/
    aggregates/
      quota-account/
        quota-account.ts
        quota-reservation.ts
        reservation-id.ts
        reservation-expiry.ts
        events/
          quota-reserved.ts
          reservation-captured.ts
    policies/
      reservation-estimate-policy.ts
    services/
      multi-scope-admission.ts
    specifications/
      active-reservation.ts
    errors/
      insufficient-quota.ts
    README.md
  application/
  adapters/
  composition/
    feature-module-factory.ts

tests/features/quota-reservation/
```

An entity, value object, factory, or event used by only one aggregate is colocated
with that aggregate. A feature-level directory is created only for a concept
genuinely shared by several aggregates inside the same feature. Cross-feature
reuse goes through an explicit context-internal API and semantic owner; it does
not justify a `shared` directory.

Empty categories are prohibited. A feature with one small aggregate may keep its
few files directly below `domain/aggregates/<root>/`.

A domain-heavy feature adds `domain/README.md` when it has more than one aggregate
or a nontrivial domain service. That file is a navigation index containing roots,
protected invariants, principal commands, emitted domain events, and owner paths.
It links to the context dossier and does not duplicate full business rules.

## Aggregate roots

An aggregate root is the only entry point for changing state inside its
consistency boundary. It has stable identity and protects named invariants for
every reachable state transition.

An aggregate implementation:

- exposes intention-revealing methods, never public mutable fields or setters;
- cannot be constructed in an invalid state;
- accepts external facts, time, IDs, and policy results as explicit values;
- validates expected revision or delegates revision comparison to its Unit of
  Work contract;
- records domain events only after a valid state transition;
- keeps collections bounded or uses separate aggregate identities;
- references another aggregate only by stable typed identity;
- never calls a repository, clock, broker, runtime, filesystem, or transport.

Creation and rehydration are different operations. A factory may create a new
valid aggregate from business inputs. Adapter mapping may rehydrate persisted
state through a restricted reconstruction path that cannot bypass invariant and
schema-version checks.

There is no `BaseAggregate`, generic event collector inheritance hierarchy, or
generic aggregate repository. Small duplicated mechanics are cheaper than shared
business semantics.

## Entities

An entity has continuity and identity within one aggregate boundary. Its identity
does not make it independently loadable, mutable, or publishable.

- repositories never target child entities;
- application use cases do not mutate child entities directly;
- entities do not reference their parent through an infrastructure callback;
- an entity that needs independent concurrency, unbounded growth, or lifecycle is
  reconsidered as a separate aggregate candidate.

## Value objects

A value object is immutable, compared by semantic value, validated at creation,
and contains behavior belonging to that value. It is not a branded primitive with
all rules left in services.

Value objects own unit compatibility, normalization, exact arithmetic, range, and
format invariants where applicable. Library implementations such as Decimal,
Dinero, or Temporal remain private. Serialization uses canonical primitives and
explicit mapper code.

Context-local value objects may intentionally duplicate another context's shape.
They are shared only when meaning, lifecycle, compatibility, and ownership are
proven identical by a dedicated shared-kernel decision.

## Domain services, policies, and specifications

A domain service is a pure, stateless business operation that does not naturally
belong to one entity or value object. It receives all facts explicitly and cannot
coordinate repositories or transactions.

A domain policy represents a named business decision with real variation, such
as reservation estimation or completion acceptance. Implementations are selected
by application composition or aggregate inputs; policy selection itself remains
business behavior when the domain requires it.

A specification is a named business predicate used to explain or compose a rule.
It is not a generic ORM query builder and cannot carry SQL, Drizzle expressions,
pagination, or transport filters.

Factories are used when aggregate creation requires several value objects,
policies, or invariant checks. A factory does not save the result or publish an
event independently.

## Domain events and integration events

A domain event is a past-tense fact emitted by a successful domain transition. It
uses domain identities and values and contains no broker subject, retry count,
tenant transport header, Protobuf field, or SDK DTO.

Application code drains domain events as part of the same Unit of Work and maps
them to one or more durable publication intents. Public integration events are
versioned contracts with privacy, ordering, replay, and compatibility metadata.
The two event types may express related facts but are never the same class or
serialized object.

Events do not replace aggregate state by default. Event sourcing requires a
separate context-level decision, replay model, upcasting policy, and operational
evidence.

## Repositories and queries

Repositories exist only for aggregate roots and use domain-specific operations.
They preserve optimistic concurrency and return complete consistency boundaries.
They do not expose ORM entities, query builders, generic CRUD, or child-entity
collections for external mutation.

Read models use separate query ports and purpose-built projections. A query does
not load an aggregate merely to serialize it. Persistence snapshots and rows are
adapter models, not domain entities.

## Process managers

A process manager coordinates durable behavior across aggregate transactions,
contexts, timers, or external systems. It belongs to the application layer unless
its persisted state itself protects a proven domain invariant.

Temporal may schedule a process manager, but Temporal workflow history is not its
business state. Activities invoke stable idempotent application commands. A
process manager never mutates another context's aggregate or treats compensation
as distributed rollback.

## Aggregate decision record

Before implementation, every aggregate candidate has a reviewed matrix in its
context dossier or feature domain documentation:

| Field | Required evidence |
|---|---|
| Root and identity | Stable semantic owner and identity scope |
| Protected invariants | Rules requiring one consistency boundary |
| Commands | Every legal mutation entry point |
| Domain events | Facts produced after valid transitions |
| Transaction | State, command receipt, and outbox intent committed atomically; only explicitly transactional read-model updates join that Unit of Work, while asynchronous projections use their own inbox/checkpoint transaction |
| Concurrency | Revision, conflict set, lock or isolation strategy |
| Collection growth | Explicit bound or extraction trigger |
| External facts | Values supplied before the domain decision |
| Failure outcomes | Stable domain conflicts and invariant violations |
| Rejected boundaries | Why smaller and larger aggregates are unsafe |

The same matrix drives repository ports, Unit of Work shape, concurrency tests,
and package ownership. A class diagram alone is not aggregate evidence.

## Verification

Domain verification includes:

- example-based state-transition and invariant tests;
- property-based tests for value objects, arithmetic, allocation, and ranges;
- model-based concurrency tests for aggregate command traces;
- rehydration round trips through both persistence adapters;
- domain-event assertions separate from integration-contract fixtures;
- negative tests proving invalid state is unrepresentable or rejected before
  mutation.

Architecture tooling can enforce imports, ownership, exports, and forbidden
framework types. It cannot prove the quality of an invariant or aggregate
boundary. Those require dossier evidence, scenario review, and executable domain
tests.
