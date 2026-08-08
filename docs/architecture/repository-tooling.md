---
id: architecture.repository-tooling
type: architecture
status: accepted
owner: engineering/tooling
summary: Staged repository tooling plan for deterministic package growth, architecture feedback, and low-lock-in Nx adoption.
related:
  - ADR-0031
  - ADR-0032
  - ADR-0038
  - ADR-0039
  - ADR-0041
  - ADR-0053
  - ADR-0054
  - ADR-0056
  - ADR-0059
  - ADR-0078
  - architecture.dependency-rules
  - architecture.feature-module-standard
  - architecture.machine-readable-model
code_anchors:
  - pattern: architecture/package-catalog.yaml
    enforcement: advisory
  - pattern: scripts/architecture/**
    enforcement: advisory
  - pattern: tooling/architecture-conformance/**
    enforcement: advisory
  - pattern: .oxlintrc*.json
    enforcement: required
  - pattern: scripts/lint/**
    enforcement: required
  - pattern: pnpm-workspace.yaml
    enforcement: advisory
  - pattern: nx.json
    enforcement: required
  - pattern: scripts/architecture/validate-nx-workspace.mjs
    enforcement: required
---

# Repository Tooling Plan

## Purpose

Repository tooling must make the compliant architecture path easier than an
invalid one. Documentation explains intent; blocking checks, generators, package
exports, and dependency graphs prevent agents and contributors from silently
creating a second architecture.

This document owns the staged adoption plan. It does not redefine package roles,
DDD boundaries, or source dependency rules.

## Implementation status

An accepted tooling decision is target architecture, not proof that its rollout
is complete.

| Capability | Decision state | Implementation state |
|---|---|---|
| Repository-local Stage 0 validators, lint, docs, security, and reliability gates | Accepted | Implemented and blocking |
| Versioned engineering foundation distribution | Accepted in ADR-0059 | Implemented with exact public npm dependency, explicit local lifecycle, consumer E2E proof, and fail-closed CI registry checks |
| Nx package graph and affected foundation | Accepted in ADR-0039 | Implemented with pinned Nx Core and blocking pnpm-workspace discovery validation |
| Nx task pipelines and local cache | Accepted in ADR-0039 | Planned; no task is cacheable until its complete inputs and outputs are proven |
| Structural AST rules | Accepted in ADR-0041 | Planned for the first matching production source and invariant fixture |
| Dead-code analysis | Accepted in ADR-0041 | Planned after the first production vertical slice |
| Publishable API and package validation | Accepted in ADR-0041 | Planned before the first publishable package release |
| Production package graph | Catalog reservations accepted | Not materialized; validators currently exercise conformance fixtures |
| Federated Consistency Evidence Gate | Accepted in ADR-0078 | Planned; Phase 1 starts with the first real durable mutation and remains build-time only |

The implementation state changes only with executable evidence in this
repository. Documentation must not describe a planned dependency, wrapper, or
gate as active.

## Cross-repository engineering foundation

ADR-0059 places reusable engineering tooling in the versioned
`@agent-teams/engineering-foundation` dev dependency. This repository remains the
source of truth for its business architecture and supplies project-specific facts
through a narrow local adapter. Production packages cannot import the foundation.

Registry mode is the reproducible default. Local sibling development uses only
the guarded `foundation:attach`, `foundation:status`, and `foundation:detach`
workflow. CI, packaging, and release paths fail closed unless
`foundation:assert-registry` proves that the exact lockfile package is active.
The foundation release repository owns package tarball verification; this
consumer additionally runs `foundation:e2e` to prove registry restoration and
manifest and lockfile immutability around the local link lifecycle.

Capability adoption is explicit. Existing repository-local tooling moves only
after the extracted capability has equivalent fixtures, a migration path, and a
consumer conformance test. During a measured parity window the donor remains a
blocking oracle; after parity, only Orchestrator-specific residue remains. The
foundation checkout is accepted only through the guarded local lifecycle and is
rejected by CI.

The current exact Foundation release keeps `workspace.dependency-declarations`,
`architecture.source-dependencies`, `documentation.local-references`, and
`quality.suppression-governance` blocking through strict
`foundation.config.yaml`. Source dependency policy starts with materialized
production roots and expands in the same change that scaffolds a new package.
Generic local-reference and suppression policy belongs to Foundation; the local
documentation and lint gates retain project-specific metadata, diagram, owner,
and protected-rule checks.

`governance.architecture-decisions` is also blocking. Every ADR declares both
directions of supersession explicitly, the lifecycle sections in
`docs/decisions/README.md` list each ADR exactly once, and the generated accepted
baseline makes accepted history immutable. The concern map uses stable IDs as
navigation labels rather than duplicating lifecycle links.

Foundation ADR-0003, ADR-0004, and ADR-0005 are accepted. Suppression governance
is enabled with an Orchestrator-owned expiring waiver ledger while the local donor
continues as a parity oracle. Public API
compatibility starts only for a real versioned package surface with
release-owned baselines. The accepted combined repository-security profile does
not apply while Orchestrator publishes no package and must not be enabled with
fabricated package evidence. Each adoption is a separate parity-proven tooling
change.

The first-party foundation package alone is exempt from the pnpm release-age
delay. Its exact manifest version, registry integrity, reviewed upgrade, and npm
Trusted Publisher remain mandatory. The exemption does not apply to the rest of
the `@agent-teams` scope or to third-party dependencies.

## Sources of truth

| Concern | Authoritative source |
|---|---|
| Workspace membership | `pnpm-workspace.yaml` and package manifests |
| Allowed package identity and role | `architecture/package-catalog.yaml` |
| Context acceptance and domain ownership | Owning bounded-context dossier and ADR |
| Source dependency direction | Dependency rules and architecture conformance gates |
| Compiler behavior | Package and root TypeScript configurations |
| Portable task command | Package manifest script |
| Task and project execution graph | Nx derived view |
| Strategic relationship graph | LikeC4 source model |

Nx consumes or validates the standard sources. Nx metadata never becomes a
parallel hand-maintained architecture catalog.

## Adoption stages

### Stage 0: deterministic baseline

Status: active.

The baseline consists of:

- pnpm workspaces and TypeScript Project References;
- strict pnpm catalogs for reusable external dependency versions;
- TypeScript 7 as the primary compiler;
- the default-deny package catalog and package scaffolder;
- blocking materialized-library typecheck, test, build, declaration-consumer,
  and built-export gates;
- Oxlint with boundary rules as a blocking source gate;
- dependency-cruiser in the isolated TypeScript 6 tooling package as an advisory
  complete-graph gate;
- fixture-based architecture conformance tests.
- LikeC4 semantic validation and package-catalog consistency checks;
- repository-local documentation Skill and code impact anchors.

### Source-quality lanes

Status: active.

Oxlint is the only lint runtime. The repository does not install or invoke ESLint.
The JavaScript boundary plugin executes inside Oxlint and is covered by the
architecture conformance corpus.

The root `.oxlintrc.json` is the single policy for CLI, CI, and editor use.
Type-aware commands enable that capability on the same config rather than
maintaining a second rule copy. Nested Oxlint configs are disabled so a package
cannot weaken repository policy. Package-specific differences use reviewed root
overrides or a separate explicit capability gate. The conformance config inherits
that policy by deriving a temporary root-level config that clears only ignore
patterns, so intentional invalid fixtures can prove that blocking diagnostics
fire without maintaining a second rule copy.

The quality lanes are deliberately different:

| Lane | Command | Policy |
|---|---|---|
| Focused fast feedback | `pnpm lint:fast:files -- <paths>` | Blocking rules for files being edited |
| Focused typed feedback | `pnpm lint:type-aware:files -- <paths>` | Blocking typed safety for one or more explicit TypeScript files or directories |
| Repository fast gate | `pnpm lint:fast` | Blocking correctness, suspicious-code, runtime, test, and boundary rules |
| Type-aware gate | `pnpm lint:type-aware` | Blocking typed safety over production TypeScript roots |
| Full lint gate | `pnpm lint` | Fast, type-aware, suppression-policy, and lint-configuration conformance |
| Evaluation lane | `pnpm lint:advisory` | Non-blocking bounded complexity and modernization findings |

The advisory lane runs fast repository-wide analysis first, then limits its
type-aware pass to materialized paths from the package catalog. Invalid fixtures
and repository tooling do not become accidental TypeScript programs, and a new
production package cannot silently fall outside typed analysis.

The blocking baseline enables the built-in TypeScript, Oxc, Unicorn, import,
JSDoc, Vitest, Promise, and Node plugins where they provide high-signal checks.
Capability-specific plugins such as React, JSX accessibility, Next.js, Vue, or
Jest are activated only when a real package needs them. Every promotion requires
valid and invalid fixtures and a clean baseline review.

TypeScript 7 remains the authoritative compiler. Type-aware Oxlint supplements it
through the exact pinned `oxlint-tsgolint` release and never replaces
`pnpm typecheck`. Unsupported rules are not listed as protection; the conformance
suite proves that representative blocking diagnostics really fire. The
type-aware runner resolves explicit source roots, reports the number of selected
TypeScript files, and fails closed when that count is zero. Blocking lanes also
deny warnings so a newly introduced warning cannot silently weaken CI.

Inline suppressions are exceptional evidence, not a local configuration surface.
`eslint-disable`, file-wide disables, unexplained exceptions, and local
suppression of architecture rules are rejected. A permitted exception uses one
rule-scoped `oxlint-disable-next-line` preceded by a specific explanation.

Source classes remain distinct:

- handwritten source receives the complete blocking rule set;
- generated contracts must compile and pass contract-drift tests, while any lint
  relaxation is a narrow path override owned by the generator;
- vendored source is excluded and cannot be imported by domain or application
  layers;
- intentional invalid fixtures are ignored by normal lint and exercised directly
  by conformance tests.

Stage 0 remains active through every later stage. Nx does not replace it.

### Dependency catalogs

Status: active.

The default pnpm catalog owns the exact primary toolchain and reusable external
dependency versions. Workspace package manifests refer to those dependencies with
`catalog:` and refer to internal packages with `workspace:`.

Named catalogs exist only for accepted compatibility islands. The initial
`tooling-ts6` catalog isolates dependency-cruiser and TypeScript 6 from the primary
TypeScript 7 toolchain. A second version is not added directly to a package
manifest.

Dependabot may automate TypeScript patch and minor updates, but not a major
transition. A major compiler transition must update the primary compiler and each
accepted compatibility island through one reviewed toolchain decision. This also
prevents the updater from mistaking the `tooling-ts6` catalog for an obsolete
copy of the primary TypeScript 7 dependency.

Strict catalog mode and `pnpm architecture:dependencies` are blocking. The latter
checks every workspace manifest, including manual edits, and rejects direct
external versions, non-`workspace:` internal references, missing catalog entries,
and non-exact catalog versions.

The repository also enforces a strict 24-hour minimum release age. An immature
direct or transitive package fails installation instead of being added
automatically to an exception list. Any exact-version exception is a reviewed
supply-chain decision and remains visible in `pnpm-workspace.yaml`.

Adding a dependency requires:

1. verifying its current stable version and maintenance state;
2. adding the exact version to the appropriate catalog;
3. using `catalog:` from the owning package;
4. committing the resulting lockfile change;
5. adding an architecture decision when the dependency introduces a framework,
   runtime, process, storage, transport, compiler, or new compatibility island.

Named catalogs are not general-purpose version groups. A package that needs an
exception documents why the default version cannot satisfy it and how the exception
will retire. Once its staged activation gate is met, Knip reports unused catalog
entries; install commands do not silently delete them in the meantime.

### Stage 1: Nx Foundation

Trigger: ADR-0039 is accepted.

Status: active for package discovery, graph inspection, and affected calculation.
Task pipelines and local cache remain inactive until their inputs and outputs are
proven.

Use the exact current accepted `nx` release in package-based mode. Configure only:

- project discovery from pnpm workspaces;
- project and task graph inspection;
- task dependencies and parallel execution;
- affected-project calculation;
- local cache for deterministic tasks.

Guardrails:

- no Nx Cloud or remote cache;
- no integrated layout, `project.json`, or Nx executors;
- no product import from `nx` or `@nx/*`;
- no task is cacheable until its complete inputs, environment dependencies, and
  outputs are declared;
- stateful, live-integration, timing-sensitive, and external-service tests are not
  cached by default;
- full blocking gates remain in CI while affected execution is evaluated;
- Nx runs only from this repository root and never discovers sibling repositories
  or a shared hosting workspace root.

The blocking `architecture:nx:check` command compares Nx discovery with the pnpm
workspace and rejects root-project, fixture, or sibling-repository discovery.
`nx.json` disables telemetry, terminal UI, and every attempt to connect the
workspace to Nx Cloud. Repository scripts also disable the daemon and cloud use
for deterministic agent and CI commands.

Completion evidence:

1. Nx discovers exactly the materialized workspace packages and no fixtures.
2. The project graph matches declared workspace dependencies.
3. Cached and uncached deterministic tasks produce equivalent outputs.
4. Affected calculation is tested for source, contract, configuration, lockfile,
   and shared-tooling changes.
5. Every existing quality gate remains directly runnable with pnpm.

The checked-in `nx:projects` and `nx:affected` commands expose current graph
discovery to coding agents. After the remaining completion evidence exists, add
task-running guidance using `nx show project` and machine-readable graph output.
The official Nx MCP server is optional and must use the repository's pinned Nx
binary, this repository as its fixed working directory, and a restricted
workspace-only tool set. It cannot enable Nx Cloud implicitly or discover sibling
repositories.

Do not run an AI-configuration generator unattended. Generated skills, MCP files,
`AGENTS.md`, or `CLAUDE.md` changes require review against this repository's
canonical navigation and must not replace project-specific guardrails.

### Stage 2: TypeScript integration

Trigger: the first real implementation package and its first vertical slice are
accepted and materialized.

Evaluate the matching `@nx/js` version in an isolated compatibility spike. Adopt
`@nx/js/typescript` only after proving:

- the pinned TypeScript 7 CLI remains the primary type-checker;
- tools requiring a TypeScript programmatic API stay in the isolated TypeScript 6
  tooling lane;
- inferred build and typecheck tasks match package scripts;
- `nx sync:check` detects missing and stale TypeScript Project References;
- sync never adds dependencies prohibited by the package catalog or dependency
  rules;
- CI is non-interactive and fails on drift rather than modifying tracked files.

Until this gate passes, Project References remain explicit. The Foundation Recipe
owns only the initial library boundary; the Orchestrator change owns the matching
root reference and accepted first feature.

### Stage 3: architecture-aware generators

Trigger: one complete vertical slice has passed package, architecture, test, and
build gates and is accepted as the reference shape.

Create local Nx commands only as adapters over the existing catalog and
Foundation scaffolding protocol. A generator must:

- accept a catalog ID, never an arbitrary package role or path;
- refuse a proposed owner or an existing target;
- generate no empty domain, application, adapter, port, or repository folders;
- delegate package identity and ownership validation to the catalog tooling;
- add a real accepted feature slice in the same change;
- pass fixture and idempotency tests;
- leave no partial output after failure.

Nx generators do not own templates independently from the Foundation Recipe.

### Package scaffolding protocol

Status: `IMPLEMENTED` and `ORCHESTRATOR_QUALIFIED`.

The exact Foundation package owns deterministic compilation, final boundary bytes,
journaled filesystem publication, replay, and recovery. Orchestrator owns
`architecture/package-catalog.yaml`, owner evidence, the admitted library roles,
and all post-Apply topology checks. The Composition is declared in
`architecture/foundation/scaffolding.yaml`; qualification evidence is recorded in
`architecture/foundation/scaffolding-qualification.yaml` and rerun by architecture
conformance.

`platform.local-host-control` is the only real donor. Synthetic fixtures vary
consumer roles, paths, and npm names without claiming a second product donor.
Applications are deliberately excluded from the current Composition. The legacy
renderer is not retained as a fallback after donor-byte parity passes. The same
consumer qualification suite runs on Linux, macOS, and Windows.

### Stage 4: derived architecture metadata

Trigger: several materialized packages provide a representative graph across app,
bounded-context, integration, platform, SDK, testing, and tooling roles.

Derive any Nx project tags or graph metadata from the package catalog. Add a drift
gate before using that metadata for blocking Nx boundary rules. Manually duplicated
role or context tags are prohibited.

Nx graph checks supplement, rather than replace:

- package exports and workspace dependency checks;
- Oxlint boundary rules;
- complete dependency-cruiser analysis;
- architecture conformance fixtures.

### Stage 5: affected CI promotion

Trigger: affected execution has demonstrated equivalent change coverage to full
execution across representative source, schema, package, lockfile, tooling, and
configuration changes.

Promote affected execution for expensive package-local tasks. Repository-wide
topology, documentation, schema compatibility, security, release, and architecture
checks remain full gates unless their dependency inputs are mechanically complete.

Every affected CI path keeps a manually invocable full fallback. A false negative
demotes the affected path until a regression fixture is added.

### Stage 6: optional remote and release capabilities

Trigger: measured CI or publication cost justifies another dependency and its
operational burden.

Remote cache, Nx Cloud, self-hosted cache, distributed task execution, and Nx
Release require separate decisions. Evaluation must cover secrets, tenant and
repository isolation, artifact integrity, cache poisoning, outage fallback,
retention, cost, and vendor exit. SDK publication automation is evaluated only
when the first publishable package exists.

## Agent workflow

Agents working in this repository must:

1. inspect the package catalog before proposing or creating a package;
2. use the repository scaffolder rather than creating package roots manually;
3. inspect the Nx project graph before changing cross-package dependencies after
   Stage 1 is active;
4. run affected checks for fast feedback and the required full gate before merging;
5. treat a graph, sync, cache, or boundary disagreement as a tooling defect, never
   bypass it with an undocumented exclusion;
6. update a conformance fixture with every new permitted dependency shape or fixed
   false negative.

## Upgrade policy

All official Nx packages use one exact version. Upgrade them together through the
official migration flow in an isolated tooling change. The change must verify:

- package discovery and project graph snapshots;
- affected calculations;
- cold and warm cache behavior;
- TypeScript integration when active;
- architecture and documentation gates;
- direct pnpm fallback commands.

Do not accept an automated migration that introduces integrated layout, executors,
remote services, telemetry, or new project metadata without an explicit review.

## Consistency evidence gate

Status: accepted, implementation begins with the first real durable mutation.

The generic engine, strategy vocabulary, generators, diagnostics, and bundle
formats belong to `@agent-teams/engineering-foundation`. This repository owns
its mutation contracts, invariant identities, enabled deployment profiles,
bindings, semantic oracles, and evidence fixtures. The initial gate generates
agent dossiers and build-time indexes, not a production handler registry.

The normal agent entrypoint is `foundation context --changed`, followed by the
mutation generator and `foundation consistency:check --changed --explain`.
Release CI still runs complete write-path discovery so an affected-graph omission
cannot hide an unregistered mutation. ADR-0078 owns the complete policy and
staged rollout.

## Structural architecture rules

Status: accepted, implementation begins with the first matching production source.

ast-grep owns structural code invariants that are more precise than text search and
are not import-graph questions. The initial rule families cover:

- Awilix import, container creation, registration, scope, cradle, and resolution
  containment under `composition/**`;
- prohibited direct clocks, randomness, process APIs, and infrastructure
  constructors in domain code;
- accepted factory and public-handle shapes where TypeScript types alone cannot
  prevent service-locator leakage.

A rule is introduced with valid and invalid fixtures and starts advisory. It becomes
blocking only after it reports the intended invalid forms, accepts supported valid
forms, has a remediation message, and produces no unexplained findings against the
real source tree. Generic style and import direction remain with Oxlint and the
dependency graph stack.

## Dead-code and dependency hygiene

Status: accepted, implementation begins after the first vertical slice.

Knip reports unused files, exports, dependencies, binaries, and catalog entries
across pnpm workspaces. It starts advisory because framework entrypoints and
generated contract artifacts can produce false positives. Promotion requires
fixtures for every intentional dynamic or generated entrypoint.

## Public TypeScript API reports

Status: accepted, implementation begins before the first publishable package
release.

API Extractor produces a reviewed API report for every publishable TypeScript
package. The report is committed and a public type-surface change becomes an
explicit review item. Its TypeScript 7 compatibility is proven in a spike; if it
requires a legacy compiler API, it runs in an isolated tooling package over emitted
declarations rather than changing the primary compiler.

API reports do not define wire compatibility. Buf and schema compatibility gates
remain authoritative for Protobuf and JSON Schema contracts.

## Packed-package validation

Status: accepted, implementation begins before the first SDK release.

Every publishable package is packed to the actual npm tarball before validation.
publint checks package exports and runtime compatibility. Are The Types Wrong checks
the consumer-visible type resolution matrix. The packed-artifact suite also imports
the package through every supported Node ESM, CommonJS, and browser profile declared
by ADR-0036.

Passing source typecheck or API Extractor is not sufficient evidence that the
published artifact is correct.

## Tool ownership

| Failure class | Owning tool |
|---|---|
| Package identity and materialization | Package catalog and topology validator |
| Project and task impact | Nx |
| Source import boundaries | Oxlint with boundary rules |
| Complete dependency graph and cycles | dependency-cruiser |
| Repository-specific structural patterns | ast-grep |
| Unused code and dependencies | Knip |
| TypeScript public API review | API Extractor |
| Protobuf compatibility | Buf |
| Packed npm runtime and type resolution | publint and Are The Types Wrong |
| Strategic context relationship topology | LikeC4 plus repository consistency validator |
| Documentation workflow and implementation impact | Repository-local Skill and code anchors |

Do not add overlapping task runners or multiple tools that claim the same
architectural authority. A new tool needs a distinct failure class, deterministic
output, a maintained release line, acceptable TypeScript compatibility, and a
conformance fixture proving value beyond the existing stack.
