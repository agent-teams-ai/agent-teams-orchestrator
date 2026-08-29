---
id: architecture.feature-module-standard
type: architecture
status: accepted
owner: architecture
summary: Orchestrator adoption profile and local extensions for the organization Feature Module Standard v1.
related:
  - ADR-0012
  - ADR-0037
  - ADR-0038
  - ADR-0042
  - ADR-0047
  - ADR-0051
  - ADR-0060
  - ADR-0075
  - ADR-0093
  - ADR-0098
code_anchors:
  - enforcement: required
    pattern: architecture/feature-module-standard-profile.json
  - enforcement: required
    pattern: architecture/source-dependency-policy.schema.json
  - enforcement: required
    pattern: architecture/source-dependency-policy.yaml
  - enforcement: required
    pattern: scripts/architecture/validate-feature-module-standard-profile.mjs
  - enforcement: required
    pattern: scripts/architecture/validate-package-topology.mjs
  - enforcement: required
    pattern: tooling/architecture-conformance/scripts/check-package-topology.mjs
---

# Orchestrator Feature Module Profile

## Adoption

Agent Teams Orchestrator adopts the immutable organization
[Feature Module Standard v1](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/feature-module-standard/v1.md).
The standard identity is `agent-teams.feature-module-standard`, version `v1`,
with SHA-256
`851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa`.

The machine-readable adoption is
[`architecture/feature-module-standard-profile.json`](../../architecture/feature-module-standard-profile.json).
ADR-0098 accepts the organization standard and this local profile.

The organization standard owns universal feature ownership, layer
responsibilities, dependency mechanisms, test ownership, shared-code policy,
and extraction criteria. This document owns only the Orchestrator mapping,
technology extensions, stricter constraints, and enforcement coordinates.

There are no deviations from `v1`. A future deviation requires a repository
architecture decision and a complete machine-readable deviation record. A
successor organization standard does not apply until Orchestrator explicitly
adopts it.

## Scope mapping

The standard's abstract hierarchy maps to Orchestrator as follows:

```text
repository
  -> workspace package with one cataloged architectural role
      -> src/features/<feature>/ capability slice
          -> role-appropriate internal layers
              -> operations and behavior
```

Production roots are `packages/**` and thin executable applications under
`apps/**`. Repository tooling under `scripts/**` and `tooling/**` is outside the
production feature-ownership scope and follows the repository-tooling
architecture instead.

Every materialized production package MUST contain at least one real source file
under `src/features/<feature>/` and one colocated feature `README.md` with
`type: feature`, `status: accepted`, and a reference to the package owner
document. Package assembly files do not satisfy this gate.

A package-level `src/` may contain only:

- the curated public package entry point;
- package composition that wires feature public entry points;
- context-level Published Language and migration assembly that index
  feature-owned artifacts without redefining them;
- generated artifacts under an explicitly isolated generated directory;
- narrowly scoped package primitives accepted by an architecture decision.

Foundation-owned terminal cleanup evidence under the exact
`.foundation-retired-evidence-` directory is transaction evidence rather than
production source and is excluded from topology inventory. No other hidden
directory receives that exclusion.

### Workspace layout

```text
packages/
  contexts/
    work-coordination/
      src/
        features/
          task-model/
          dependency-model/
          subscriptions/
          handoffs/
        published-language/
        composition/
          context-composition.ts
        index.ts
      tests/
        features/
          task-model/
        package/
  integrations/
    runtime-gateway/
      src/
        features/
          session-control/
          runtime-observation/
        composition/
          package-composition.ts
        index.ts
  platform/
    local-host-control/
      src/
        features/
          supervisor-bootstrap/
          host-discovery/
          component-lifecycle/
        composition/
          package-composition.ts
        index.ts
    eventing/
      src/
        features/
          outbox-relay/
  sdk/
    orchestrator/
      src/
        features/
          teams/
          tasks/
```

Application executables remain thin composition roots under `apps/**`.
`apps/local-supervisor` composes technical local-host-control features and
OS-specific adapters but contains no bounded-context domain or application
behavior. `apps/cli` composes the public SDK and, for explicit host
administration commands, a separate narrow local-host-control client.

`packages/sdk/**` is reserved for supported distributable client libraries.
Executable clients belong in `apps/**`. Protocol clients used only by one
integration remain inside that owning adapter. A generic top-level client
package family is not created preemptively.

### Feature layout

The standard's role-oriented feature layout maps to TypeScript directories:

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
  composition/
    feature-module-factory.ts

tests/features/task-model/
  contract/
  integration/
  adapters/

tests/package/
  packed-consumer/
```

`task-model` owns every mutation of the `Task` aggregate, including assignment
when assignment is part of the Task invariant. A UI action or verb is not
automatically a separate feature.

Focused white-box unit tests are colocated as `*.test.ts` or `*.spec.ts`.
Feature contract, integration, adapter, persistence, and conformance tests live
under `tests/features/<feature>/`. Package export, declaration,
packed-artifact, and black-box consumer tests live under `tests/package/`.

Colocated tests are compiled by a separate no-emit test configuration and are
excluded from production builds and published artifacts. That configuration is
created with the first TypeScript test, not as empty scaffolding.

Role-specific feature layouts may be smaller:

```text
packages/contexts/work-coordination/src/features/task-sync/
  contracts/
  application/
  adapters/outbound/jira/
  composition/feature-module-factory.ts

packages/platform/eventing/src/features/outbox-relay/
  contracts/
  ports/
  implementation/

packages/sdk/orchestrator/src/features/teams/
  contracts/
  client/
  mappers/
```

These are examples, not ceremonial templates. A directory exists only for real
owned artifacts.

## Local extensions

### Package identity and materialization

[`architecture/package-catalog.yaml`](../../architecture/package-catalog.yaml)
is the default-deny authority for production package identities, roles, paths,
names, and owner documents. A proposed owner reserves a name and path but cannot
materialize production files.

An entry marked `state: deferred` in
[`architecture/package-materialization-policy.yaml`](../../architecture/package-materialization-policy.yaml)
remains non-materializable even when its owner document is accepted. The
topology validator and scaffolder both reject it. Reserved Fully Local entries
retain machine-readable `blocked_by` decisions. CI permits `allowed` only after
every listed gate is resolved and `decision` names the accepted ADR that
resolves OD-040. This starts implementation but does not qualify the Fully Local
deployment profile.

Deleting a reservation or policy, or substituting an unrelated ADR, is not a
valid bypass. A root-level `.gitkeep` may preserve an empty supported workspace
family without materializing a package; every other production file requires a
cataloged package boundary.

ADR-0038 owns the package catalog, ADR-0097 owns the separate materialization
policy, and ADR-0081 owns delegation to the versioned Foundation scaffolding
protocol. Foundation cannot invent a package identity, role, path, or owner.

After the package owner and first feature are accepted, use the reviewed
Plan/Apply flow:

```bash
pnpm architecture:scaffold-package -- plan --id <catalog-id>
pnpm architecture:scaffold-package -- apply --plan <saved-plan-path>
```

Review the immutable Plan between commands. After interruption, run
`pnpm architecture:scaffold-package -- recover`. Recovery intentionally does not
depend on unrelated topology validity. A generated boundary does not pass CI
until the same change adds one real feature and the root project reference.

### Source dependencies and internal APIs

[`architecture/source-dependency-policy.yaml`](../../architecture/source-dependency-policy.yaml)
allows each production dependency by exact consumer, provider, and exported
subpath. A manifest dependency, role-compatible direction, or architecture-model
relationship does not grant a source import.

Cross-package relative, absolute, `file:`, wildcard, package-root, deep, and
package-alias bypasses are prohibited. Orchestrator policy owns package identity,
role, and allowed subpaths. Foundation independently checks physical boundaries,
ambiguous classification, runtime and type-only cycles, declared entry points,
and relative-import bypasses. Both gates must pass. Neither gate can widen the
other.

Each internal feature edge is declared once by package, consumer feature,
provider feature, and allowed internal surface. The policy is default-deny and
rejects cycles, unused edges, and ambiguous edges.

Only `domain/internal-api.ts` and `application/internal-api.ts` may expose sibling
feature internals. Domain code may consume only a sibling domain internal API.
Application code may consume domain or application internal APIs. Adapters reach
sibling features through their own application core; composition injects the
implementation. Internal APIs never expose repositories, aggregate
implementations, adapters, containers, or framework types.

### TypeScript package publication

Every materialized TypeScript library exposes built ESM and declaration targets
under `dist/**`, declares `"type": "module"`, and gives every non-null exported
subpath both `types` and ESM `import` targets. Source-only exports are prohibited.

Each package manifest provides blocking `check`, `typecheck`, `build`, and `test`
scripts. Root gates run them without `--if-present`. The build is tested through
the real root export, a declaration consumer, and an isolated packed-artifact
consumer. Root TypeScript project references contain every materialized package
exactly once after path normalization.

### Composition and dependency selection

Feature modules expose typed factories and narrow APIs. They do not own
dependency-injection containers or import Awilix. Private Awilix containers may
exist only under context or package `composition/**`; Awilix types never cross
that boundary.

Static dependencies use imports and typed factories. Replaceable internal
implementations use consumer-owned ports selected by composition. Dynamic
plugins use the separately accepted closed graph compiler and immutable
activation plan only when a real runtime-selection capability requires it.

Generic `module.ts` feature files, ambient `resolve()`, service locators,
parent-container fallback, registration-order semantics, and global mutable
registries are prohibited. Static `FeatureModuleFactory`, dynamic
`ExtensionModuleDefinition`, and installed `PluginArtifact` remain separate
concepts.

The application composition root constructs context bridges, concrete adapters,
process resources, and lifecycle ordering. Context composition owns only
migration assembly. Feature schemas and dialect migrations stay with the owning
persistence adapter.

### Durable workflows and transport direction

Durable process managers are owned by the feature or bounded context whose
business process they coordinate. Shared platform code may provide timers,
dispatch, persistence primitives, and test harnesses, but cannot become a
generic product workflow engine.

When Temporal is used, direction remains relative to the application core:

```text
features/<feature>/
  application/
    use-cases/
    process-managers/
    ports/inbound/
    ports/outbound/
  adapters/
    inbound/temporal/
      workflows/
      activities/
      signals/
      queries/
    outbound/temporal/client/
```

The Temporal client is outbound because the application schedules or signals
work. Workers, activities, signals, and queries are inbound because Temporal
invokes the application. Shared connections and worker bootstrap may live in
platform or application composition; feature mappings and workflow contracts do
not.

A JetStream consumer and publisher are separate adapter roles even when they
share a connection. Direction follows who initiates the application capability,
not the eventual direction of bytes or response data.

### Runtime gateway ownership

`@agent-teams/runtime-gateway` is the accepted narrow AR integration boundary.
It owns the AR Published Language client, transport behavior, protocol mapping
primitives, and Runtime Published Language client and ACL conformance.
Provider-driver and provider-behavior conformance remain owned by AR.

The gateway is not a consumer-owned feature adapter. Every consuming feature
still owns the adapter from its application port to the gateway. The gateway
cannot import business contexts or define Team, Task, Run, Approval, or teammate
message semantics.

### Package surfaces

Bounded-context packages expose deliberately separate surfaces when applicable:

```text
./module       module factory and lifecycle
./api          provider-owned inbound application API
./published    Published Language and public read contracts
./contracts/*  external API and integration-event schemas
./testing      fixtures and context contract kits
```

Consumer-owned outbound ports remain private unless a separately packaged
adapter must implement one. That case may expose a narrow
`./spi/<capability>`; a broad `./spi` barrel is prohibited. Package exports
prevent imports of feature internals.

Allowed:

```ts
import { createWorkCoordination } from "@agent-teams/work-coordination/module";
```

Forbidden:

```ts
import { Task } from "@agent-teams/work-coordination/src/features/task-model/domain/task";
```

## Enforcement

The machine-readable adoption declares the gates that implement this profile:

- `pnpm architecture:feature-module-profile` validates the central identity,
  immutable digest, scope, local authorities, profile markers, and declared
  commands;
- `pnpm architecture:topology` validates package identity, materialization,
  feature ownership, package surfaces, and source topology;
- `pnpm architecture:dependencies` rejects dependency-specifier bypasses;
- `pnpm architecture:conformance` runs the Foundation-backed boundary corpus.

`pnpm architecture:feature-module-profile:test` proves positive adoption and
negative identity, digest, scope, authority, deviation, and command cases. The
profile check runs in `check:fast`; the check and its tests run in the complete
`architecture:check` and root `pnpm check` gates.

Orchestrator claims adoption of Feature Module Standard `v1`, not universal
product correctness. Domain acceptance, security, reliability, deployment, and
release qualification remain separate repository-owned claims.
