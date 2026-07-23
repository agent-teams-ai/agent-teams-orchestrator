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
    commands/
    queries/
    events/
    schemas/
  domain/
    aggregates/
    entities/
    value-objects/
    events/
    services/
    errors/
  application/
    use-cases/
    policies/
    ports/
      in/
      out/
  adapters/
    in/
    out/
  composition/
  tests/
    domain/
    application/
    contract/
```

Directories are created only when they contain a real artifact. Empty ceremonial
folders are prohibited.

## Layer responsibilities

### Contracts

Owns stable boundary data:

- commands and query inputs;
- query results;
- integration events;
- external error codes;
- JSON Schemas and version metadata.

Contracts do not expose aggregate instances or infrastructure types.

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
- transaction boundaries;
- application policies;
- ports;
- authorization of business operations;
- mapping domain events to publication intent.

Application code must not know which adapter implements a port.

### Adapters

Inbound adapters translate transport requests into application contracts.
Outbound adapters implement application ports for storage, runtime, messaging,
workflow, clocks, IDs, and external systems.

Adapters may contain technology-specific recovery and mapping behavior but no
business invariant that belongs in the domain.

### Composition

Composition is the only feature-local layer allowed to instantiate concrete
adapters and wire them to application services.

## Aggregate ownership

Every aggregate has one owning feature. Other features interact through:

- the owner's public application API;
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
