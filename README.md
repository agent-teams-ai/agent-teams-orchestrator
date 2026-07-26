# Agent Teams Orchestrator

Headless control plane for coordinating multi-agent teams.

The project is being designed as an event-driven modular monolith with Clean and
Hexagonal Architecture, strategic and tactical Full DDD, broker-neutral
messaging, provider-neutral runtime integration, and versioned public contracts.

## Project status

The repository is in architecture definition. Production code is gated by
accepted boundaries, accepted decisions, and the first approved vertical slice.

## Start here

- [Agent navigation and guardrails](AGENTS.md)
- [Technical documentation map](docs/README.md)
- [Architecture index](docs/architecture/README.md)
- [Open decisions](docs/open-decisions/README.md)

The machine-readable package topology is reserved in
[`architecture/package-catalog.yaml`](architecture/package-catalog.yaml).

## Product shape

The orchestrator is headless. Desktop, web, CLI, automation, and third-party
applications use versioned APIs and SDKs. Local and hosted compositions share the
same business core and contracts. Client applications do not own orchestration or
agent-runtime state.
