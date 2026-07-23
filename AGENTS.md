# Agent Navigation and Guardrails

This file is the entry point for coding agents. It is intentionally short and
points to canonical documents instead of duplicating them.

## Start here

Read these documents before proposing or changing architecture:

1. [Technical documentation index](docs/README.md)
2. [Architecture overview](docs/architecture/overview.md)
3. [Context map](docs/architecture/context-map.md)
4. [Feature module standard](docs/architecture/feature-module-standard.md)
5. [Dependency rules](docs/architecture/dependency-rules.md)
6. [Runtime boundary](docs/architecture/runtime-boundary.md)
7. [Eventing and reliability](docs/architecture/eventing-and-reliability.md)
8. [SDK and transports](docs/architecture/sdk-and-transports.md)
9. [Extension points](docs/architecture/extension-points.md)
10. [Open decisions](docs/open-decisions.md)
11. [Accepted ADRs](docs/decisions/README.md)

Terminology is defined in [the glossary](docs/glossary.md).

## Current state

The repository is in the architecture-definition phase. Do not introduce
production behavior, dependencies, transports, databases, or framework
scaffolding until the corresponding decision is accepted.

When a requested change depends on an unresolved decision:

1. identify the decision explicitly;
2. present concrete alternatives and tradeoffs;
3. record the accepted outcome as an ADR;
4. only then implement it.

## Product boundary

This repository owns multi-agent coordination:

- teams, members, and roles;
- project and workspace scope;
- tasks, assignments, and dependencies;
- orchestration runs and completion policy;
- messages, inboxes, and handoffs;
- approvals and coordination policies;
- provider-neutral runtime commands and projections.

This repository does not own provider execution. The `ar` runtime owns agent
processes, sessions, resume, cancellation, recovery, leases, fencing, sandboxing,
and provider-specific drivers.

## Non-negotiable architecture rules

1. Use feature-owned vertical slices inside bounded-context packages.
2. Domain code is pure and depends on no framework, transport, database, runtime,
   filesystem, clock implementation, or process API.
3. Application code depends on domain code and declared ports only.
4. Adapters implement ports; ports never import adapters.
5. Bounded contexts do not deep-import each other's internals.
6. A context consumes another context through a consumer-owned port, an adapter,
   and the provider's published contract, or through versioned integration events.
7. Every aggregate has exactly one owning feature.
8. Provider-specific behavior does not enter orchestration domain code.
9. NATS, Temporal, `ar`, SQLite, PostgreSQL, Electron, and HTTP are adapters.
10. External commands, events, and snapshots use strict versioned schemas.
11. At-least-once delivery is assumed. Consumers must be idempotent.
12. There is no global event ordering guarantee. Each public contract declares
    its ordering scope; consumers must tolerate every ordering not declared.
13. State persistence and outbox publication must share a transactional boundary.
14. Event sourcing is not the default persistence model.
15. There must be exactly one owner of each process and runtime mutation.
16. SDKs contain transport and contract logic, never orchestration business logic.
17. Every team, task, run, message, and runtime binding is scoped to a project.
18. Public transport/SDK contracts never become application or domain models.
19. Process-wide resources are created only by the application composition root.

## Planned repository shape

```text
apps/
  service/
  desktop-sidecar/
packages/
  contexts/
    project-workspace/
    identity-access/
    team-management/
    task-coordination/
    run-orchestration/
    messaging/
    policy-approvals/
  integrations/
    runtime-gateway/
    task-board-adapters/
  platform/
    eventing/
    persistence/
    observability/
    schema-registry/        # indexes feature-owned schemas; does not own them
  clients/
    sdk-typescript/
  kernel/
  testing/
docs/
  architecture/
  decisions/
```

The shape is a target, not permission to create every directory immediately.
Create packages and features only when an accepted use case requires them.

## Change workflow

For architecture or implementation work:

1. identify the owning bounded context and feature;
2. confirm dependency direction;
3. define application input/output models and public contracts separately;
4. model invariants in the domain, not in transport handlers;
5. implement the application use case through narrow ports;
6. add adapters at the edge;
7. add domain, application, contract, and architecture tests proportional to risk;
8. update documentation and ADRs in the same change.

## Prohibited shortcuts

Do not:

- create a generic `shared` package for business logic;
- expose feature internals through broad barrel exports;
- import public SDK/transport schemas into application or domain code;
- import Electron, NATS, Temporal, `ar`, or provider SDKs into domain/application;
- put OpenCode, Claude, or Codex branches in orchestration domain services;
- spawn or kill agent processes from the orchestrator core;
- use frontend DTOs as domain entities;
- publish unversioned events;
- rely on exactly-once broker delivery;
- implement distributed transactions between bounded contexts;
- write another context's tables, projections, inbox, or outbox;
- instantiate process-wide runtime, broker, or database clients inside a feature;
- add a second process owner during migration;
- copy legacy code into the core without classifying its responsibility;
- test agent execution against real user projects.

## Runtime testing safety

Never test agent launch, provisioning, task assignment, terminal runtime, recovery,
or message delivery on real user projects. Use newly created sandbox projects or
explicitly test-only fixtures.

## Documentation ownership

- `docs/architecture/` defines current architecture rules.
- `docs/decisions/` records accepted decisions and their consequences.
- `docs/open-decisions.md` lists unresolved design questions.
- Feature READMEs document local behavior without redefining global rules.

If documents conflict, accepted ADRs take precedence, followed by architecture
documents, then feature-local documentation. Update stale documents rather than
allowing two sources of truth.
