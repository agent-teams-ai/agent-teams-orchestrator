# Agent Teams Orchestrator

Headless control plane for coordinating multi-agent teams.

The project is being designed as an event-driven modular monolith with:

- Clean and Hexagonal Architecture
- focused bounded contexts with domain-capability feature slices
- strategic and tactical Full Domain-Driven Design
- broker-neutral messaging with a NATS JetStream production adapter
- a provider-neutral runtime boundary backed by `ar`
- versioned contracts suitable for SDK generation

## Project status

The repository is in the architecture-definition phase. Production code must not
be added until the relevant boundaries and contracts are accepted in an ADR.

## Documentation

- [Agent instructions](AGENTS.md)
- [Technical documentation index](docs/README.md)
- [Architecture overview](docs/architecture/overview.md)
- [Context map](docs/architecture/context-map.md)
- [Feature module standard](docs/architecture/feature-module-standard.md)
- [Persistence boundary](docs/architecture/persistence-boundary.md)
- [Architecture decisions](docs/decisions/README.md)
- [Open decisions](docs/open-decisions.md)

## Intended clients

The orchestrator is headless. Desktop, web, CLI, automation, and third-party
applications communicate through versioned APIs and generated clients. Client
applications must not become owners of orchestration or agent-runtime state.
