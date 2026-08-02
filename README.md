# Agent Teams Orchestrator

Headless control plane for coordinating multi-agent teams.

The project is being designed as an event-driven modular monolith with Clean and
Hexagonal Architecture, strategic and tactical Full DDD, broker-neutral
messaging, provider-neutral runtime integration, and versioned public contracts.

## Project status

The repository is in architecture definition. Production code is gated by
accepted boundaries, accepted decisions, and the first approved vertical slice.

## Canonical repositories

- [`agent-teams-ai/agent-teams-orchestrator`](https://github.com/agent-teams-ai/agent-teams-orchestrator)
  is the public canonical orchestrator repository.
- [`agent-teams-ai/agent-runtime`](https://github.com/agent-teams-ai/agent-runtime)
  is the public canonical agent-runtime repository.

Both repositories are licensed under Apache-2.0. Repository location does not
replace versioned Published Languages, SDK contracts, or anti-corruption
boundaries between the systems. ADR-0070 records the governance decision.

## Start here

- [Agent navigation and guardrails](AGENTS.md)
- [Technical documentation map](docs/README.md)
- [Architecture index](docs/architecture/README.md)
- [Open decisions](docs/open-decisions/README.md)

The machine-readable package topology is reserved in
[`architecture/package-catalog.yaml`](architecture/package-catalog.yaml).

## Engineering foundation

Normal development and CI use the exact public
`@agent-teams/engineering-foundation` version recorded in the manifest and
lockfile. Cross-repository foundation work uses the guarded local lifecycle:

```bash
pnpm foundation:attach -- /absolute/path/to/engineering-foundation
pnpm foundation:status
pnpm foundation:detach
pnpm foundation:check
```

Run the complete consumer lifecycle proof with:

```bash
pnpm foundation:e2e -- /absolute/path/to/engineering-foundation
```

CI requires registry mode. Product code cannot import the development-only
foundation package.
Dependabot checks npm every weekday and opens a dedicated reviewed exact-version
update pull request for new Foundation releases; floating ranges and automerge
are forbidden, and adding a capability is separate from updating package bytes.

## Product shape

The orchestrator is headless. Desktop, web, CLI, automation, and third-party
applications use versioned APIs and SDKs. Local and hosted compositions share the
same business core and contracts. Client applications do not own orchestration or
agent-runtime state.
