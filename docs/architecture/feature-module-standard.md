# Feature Module Standard

Status: **Accepted**

## Hierarchy

```text
repository
  -> bounded-context workspace package
      -> feature module
          -> domain/application/adapters/composition
              -> use cases
```

A workspace package is a hard architectural boundary. A feature module is a
cohesive business capability inside that boundary. A use case is one operation.

Do not create one package per endpoint or one feature per class.

## Target workspace layout

```text
packages/
  contexts/
    task-coordination/
      package.json
      src/
        features/
          task-lifecycle/
          assignment/
          dependencies/
          subscriptions/
        public/
        composition/
        index.ts
```

## Feature layout

```text
features/task-lifecycle/
  contracts/
    schemas/
      commands/
      queries/
      events/
      errors/
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

Directories are created only when they contain a real artifact. Empty ceremonial
folders are prohibited.

Business features use the layers required by their behavior. A pure integration
feature may have contracts, application ports, and adapters without a domain
aggregate. Do not invent entities or domain services to satisfy a directory
template.

## Layer responsibilities

### Contracts

Owns stable external boundary data:

- public command and query schemas;
- public query-result schemas;
- integration events;
- external error codes;
- JSON Schemas and version metadata.

Contracts do not expose aggregate instances or infrastructure types.
Application and domain code do not import public contracts. Physical ownership by
the feature does not make contracts an inner layer.

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
- application policies;
- ports;
- authorization of business operations;
- mapping domain events to publication intent.

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
runtime gateways, broker clients, transaction managers, and process owners.

### Projections

Each context owns projections derived from its state and events. A feature may own
projection handlers and read models for its capability. Cross-context client views
are assembled by an edge Query Composition adapter, not a global projection
bounded context.

## Aggregate ownership

Every aggregate has one owning feature. Other features interact through:

- a consumer-owned port and adapter to the owner's published contract;
- domain-neutral references;
- integration events.

Direct aggregate sharing is prohibited because it creates hidden coupling and
unclear transaction ownership.

## Public API

Each bounded-context package exports a deliberately small facade from `src/public`.
Package `exports` must prevent consumers from importing feature internals.

Allowed:

```ts
import { createTaskCoordination } from "@agent-teams/task-coordination";
```

Forbidden:

```ts
import { Task } from "@agent-teams/task-coordination/src/features/task-lifecycle/domain/Task";
```

## Shared code policy

The root `kernel` package is intentionally tiny. It may contain stable technical
primitives such as identifiers, event metadata, and result types. It must not
contain business policies, provider branches, or convenience services.

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
