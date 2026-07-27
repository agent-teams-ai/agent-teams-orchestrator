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
---

# Repository Tooling Plan

## Purpose

Repository tooling must make the compliant architecture path easier than an
invalid one. Documentation explains intent; blocking checks, generators, package
exports, and dependency graphs prevent agents and contributors from silently
creating a second architecture.

This document owns the staged adoption plan. It does not redefine package roles,
DDD boundaries, or source dependency rules.

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

The quality lanes are deliberately different:

| Lane | Command | Policy |
|---|---|---|
| Focused fast feedback | `pnpm lint:fast:files -- <paths>` | Blocking rules for files being edited |
| Repository fast gate | `pnpm lint:fast` | Blocking correctness, suspicious-code, runtime, test, and boundary rules |
| Type-aware gate | `pnpm lint:type-aware` | Blocking typed safety over production TypeScript roots |
| Full lint gate | `pnpm lint` | Fast, type-aware, and lint-configuration conformance |
| Evaluation lane | `pnpm lint:advisory` | Non-blocking bounded complexity and modernization findings |

The blocking baseline enables the built-in TypeScript, Oxc, Unicorn, import,
JSDoc, Vitest, Promise, and Node plugins where they provide high-signal checks.
Capability-specific plugins such as React, JSX accessibility, Next.js, Vue, or
Jest are activated only when a real package needs them. Every promotion requires
valid and invalid fixtures and a clean baseline review.

TypeScript 7 remains the authoritative compiler. Type-aware Oxlint supplements it
through the exact pinned `oxlint-tsgolint` release and never replaces
`pnpm typecheck`. Unsupported rules are not listed as protection; the conformance
suite proves that representative blocking diagnostics really fire.

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

Strict catalog mode and `pnpm architecture:dependencies` are blocking. The latter
checks every workspace manifest, including manual edits, and rejects direct
external versions, non-`workspace:` internal references, missing catalog entries,
and non-exact catalog versions. Adding a dependency requires:

1. verifying its current stable version and maintenance state;
2. adding the exact version to the appropriate catalog;
3. using `catalog:` from the owning package;
4. committing the resulting lockfile change;
5. adding an architecture decision when the dependency introduces a framework,
   runtime, process, storage, transport, compiler, or new compatibility island.

Named catalogs are not general-purpose version groups. A package that needs an
exception documents why the default version cannot satisfy it and how the exception
will retire. Knip reports unused catalog entries; install commands do not silently
delete them.

### Stage 1: Nx Foundation

Trigger: ADR-0039 is accepted.

Add the exact current accepted `nx` release in package-based mode. Configure only:

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

Completion evidence:

1. Nx discovers exactly the materialized workspace packages and no fixtures.
2. The project graph matches declared workspace dependencies.
3. Cached and uncached deterministic tasks produce equivalent outputs.
4. Affected calculation is tested for source, contract, configuration, lockfile,
   and shared-tooling changes.
5. Every existing quality gate remains directly runnable with pnpm.

After that evidence exists, expose the graph to coding agents through checked-in
instructions that use `nx show projects`, `nx show project`, and machine-readable
graph output. The official Nx MCP server is optional and must use the repository's
pinned Nx binary, this repository as its fixed working directory, and a restricted
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

Until this gate passes, Project References remain explicit and the package
scaffolder owns their initial shape.

### Stage 3: architecture-aware generators

Trigger: one complete vertical slice has passed package, architecture, test, and
build gates and is accepted as the reference shape.

Create local Nx commands only as adapters over the existing catalog and
scaffolder. A generator must:

- accept a catalog ID, never an arbitrary package role or path;
- refuse a proposed owner or an existing target;
- generate no empty domain, application, adapter, port, or repository folders;
- delegate package identity and ownership validation to the catalog tooling;
- add a real accepted feature slice in the same change;
- pass fixture and idempotency tests;
- leave no partial output after failure.

Nx generators do not own templates independently from the repository scaffolder.

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
