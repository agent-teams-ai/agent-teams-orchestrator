# Agent Teams Orchestrator

Headless control plane for coordinating multi-agent teams.

The project is being designed as an event-driven modular monolith with:

- Clean and Hexagonal Architecture
- focused bounded contexts with domain-capability feature slices
- strategic and tactical Full Domain-Driven Design
- broker-neutral messaging with a NATS JetStream production adapter
- a provider-neutral runtime boundary backed by `ar`
- Protobuf, Buf, and Connect for the public control API
- separate JSON Schema contracts for integration events

## Project status

The repository is in the architecture-definition phase. Production code must not
be added until the relevant boundaries and contracts are accepted in an ADR.

## Documentation

- [Agent instructions](AGENTS.md)
- [Technical documentation index](docs/README.md)
- [Architecture overview](docs/architecture/overview.md)
- [Evolution and quality attributes](docs/architecture/evolution-quality-attributes.md)
- [Local Host lifecycle](docs/architecture/local-host-lifecycle.md)
- [Architecture index](docs/architecture/README.md)
- [Context map](docs/architecture/context-map.md)
- [Feature module standard](docs/architecture/feature-module-standard.md)
- [Machine-readable package catalog](architecture/package-catalog.yaml)
- [Persistence boundary](docs/architecture/persistence-boundary.md)
- [SDK and transports](docs/architecture/sdk-and-transports.md)
- [Public control contracts](docs/architecture/public-control-contracts.md)
- [Architecture decisions](docs/decisions/README.md)
- [Open decisions](docs/open-decisions/README.md)

## Intended clients

The orchestrator is headless. Desktop, web, CLI, automation, and third-party
applications communicate through versioned APIs and idiomatic SDKs built over
generated contract bindings. Client applications must not become owners of
orchestration or agent-runtime state. Local clients share a zero-touch,
Supervisor-managed Orchestrator Host; disconnecting a client does not stop
durable work.
