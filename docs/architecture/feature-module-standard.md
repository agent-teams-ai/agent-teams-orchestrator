---
id: architecture.feature-module-standard
type: architecture
status: accepted
owner: architecture
summary: Orchestrator adoption of Feature Module Standard v1.1 and mandatory Get Modular composition, with new constructs blocked pending enforcement.
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
  - ADR-0110
  - architecture.composition
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
[Feature Module Standard v1.1](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/feature-module-standard/v1.1.md).
The standard identity is `agent-teams.feature-module-standard`, version `v1.1`,
with SHA-256
`cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c`
and Git blob `bd949a9a670862fea851a7791fce772fdef3b4fc`.

The machine-readable adoption is
[`architecture/feature-module-standard-profile.json`](../../architecture/feature-module-standard-profile.json).
ADR-0110 accepts this version and supersedes the v1 adoption in ADR-0098.

The organization standard owns universal feature ownership, layer
responsibilities, dependency mechanisms, test ownership, shared-code policy,
and extraction criteria. This document owns only the Orchestrator mapping,
technology extensions, stricter constraints, and enforcement coordinates.

There are no deviations from `v1.1`. A future deviation requires a repository
architecture decision and a complete machine-readable deviation record. A
successor organization standard does not apply until Orchestrator explicitly
adopts it.

Version 1.1 adds requirements for modules with declared sub-features and for
declared composition contracts. Those inventories are currently empty and
their materialization remains blocked. Adoption is a normative choice; it
does not certify existing source, Get Modular runtime behavior, or release
qualification.

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

A bounded context, workspace package, feature, Get Modular entry or group, and
deployed service are different boundaries. A feature owns a cohesive
capability; a Get Modular entry represents an independently wired composition
seam. Fixed library dependencies and pure private helpers remain static imports
and typed factories. Neither a feature nor an entry automatically becomes a
package or a service. This profile does not select service placement or
transport topology.

Foundation-owned terminal cleanup evidence under the exact
`.foundation-retired-evidence-` directory is transaction evidence rather than
production source and is excluded from topology inventory. No other hidden
directory receives that exclusion.

### Workspace layout

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
        composition/
          package-composition.ts
        index.ts
  sdk/
    orchestrator/
      src/
        features/
          teams/
          tasks/
        composition/
          package-composition.ts
        index.ts
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
  README.md
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
A generic detached `tests/unit/` tree is prohibited because it loses feature
ownership.

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

packages/contexts/work-coordination/tests/features/task-sync/

packages/platform/eventing/src/features/outbox-relay/
  contracts/
  ports/
  implementation/

packages/platform/eventing/tests/features/outbox-relay/

packages/sdk/orchestrator/src/features/teams/
  contracts/
  client/
  mappers/

packages/sdk/orchestrator/tests/features/teams/
```

These are examples, not ceremonial templates. A directory exists only for real
owned artifacts.

Business features follow the aggregate placement and behavior rules in the
[Full DDD modeling standard](../domain/modeling-standard.md). Platform,
integration, SDK, host, and tooling features do not invent ceremonial domain
layers.

## Nested features and composition contracts

The v1.1 model permits a real child capability at
`<parent-feature-root>/features/<child>/`, recursively without a fixed depth
limit. Every declared child has the same bounded-context ownership as its
parent. Nested folders are not a scaffolding requirement.

Before activation, preserve these requirements:

- A sub-feature is visible only to its parent and the parent's descendants.
  Other consumers use curated ancestor republication, never a deep import.
- Only the direct parent assembles its direct children. Module and application
  composition reach only top-level composition surfaces. Static groups mirror
  the feature tree rather than bypassing the parent.
- Republication re-exports a direct child's public entrypoint or composition
  contract from the same parent surface, without new behavior, mapping, or
  types. Every such edge is declared and proceeds one level at a time.
- The downward and lateral use graph is acyclic, including TypeScript type-only
  references. Upward use, assembly, and republication are separate edge roles.
  Load-time imports between features must also be acyclic; erased type-only
  references do not belong to that load-time graph.
- Composition contracts expose only identifiers, descriptors, and type
  declarations for wiring. Only composition code may consume them; domain,
  application, external contracts, and adapters may not import them.

The machine-readable `adoption.constructs` declares `sub_features`,
`republications`, and `composition_contracts` as empty arrays and activation
as `blocked-until-enforced`. The profile check rejects nonempty inventories and
any change of activation. It inventories materialized production package source
and rejects nested `features/<parent>/features/` paths and conventional
`composition/<name>.contracts.*` source files at feature and package/application
`src` roots. These are limited activation checks, not a semantic source parser
or proof of visibility, republication, assembly ownership, or edge conformance.

The first change that materializes these constructs must extend the scoped
classifiers and inventories, implement their semantic checks, and add valid and
invalid fixtures for visibility, direct-parent assembly, republication, and
both cycle policies. Only that reviewed enforcement change may activate the
constructs. Existing package, dependency, readiness, and materialization gates
remain required.

Foundation `1.7.2` reads a flat FMS v1 topology format. The unchanged
`architecture/foundation/quality-feature-topology.json` is a bounded reader
compatibility projection. Its validator requires the exact primary v1.1 pin,
empty blocked inventories, and the same physical activation restrictions while
preserving production roots, excluded roots, materialized packages, and their
source/test trees. It establishes only the current flat coverage. Activating
new constructs requires a reader and checks that understand them. The
[repository-tooling architecture](repository-tooling.md#source-coverage-adoption)
owns the Foundation integration and source coverage evidence.

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
`pnpm architecture:scaffold-package -- recover`. The command sends the canonical
Orchestrator project, config, catalog, and Composition scope to Foundation; it
does not read Foundation journal bytes. Apply gives an already-pending scoped
recovery precedence over a new Plan. Recovery intentionally does not depend on
unrelated topology validity. A generated boundary does not pass CI
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
exactly once after path normalization. Directory, trailing-slash, and explicit
`/tsconfig.json` spellings resolve to the same package reference.

### Contract surfaces

Feature contract directories own their schema definitions. The context-level
`published-language` module is only a curated export and compatibility manifest;
it MUST NOT redefine or copy feature-owned schemas.

Every Orchestrator external contract surface starts with one explicit `v1`
schema family. Speculative `v2` directories, writers, adapters, and SDK models
are prohibited. ADR-0037 governs the compatibility and migration decision
required before a later major exists.

Public control `.proto` files and integration-event JSON Schemas are separate
feature-owned artifacts. Neither schema is generated from the other. Every
integration-event JSON Schema MUST have an event manifest covering ownership,
scope, authorization, privacy, ordering, delivery, retention, replay, payload
limits, and compatibility. The
[public contract standard](public-control-contracts.md) owns the exact wire and
compatibility rules.

An outbound integration-event adapter maps transport-independent publication
intent into the versioned public event schema and outbox record. The
[eventing and reliability standard](eventing-and-reliability.md) owns the exact
publication and delivery rules.

### Composition and dependency selection

ADR-0110 makes Get Modular mandatory at every applicable TypeScript production
composition seam in `apps/**` and `packages/**`, including bounded contexts,
platform, integration, SDK, contract, and testing packages when they actually
assemble implementations. A package needs no artificial assembly merely to
contain pure contracts or helpers. Feature APIs and factories remain ordinary
typed code; the selected Get Modular graph wires independently selected
implementations. A separate hand-wired factory graph, Awilix container, or other
resolver cannot compete with it as production assembly authority.

Get Modular imports, descriptors, entries, groups, and wiring belong to
`composition/**` and composition tests. Domain, application, external contracts,
and adapters depend on ordinary typed APIs and consumer-owned ports. The
[composition profile](composition-and-dependency-injection.md) owns exact
authoring, lifecycle, migration, and qualification requirements. Framework
selection does not install a dependency or qualify an exact package train.

The existing
`packages/contexts/agent-context/src/features/sandbox-manifest/composition/feature-module-factory.ts`
directly assembles its application API and PostgreSQL adapter. It is a named
migration inventory gap under ADR-0110, not a permanent factory exemption or
evidence that source already conforms. The owning migration must replace the
assembly at that seam and qualify its behavior before extending it as a
Get Modular composition. No production source migration is performed by this
profile adoption.

Fixed dependencies within a cohesive implementation remain imports and typed
factories. Replaceable implementations use consumer-owned ports selected by
Get Modular composition. Dynamic
plugins use the separately accepted closed graph compiler and immutable
activation plan only when a real runtime-selection capability requires it.
Every dynamic dependency declares exactly one `required`, `optional`, or
`ordered-many` cardinality.

Generic `module.ts` feature files, ambient `resolve()`, service locators,
parent-container fallback, registration-order semantics, and global mutable
registries are prohibited. A static Get Modular entry, dynamic
`ExtensionModuleDefinition`, and installed `PluginArtifact` remain separate
concepts. A pure factory used by an entry does not create a second resolver.

The application composition root constructs context bridges, concrete adapters,
process resources, and lifecycle ordering. Context migration assembly owns ordering, dependency
validation, compatibility checks, and one context migration entry point. Feature
schemas and dialect migrations stay with the owning persistence adapter.

### Durable workflows and transport direction

Durable process managers are owned by the feature or bounded context whose
business process they coordinate. Shared platform code may provide timers,
dispatch, persistence primitives, and test harnesses, but cannot become a
generic product workflow engine.

Create `application/process-managers/` only for durable, stateful business
processes owned by that feature. A generic `coordinators/` directory is
prohibited; ordinary coordination remains in named use cases.

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

Examples of the concrete adapter direction mapping are:

```text
adapters/inbound/http/
adapters/inbound/cli/
adapters/inbound/jetstream-consumer/

adapters/outbound/sqlite/
adapters/outbound/postgres/
adapters/outbound/jetstream-publisher/
adapters/outbound/agent-runtime/
```

### Integration and persistence ownership

A feature-specific external adapter is promoted to `packages/integrations/**`
only after proven cross-context reuse, an independent lifecycle or publication
surface, or a dedicated provider conformance surface. The integration package
may own protocol clients and mappings, but it MUST NOT own the consuming
feature's business policy.

Platform persistence packages may expose technical drivers and transaction
primitives. Context-owned repository adapters, tables, migrations, inboxes,
outboxes, and projections remain inside the owning context. Within that context,
feature-specific artifacts stay with their owning feature as required by `v1.1`.
The [persistence boundary](persistence-boundary.md) owns the detailed rules.

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
  commands, and the limited construct activation checks above;
- `pnpm architecture:topology` validates package identity, materialization,
  feature ownership, package surfaces, and source topology;
- `pnpm architecture:dependencies` rejects dependency-specifier bypasses;
- `pnpm architecture:conformance` runs the Foundation-backed boundary corpus.

`pnpm architecture:feature-module-profile:test` proves positive adoption and
negative identity, digest, scope, authority, deviation, command, and construct
activation cases. The
profile check runs in `check:fast`; the check and its tests run in the complete
`architecture:check` and root `pnpm check` gates.

Orchestrator adopts Feature Module Standard `v1.1` with new constructs blocked
and selects Get Modular for applicable TypeScript composition. The current
checks do not establish complete Get Modular source conformance, runtime
qualification, supported-scale qualification, browser qualification, or universal
product correctness. Domain acceptance, security, reliability, deployment, and
release qualification remain separate repository-owned claims.
