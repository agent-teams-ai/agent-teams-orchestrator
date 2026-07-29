---
id: architecture.feature-module-standard
type: architecture
status: accepted
owner: architecture
summary: Canonical feature-owned vertical-slice layout and responsibility rules.
related:
  - ADR-0051
  - ADR-0042
  - ADR-0012
  - ADR-0047
  - ADR-0033
  - ADR-0037
  - ADR-0038
code_anchors:
  - pattern: scripts/architecture/validate-package-topology.mjs
    enforcement: required
  - pattern: tooling/architecture-conformance/scripts/check-package-topology.mjs
    enforcement: required
---

# Feature Module Standard

## Hierarchy

```text
repository
  -> workspace package with one architectural role
      -> feature-owned capability slice
          -> role-appropriate internal layers
              -> operations and behavior
```

A workspace package is a hard bounded-context boundary after that context is
accepted. A feature module is a cohesive domain capability inside one Ubiquitous
Language. It is not an independent bounded context by default. A use case is one
operation.

Do not create one package per endpoint or one feature per class.

## Universal feature ownership

All production behavior under `packages/**` belongs to an explicit
`src/features/<feature>/` capability slice. This rule applies to bounded contexts,
integrations, platform capabilities, SDKs, and testing packages. Package role
determines the valid internal layers; it does not remove feature ownership.

A package-level `src/` may contain only:

- the curated public package entrypoint;
- package composition that wires feature public entrypoints;
- context-level Published Language and migration assembly that indexes
  feature-owned artifacts without redefining them;
- generated artifacts in an explicitly isolated generated directory;
- narrowly scoped package primitives whose ownership cannot belong to one feature.

The final exception requires an architecture decision. A broad `shared`, `common`,
`utils`, `services`, or `infrastructure` directory is not an acceptable exception.

Feature ownership is structural, while DDD depth is semantic:

- bounded-context domain capabilities use tactical DDD and the Clean Architecture
  layers required by their invariants;
- integration features own provider-specific contracts, mappings, ports, and
  adapters without inventing a domain model;
- platform features own technical capabilities and stable technical ports without
  pretending that infrastructure is a business domain;
- SDK features are sliced by public capability and own contracts, client
  operations, mappings, and tests;
- testing features own reusable fixtures, conformance suites, and harnesses by the
  capability they validate.

No package may postpone feature ownership until it becomes large. A package may
start with one feature, but production behavior still begins inside that feature.
Every materialized package, including an application, contains at least one real
source file under `src/features/<feature>/` and a colocated feature `README.md`
whose metadata is `type: feature`, `status: accepted`, and references the package
owner document. Package assembly files do not satisfy this gate.

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
        published-language/
        module.ts
        index.ts
  integrations/
    runtime-gateway/
      src/
        features/
          session-control/
          runtime-observation/
        module.ts
        index.ts
  platform/
    local-host-control/
      src/
        features/
          supervisor-bootstrap/
          host-discovery/
          component-lifecycle/
        module.ts
        index.ts
    eventing/
      src/
        features/
          outbox-relay/
        module.ts
        index.ts
  sdk/
    orchestrator/
      src/
        features/
          teams/
          tasks/
        module.ts
        index.ts
```

Application executables remain thin composition roots under `apps/**`.
`apps/local-supervisor` composes technical `local-host-control` features and
OS-specific adapters but contains no bounded-context domain or application
behavior. `apps/cli` composes the public SDK and, for explicit host administration
commands, a separate narrow local-host control client.

`packages/sdk/**` is reserved for supported distributable client libraries.
Executable clients belong in `apps/**`; protocol clients used only by one
integration remain inside that owning adapter. A generic top-level `clients/`
package family is not created preemptively.

## Feature layout

```text
features/task-model/
  contracts/
    control-api/
    published-language/
    integration-events/
  domain/
    aggregates/
      task/
        task.ts
        task-id.ts
        task-dependency.ts
        events/
    services/
    policies/
    specifications/
    errors/
    README.md
  application/
    models/
    use-cases/
    policies/
    ports/
      inbound/
      outbound/
  adapters/
    inbound/
    outbound/
      persistence/
        schema/
        migrations/
  module.ts
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

Aggregate-specific entities, value objects, factories, and domain events are
colocated under `domain/aggregates/<aggregate-name>/`. Feature-level policy,
service, specification, error, or value-object directories exist only when the
concept is genuinely shared by several aggregates inside that feature. Detailed
behavior follows the
[tactical modeling standard](../domain/tactical-modeling-patterns.md).

Business features use the layers required by their behavior. A pure integration
feature may have contracts, application ports, and adapters without a domain
aggregate. Do not invent entities, repositories, ports, or domain services to
satisfy a directory template.

Role-specific feature examples:

```text
packages/contexts/work-coordination/src/features/task-sync/
  contracts/
  application/
  adapters/
    outbound/
      jira/
  module.ts
  tests/

packages/platform/eventing/src/features/outbox-relay/
  contracts/
  ports/
  implementation/
  tests/

packages/sdk/orchestrator/src/features/teams/
  contracts/
  client/
  mappers/
  tests/
```

These examples are not mandatory folder templates. A directory exists only for
real owned artifacts.

## Growth guardrails

Feature ownership is enforced mechanically rather than remembered during review.
`architecture/package-catalog.yaml` is the default-deny registry of allowed
production package identities, roles, paths, names, and owner documents. A
proposed owner reserves a name and path but cannot materialize production files.
Before implementation packages are accepted, repository tooling must:

1. classify every workspace package by architectural role;
2. reject production source outside an allowed feature or package-assembly root;
3. enforce role-specific dependency direction and public feature entrypoints;
4. reject cross-feature deep imports and dependency cycles;
5. reject empty ceremonial DDD layers;
6. require an explicit architecture decision for package-level ownership
   exceptions;
7. validate every materialized package against the package catalog;
8. provide generators for new packages and features so the compliant path is the
   easiest path.

ADR-0038 owns the catalog and materialization policy. The package scaffolder reads
the catalog and cannot invent a package, role, path, or owner. Run it with
`pnpm architecture:scaffold-package -- --id <catalog-id>` only after the owner and
first slice are accepted. The generated boundary does not pass CI until a real
feature slice is added in the same change.

Durable process managers are owned by the feature or bounded context whose
business process they coordinate. Shared platform code may provide timers,
dispatch, persistence primitives, and test harnesses, but it must not become a
generic product workflow engine. A future Temporal adapter executes declared
workflow boundaries; it does not absorb domain policy.

Ordinary application coordination remains in named use cases. Create
`application/process-managers/` only for durable, stateful business processes
owned by that feature; do not create a generic `coordinators/` directory.

When a feature uses Temporal, direction is relative to the application core:

```text
features/<feature>/
  application/
    use-cases/
    process-managers/
    ports/
      inbound/
      outbound/
  adapters/
    inbound/
      temporal/
        workflows/
        activities/
        signals/
        queries/
    outbound/
      temporal/
        client/
```

A Temporal client is outbound because the application asks it to schedule or
signal durable work. Temporal workers, activities, signals, and queries are inbound
because Temporal invokes the application. Shared connection factories and worker
bootstrap may live in platform or an application composition root, but
feature-specific mappings and workflow contracts remain inside the owning feature.

Feature modules expose typed factories and narrow module APIs. They do not own DI
containers or import Awilix. A bounded context's private composition layer registers
feature factories and concrete adapters as defined by
[the composition standard](composition-and-dependency-injection.md).

## Layer responsibilities

### Contracts

Owns stable outer-boundary data:

- client API commands, queries, results, and errors;
- bounded-context Published Language;
- integration events;
- Protobuf control schemas, JSON integration-event schemas, and version metadata
  for their respective external boundaries.

Contracts do not expose aggregate instances or infrastructure types.
Application and domain code do not import public contracts. Physical ownership by
the feature does not make contracts an inner layer.

Client API contracts and context Published Language are distinct surfaces even when
the same feature owns both. They may have different compatibility, authorization,
and disclosure rules and must not be reused merely to avoid mapping code.

Feature contract directories own schema definitions. The context-level
`published-language` module is only a curated export and compatibility manifest; it
does not redefine or copy those schemas.

Each external contract surface starts with one explicit `v1` schema family.
Speculative `v2` directories, writers, adapters, and SDK models are prohibited.
ADR-0037 governs the migration required before a later major exists.

Public control `.proto` files and integration-event JSON Schemas are separate
feature-owned artifacts. A feature may map the same business fact to both, but
neither schema is generated from the other.

Every integration-event JSON Schema is accompanied by its event manifest covering
ownership, scope, authorization, privacy, ordering, delivery, retention, replay,
payload limits, and compatibility. Transport adapters consume that manifest;
broker configuration never becomes the only place where those semantics exist.

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

Inbound and outbound are named relative to the application core, not network
traffic, request/response payloads, or whether bytes enter or leave the process:

- an inbound adapter initiates an application use case through an inbound port;
- an outbound adapter is invoked by application code through an outbound port.

Examples:

```text
adapters/inbound/http/
adapters/inbound/cli/
adapters/inbound/jetstream-consumer/

adapters/outbound/sqlite/
adapters/outbound/postgres/
adapters/outbound/jetstream-publisher/
adapters/outbound/agent-runtime/
```

A technology may appear on both sides. A JetStream consumer and publisher are
separate adapter roles even when composition supplies the same connection. A
bidirectional integration must expose distinct inbound and outbound modules rather
than hide both directions behind a broad gateway. Direction follows who initiates
the application capability, not the eventual direction of returned data or events.

All behavior specific to one feature's external boundary remains inside that
feature's adapter directory. Context or process composition may share low-level
connections and lifecycle resources, but it must not own feature mappings,
repositories, handlers, schemas, or recovery policy.

An external-system adapter belongs to the feature that owns the use case, port,
mapping policy, and recovery decision. For example, Jira task synchronization
normally belongs to a Work Coordination feature, and an AR adapter implementing a
run capability belongs to the consuming orchestration feature. Promote an adapter
to `packages/integrations/**` only when it has proven cross-context reuse,
independent lifecycle or publication, or a dedicated provider conformance surface.
The integration package may own protocol clients and mappings but never the
consumer's business policy.

`@agent-teams/runtime-gateway` is the accepted narrow AR integration boundary. It
owns the AR Published Language client, transport behavior, protocol mapping
primitives, and consumer-side Runtime Published Language client and ACL
conformance. Provider-driver and provider-behavior conformance remain owned and
published by AR. The gateway is not the consumer-owned feature adapter: each
consuming feature still owns the adapter from its application port to that
gateway. The gateway cannot import business contexts or define Team, Task, Run,
Approval, or teammate-message semantics.

Feature-specific tables, indexes, schema fragments, and dialect migration
implementations remain with the feature's outbound persistence adapter. They are
not moved into a context-wide infrastructure folder.

Application code never accepts an SDK DTO directly.

Adapters may contain technology-specific recovery and mapping behavior but no
business invariant that belongs in the domain.

### Composition

Composition is an assembly responsibility, not a mandatory DDD layer or directory.
It has three possible levels:

1. An optional feature `module.ts` wires feature-local handlers and receives
   required ports.
2. Context `module.ts` wires features and context-owned adapters and assembles
   feature migration contributions into one deterministic context bundle.
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

Context composition owns only migration assembly: ordering, dependency validation,
compatibility checks, and the single context migration entry point. It does not
own feature schemas or rewrite migration SQL. Features never acquire migration
locks or run migrations independently.

### Projection responsibilities

Each context owns projections derived from its state and events. A feature may own
projection handlers and read models for its capability. Cross-context client views
are assembled by an edge Query Composition adapter, not a global projection
bounded context.

`projections/` is not a universal feature layer. Projection policy and projectors
belong in application code, inbound event handlers belong in inbound adapters, and
read-model persistence belongs in outbound adapters. Create named directories only
for real artifacts.

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
