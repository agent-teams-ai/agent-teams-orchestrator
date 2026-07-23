# Dependency Rules

Status: **Accepted**

## Dependency direction

```mermaid
flowchart LR
    Inbound["Inbound Adapters"] --> Application["Application"]
    Inbound --> Contracts["Public Contracts"]
    Application --> Domain["Domain"]
    Outbound["Outbound Adapters"] --> Application
    Outbound --> Contracts
    Composition["Composition Root"] --> Inbound
    Composition --> Outbound
    Composition --> Application
    SDK["SDK"] --> Contracts
```

Dependencies point inward. Runtime calls may flow outward through interfaces, but
source-code dependencies do not.

## Allowed dependency matrix

| From | May depend on |
|---|---|
| Domain | Feature domain, minimal kernel |
| Application | Feature domain, application models and ports, minimal kernel |
| Contracts | Schema primitives and minimal contract kernel |
| Inbound adapters | Feature contracts and application input ports |
| Outbound adapters | Application output ports, public event contracts when publishing, and external libraries |
| Composition | All layers in its own package and public APIs of dependencies |
| SDK | Published contracts and transport libraries |

## Forbidden dependencies

Domain and application layers must not import:

- public SDK, HTTP, gRPC, JSON-RPC, or integration-event schemas;
- Electron, React, browser globals, or frontend stores;
- NATS, Temporal, HTTP servers, gRPC servers, or broker clients;
- `ar` implementation modules;
- OpenCode, Claude, Codex, or other provider SDKs;
- Node filesystem, child-process, or network implementations;
- concrete database clients;
- another bounded context's internal modules.

## Cross-context dependencies

For synchronous collaboration, the consuming context declares a narrow outbound
port. An adapter implements that port against the provider context's published
contract. Asynchronous collaboration uses integration-event contracts.

Cycles between bounded-context packages are prohibited. When two contexts need
bidirectional collaboration, prefer events, a process manager, or move the
genuinely shared concept to the context that owns its lifecycle. Do not solve a
cycle by importing both public application facades.

A direct in-process adapter is permitted as a deployment optimization, but it must
implement the same consumer-owned port and published contract used by a future
remote adapter.

## Enforcement

The implementation phase must add automated architecture tests for:

- package export boundaries;
- forbidden imports by layer;
- cross-context deep imports;
- dependency cycles;
- provider-specific symbols in domain/application;
- public contract imports in domain/application;
- transport-specific symbols in contracts;
- unversioned integration events.

TypeScript path aliases are conveniences, not boundaries. `package.json` exports,
workspace dependencies, lint rules, and architecture tests enforce boundaries.

## Dependency inversion examples

The consuming application declares a narrow capability:

```ts
interface RuntimeLifecyclePort {
  startRun(command: StartRunCommand): Promise<StartRunResult>;
}
```

An adapter implements it using `ar`. The application never imports the `ar`
client.

The application declares an outbox publication port; a context-owned persistence
adapter stores publication intent transactionally, and a JetStream relay publishes
it. Replacing JetStream must not change domain or application code.
