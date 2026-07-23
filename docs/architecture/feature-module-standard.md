# Feature Module Standard

Status: **Accepted structural direction; exact domain modules follow context discovery**

## Hierarchy

```text
repository
  -> bounded-context workspace package
      -> domain-capability feature module
          -> domain/application/adapters/composition
              -> use cases
```

A workspace package is a hard bounded-context boundary after that context is
accepted. A feature module is a cohesive domain capability inside one Ubiquitous
Language. It is not an independent bounded context by default. A use case is one
operation.

Do not create one package per endpoint or one feature per class.

## Target workspace layout

```text
packages/
  contexts/
    work-coordination/
      package.json
      src/
        features/
          task-model/
          dependency-model/
          subscriptions/
          handoffs/
        processes/
        api/
        published-language/
        composition/
        index.ts
```

## Feature layout

```text
features/task-model/
  contracts/
    api/
    published/
  domain/
    aggregates/
    entities/
    value-objects/
    events/
    services/
    errors/
  application/
    models/
    use-cases/
    policies/
    ports/
      in/
      out/
  adapters/
    in/
    out/
  composition/
  projections/
  tests/
    domain/
    application/
    contract/
```

`task-model` owns every mutation of the `Task` aggregate, including assignment when
assignment is part of the Task invariant. A UI action or verb is not automatically a
separate feature.

Directories are created only when they contain a real artifact. Empty ceremonial
folders are prohibited.

Business features use the layers required by their behavior. A pure integration
feature may have contracts, application ports, and adapters without a domain
aggregate. Do not invent entities, repositories, ports, or domain services to
satisfy a directory template.

## Layer responsibilities

### Contracts

Owns stable outer-boundary data:

- client API commands, queries, results, and errors;
- bounded-context Published Language;
- integration events;
- JSON Schemas and version metadata for external boundaries.

Contracts do not expose aggregate instances or infrastructure types.
Application and domain code do not import public contracts. Physical ownership by
the feature does not make contracts an inner layer.

Client API contracts and context Published Language are distinct surfaces even when
the same feature owns both. They may have different compatibility, authorization,
and disclosure rules and must not be reused merely to avoid mapping code.

Feature contract directories own schema definitions. The context-level
`published-language` module is only a curated export and compatibility manifest; it
does not redefine or copy those schemas.

### Domain

Owns business meaning and invariants:

- aggregates;
- entities;
- value objects;
- domain events;
- domain services;
- invariant violations.

Domain behavior must be deterministic for the same explicit inputs. Time, IDs,
randomness, and external facts enter through application orchestration.

### Application

Owns use-case coordination:

- command handlers;
- query handlers;
- transport-independent application input and output models;
- transaction boundaries;
- application coordination policies;
- ports;
- authorization of business operations;
- mapping domain events to publication intent;
- staging durable command-dispatch intent with state transitions.

Application code must not know which adapter implements a port.

### Adapters

Inbound adapters validate public contracts and map them into application input
models. Outbound adapters implement application ports for storage, runtime,
messaging, workflow, clocks, IDs, and external systems. Outbound integration-event
adapters map domain or application publication intent into public event schemas.

Application code never accepts an SDK DTO directly.

Adapters may contain technology-specific recovery and mapping behavior but no
business invariant that belongs in the domain.

### Composition

Composition has three levels:

1. A feature factory wires feature-local handlers and receives required ports.
2. Context composition wires features and context-owned adapters.
3. The application composition root creates process-wide resources such as
   database pools, NATS connections, runtime clients, clocks, and telemetry.

A feature must not instantiate process-wide resources. This prevents duplicate
runtime ACL clients, broker clients, transaction managers, and process owners.

The application composition root is the only place that may:

- construct context bridges and choose concrete adapters;
- order `start`, `ready`, `stop`, and `dispose` lifecycles;
- roll back partially started compositions;
- share a technical connection pool without sharing context repositories or
  transactions.

### Projections

Each context owns projections derived from its state and events. A feature may own
projection handlers and read models for its capability. Cross-context client views
are assembled by an edge Query Composition adapter, not a global projection
bounded context.

## Aggregate and internal-module ownership

Every aggregate implementation has one owning domain-capability feature. Another
feature inside the same bounded context:

- may depend on an explicit context-internal API;
- may use stable identities and Ubiquitous Language types exposed for that context;
- must ask the owning application capability to mutate the aggregate;
- must not import the aggregate repository or mutate aggregate internals.

Cross-aggregate workflows belong in application coordination or explicit process
managers. Published Language, ACLs, and integration events are required across
bounded contexts, not as ceremony between every pair of features in one context.

The context maintains an explicit directed dependency graph between internal
features. Cycles are resolved by moving the shared concept to its semantic owner,
introducing an application coordinator, or revisiting the feature boundary.

## Package surfaces

Each bounded-context package exposes deliberately separate surfaces. Exact export
names are conventional and may be adapted per context:

```text
./module       module factory and lifecycle for the application composition root
./api          provider-owned inbound application API
./published    Published Language and public read contracts
./contracts/*  external API and integration-event schemas
./testing      fixtures and context contract kits
```

Consumer-owned outbound ports remain private to the consuming application package
unless a separately packaged adapter must implement them. In that case a narrow
`./spi/<capability>` export is allowed; a broad `./spi` barrel is not.

Package `exports` must prevent consumers from importing feature internals.

Allowed:

```ts
import { createWorkCoordination } from "@agent-teams/work-coordination/module";
```

Forbidden:

```ts
import { Task } from "@agent-teams/work-coordination/src/features/task-model/domain/Task";
```

## Shared code policy

A root shared kernel is not created by default. It requires an ADR that names its
owners, versioning policy, and exact allowlist. It must never contain
`BaseAggregate`, generic repositories, global business errors, tenant/project
domain identities, policies, provider branches, or convenience services.

Stable technical contract primitives may live in a narrowly named contract package
when duplication would break interoperability. Context-local business identities
and concepts remain context-owned even when their serialized values look alike.

Platform persistence packages may expose technical drivers and transaction
primitives. Context-owned repository adapters, tables, migrations, inboxes,
outboxes, and projections remain inside their owning context.

Before adding shared code, ask:

1. Does it represent the same concept with the same lifecycle in every context?
2. Would duplication be cheaper than semantic coupling?
3. Can the behavior be expressed through a contract instead?

## Promoting a feature to a package

Promotion is justified only when a feature needs independent:

- deployment or scaling;
- ownership or release cadence;
- security boundary;
- persistence lifecycle;
- external API.

Promotion requires an ADR and contract compatibility plan.
