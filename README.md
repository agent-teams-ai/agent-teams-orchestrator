# Agent Teams Orchestrator

Headless control plane being designed for collaboration between people and AI
agents, with shared Teams and Tasks and separate agent execution.

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
Dependabot is limited to security updates by `open-pull-requests-limit: 0` in
`.github/dependabot.yml`. New Foundation releases are adopted through dedicated,
manually opened, reviewed exact-version pull requests; floating ranges and
automerge are forbidden, and adding a capability is separate from updating
package bytes. This deviates from the Dependabot statement in ADR-0059 until a
superseding ADR is accepted.

The package catalog remains Orchestrator-owned. A qualified library boundary uses
the Foundation Plan, Apply, and Recover protocol:

```bash
pnpm architecture:scaffold-package -- plan --id <catalog-id>
pnpm architecture:scaffold-package -- apply --plan <saved-plan-path>
pnpm architecture:scaffold-package -- recover
```

There is no one-shot command. Review the saved Plan before Apply, then add the
accepted first feature and root project reference in the same change.

## Product shape

The orchestrator is headless. Desktop, web, CLI, automation, and third-party
applications use versioned APIs and SDKs. Local and hosted compositions share the
same business core and contracts. Client applications do not own orchestration or
agent-runtime state.

Standalone Self-Hosted is an independent product direction: one installation can
serve multiple separately governed organizations, and one human can have
independent memberships in several of them. People perform manual Tasks without
an agent process. Team participation, permissions, and AI activation remain
separate; their remaining choices are recorded in
[mixed collaboration](docs/open-decisions/OD-048-mixed-human-and-ai-team-participation.md).

The commercial [Platform](https://github.com/agent-teams-ai/agent-teams-platform)
consumes Orchestrator API/SDK capabilities. Its
[product relationship and boundary](https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md)
owns the hosted integration direction. Orchestrator retains the independent
authority adapters and [composition boundaries](docs/architecture/composition-and-dependency-injection.md#shared-mechanisms-and-independent-products)
needed by standalone and managed delivery.

The [discussion and research coverage](docs/research/collaboration-hierarchy-and-workspace-review-2026-10-22.md)
maps organizations, human/AI Teams, Tasks, Workspace naming, module foundation,
and Platform integration to their owners and remaining decisions. Service
topology and Dapr/Protobuf now have a separate
[canonical backend adoption](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/94a480d004e8e6eaf79507feeae30428d372a3d3/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md).
This pending branch's remaining reconciliation with current main is recorded in
[branch integration status](docs/architecture/overview.md#branch-integration-status).
