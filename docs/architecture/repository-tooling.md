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
  - ADR-0102
  - ADR-0103
  - ADR-0113
  - ADR-0114
  - architecture.deployment-profiles
  - architecture.dependency-rules
  - architecture.feature-module-standard
  - architecture.machine-readable-model
code_anchors:
  - pattern: architecture/foundation/document-authoring.yaml
    enforcement: advisory
  - pattern: architecture/foundation/quality-gate-runner.yaml
    enforcement: advisory
  - pattern: architecture/package-catalog.yaml
    enforcement: advisory
  - pattern: scripts/architecture/**
    enforcement: advisory
  - pattern: tooling/architecture-conformance/**
    enforcement: advisory
  - pattern: tooling/architecture-conformance-fixtures/**
    enforcement: advisory
  - pattern: tooling/lint-fixtures/**
    enforcement: required
  - pattern: .oxlintrc*.json
    enforcement: required
  - pattern: scripts/lint/**
    enforcement: required
  - pattern: scripts/security/validate-reviewrouter-workflow.mjs
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

| Capability                                                                       | Decision state                                | Implementation state                                                                                                           |
| -------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Repository-local Stage 0 validators, lint, docs, security, and reliability gates | Accepted                                      | Implemented and blocking                                                                                                       |
| Repository-local documentation authoring workflow                                | Accepted in ADR-0053                          | Implemented with metadata discovery, template-backed guarded creation, code-impact routing, and blocking validation            |
| Versioned engineering foundation distribution                                    | Accepted in ADR-0059                          | Implemented with exact public npm dependency, explicit local lifecycle, consumer E2E proof, and fail-closed CI registry checks |
| Nx package graph and affected foundation                                         | Accepted in ADR-0039                          | Implemented with pinned Nx Core and blocking pnpm-workspace discovery validation                                               |
| Nx task pipelines and local cache                                                | Accepted in ADR-0039                          | Planned; no task is cacheable until its complete inputs and outputs are proven                                                 |
| Structural AST rules                                                             | Accepted in ADR-0041                          | Planned for the first matching production source and invariant fixture                                                         |
| Dead-code analysis                                                               | Accepted in ADR-0041                          | Planned after the first production vertical slice                                                                              |
| Publishable API and package validation                                           | Accepted in ADR-0041                          | Planned before the first publishable package release                                                                           |
| Production package graph                                                         | Scoped sandbox admission accepted in ADR-0103 | Agent Context sandbox manifests and Local Host Control materialized; broader reservations remain deferred                      |
| Federated Consistency Evidence Gate                                              | Accepted in ADR-0078                          | Planned; Phase 1 starts with the first real durable mutation and remains build-time only                                       |

The implementation state changes only with executable evidence in this
repository. Documentation must not describe a planned dependency, wrapper, or
gate as active. These are configured routes; the compiler blockers and migration
below prevent treating their historical success as current toolchain qualification.

## Node.js compatibility qualification

The product owner's current migration selects Node.js `26.11.1` as the
root tooling default. Node.js `24.21.0` remains an explicit compatibility lane.
Both lanes retain strict frozen engine and peer checks, the installed-lock
peer check, the disposable incompatible-peer rejection fixture, and the full
repository gate. The package engine ranges remain unchanged. ADR-0025 and
proposed ADR-0102 retain their historical wording and evidence.

The earlier PR candidate `dc76b6f09bed96c95ff8d9c004072c089125116f`
recorded qualification against earlier inputs. Those results remain historical;
they do not qualify this integration. Current-main managed profiles, state and
caller remain unchanged. Node.js package compatibility does not establish managed Docs execution
support or product runtime qualification.

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

### Source coverage adoption

The owner-authorized 27 November tooling candidate selects published Engineering
Foundation `4.0.2`, Stack Toolchain `0.3.1` and FMS tooling `0.4.3` as exact root
development dependencies. `quality.source-coverage` uses schema v5 while the
root Foundation configuration remains v2. `quality:coverage:scope` still runs in
`check:fast`; `lint:typed` still runs the full shared typed route once through
`lint` and `check`. Stack owns the technical presets and exact TypeScript
`7.0.2`, Oxlint `1.83.0` and oxlint-tsgolint `7.0.2001` tool identities.

`toolchain.config.json` is the sole production compiler-project list for that
capability. The separate root `tsconfig.json` strictly checks repository tooling
and the existing architecture fixtures; package reference/typecheck routes remain
required. Legacy imported JavaScript helpers retain their existing checking
status; new maintained tooling is ordinary `.ts` in the strict root program.
Both emitting production projects explicitly retain `allowJs: false`; the root
tooling accommodation cannot admit unchecked JavaScript into production.

`architecture/foundation/quality-source-topology.json` replaces the old flat v1
reader projection. `scripts/architecture/validate-quality-topology.ts` derives it
through the public FMS `projectQualitySourceTopology` mapper from the exact
accepted v1.1 authority and materialized package catalog. Its `derivedFrom`
bindings cover that authority, catalog, quality profile and adapter bytes.
The ordinary Foundation route checks projection freshness; the standalone v5
check also rejects stale source bindings.

The projection retains the same broad production census, excluded tooling,
materialized `agent-context` and `local-host-control` source/test roots. It does
not activate nested constructs. The existing exact authority, empty-construct,
`blocked-until-enforced`, physical source and application-materialization guards
remain. Full v1.1 visibility, assembly and dependency enforcement is still the
separate T3 task. Foundation independently rejects an unclassified new workspace
package; a catalog reservation does not create production code.

Shared global categories, plugins, rules, and preset references live in
`.oxlintrc.base.json`. `.oxlintrc.common.json` extends that base and retains normal
tooling, test, and fixture overrides; the fast config adds executable boundary
rules and the existing generated/vendor budget exemption. The typed config
extends the base and Stack's protected typed preset without executable
plugins. Its existing override rule payloads map to the accepted module's source
and test roots, including `ts`, `tsx`, `mts`, and `cts` and the pure core layers.
Generated/vendor exemptions do not enter the production typed route.
All 36 stricter TypeScript rules, explicit root suppression options, and the local
suppression validator remain required. The architecture, FMS, and immutable
history gates remain blocking.

Foundation `4.0.2` supports production TypeScript extensions through the shared
selection and compiler route. The existing local typed runner remains available
through `lint:type-aware:files` for explicit file feedback. Full typed execution
also rejects assertion chains through `unknown` by default. There are no bridge
admissions in this consumer; an unsafe production assertion must be fixed at its
owner rather than hidden by a wildcard exception.

The default root tooling lane uses Node `26.11.1`; pnpm remains `11.18.0`.
Node `24.21.0` retains an explicit compatibility lane. Foundation's public
`agent-teams-node-test` contract remains required. Product runtime qualification
remains separate.
`quality:coverage:test` invokes the installed runner with
`architecture/foundation/required-quality-tests.json`. Its narrow consumer
adapter authenticates the reviewed 18-identity contract with an exact SHA-256
and binds the complete selected file list before execution. Removing a critical
identity fails admission even when all three protected files remain selected.
Required source
boundary, coverage, and runner regression identities must complete; the live
contract has no OS exceptions. Other test runners retain their existing routes.
`foundation:boundaries:negative` aliases this combined critical gate, and
`foundation:check` runs it once in both fast and full checks.

`quality.source-coverage` intentionally rejects protected override selectors
that include tooling or fixtures excluded by the unchanged FMS profile. The
consumer's base/common/typed mapping resolves that configuration mismatch;
excluded-selector rejection remains fail closed. The mandatory typed-closure
regression covers unclassified selectors, weaker protection, canonical path
aliases, and stronger inherited ceilings. Existing budgets, roots, rule payloads,
and blocking routes remain in force. The assertion-bridge fixture queries the
root install's effective pnpm store and retains frozen, offline installation and
the real typed baseline, rejection, and repaired-source pass.

Foundation issue
[#363](https://github.com/agent-teams-ai/engineering-foundation/issues/363), the
public Node CLI failure when launched from a Node test parent, was fixed and
released in `1.7.2` through
[#365](https://github.com/agent-teams-ai/engineering-foundation/pull/365).
That historical correction remains in the new published runner. The new tooling
candidate needs its own installed/native evidence; older successful runs do not
qualify the new lock or profile. Historical rejecting evidence remains retained.

Managed Docs adoption retains its historical qualification boundary. The old
`docs-2026-09-15-stable24` receipt authenticates Foundation `1.3.3` and adapter
`0.2.8`; it does not qualify the current upgrade. The public adapter has now
migrated the authentic stable24 origin to `docs-2026-10-03-stable31` against
protected Central revision `9625c6e6a73555d747cc4b0ba99a29549a75f107`, and its
after-check returned current for the previous Foundation `1.7.2`, Docs `0.6.2`
and adapter `0.3.2` tuple. The current tooling candidate installs Foundation
`4.0.2`; it is not a matching stable31 managed consumer. Keep the original
integration/state/receipts unchanged as the previous admitted tuple and the PR
unmergeable as a completed managed migration until the eligible central desired
transition and real successor assets/receipts exist. Registry installation and
portable semantic checks cannot substitute for that admission.

The compiler correction is authorized and can be implemented and tested now.
It does not authorize editing old receipt digests, fabricating stable33 canary
eligibility or changing the central owner's active recovery PR. Complete the
coupled managed upgrade through its actual owner, including its five-package
projection, profile/state/caller, runtime and observed default-branch evidence.

### Advisory quality diagnostics

The Orchestrator owns `architecture/foundation/quality-gate-runner.yaml`. Its one
`ci-diagnostics` profile allows only the existing root `lint:fast`,
`architecture:feature-module-profile`, and `specs:check` scripts. These
read-only leaves run with concurrency three and a 120000 ms deadline each. The
deadlines cap the concurrent diagnostic at two minutes within the Ubuntu
Architecture job's 15-minute budget, which has remained unchanged since it was
introduced. This ceiling is not timing evidence or a speed claim.

The Ubuntu CI invocation emits canonical JSON only after the independent
`pnpm check` succeeds and is advisory through `continue-on-error`; it neither
removes nor replaces any required gate. The profile does not authorize `check`,
`check:fast`, `check:changed`, architecture aggregates, `foundation:*`, `docs:*`,
`packages:*`, `typecheck*`, `security:*`, `reliability:*`, `specs:test`,
`specs:generate`, Nx, scaffolding, preview, QGR wrapper, writing, runtime, or
agent-flow scripts. It writes no report file or committed timing artifact and
provides no Windows evidence. Rollback removes the advisory CI step, package
script, capability declaration, and consumer-owned profile together.

The current exact Foundation release keeps `workspace.dependency-declarations`,
`architecture.source-dependencies`, `documentation.local-references`, and
`quality.suppression-governance` blocking through strict
`foundation.config.yaml`. Source dependency policy starts with materialized
production roots and expands in the same change that scaffolds a new package.
Generic local-reference and suppression policy belongs to Foundation; the local
documentation and lint gates retain project-specific metadata, diagram, owner,
and protected-rule checks.

Package-local feature dependencies remain an Orchestrator-specific closed-world
policy. Oxlint permits only the structural `domain/internal-api.ts` and
`application/internal-api.ts` shapes. The topology validator then requires an
exact, acyclic, used `feature_edges` entry for every production cross-feature
import and rejects deep imports, forbidden layer directions, and production
self-imports through the package export. The architecture-conformance corpus
contains both accepted and rejected fixtures for every supported edge shape.

`governance.architecture-decisions` is also blocking. Every real supersession is
declared in both directions, the lifecycle sections in
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

### Documentation authoring readiness

The live authoring profile materializes only a requested document and its real
parent path. It does not create empty `docs/contracts/` or `docs/operations/`
catalogs as readiness evidence. The first contract or runbook is linked directly
from `docs/README.md`; its collection index is introduced with the second real
document.

The Foundation v3 authoring profile declares the consumer-local
`registered-owners` set once, with the exact current membership from
`docs/owners.yaml`. All six qualified authoring types reference that set by ID.
YAML anchors are not an authority boundary, and a catalog-wide wildcard remains
forbidden because it would silently authorize future owners.

The shared Docs Protocol owns metadata-schema validation, registered-owner
membership, and repository-wide ID uniqueness. The Orchestrator validator keeps
only consumer semantics such as required headings, local links and anchors,
Mermaid, index policy, relation lifecycle, and content-impact routing.

The pnpm release-age delay is disabled for all dependencies. Exact manifest
versions, registry integrity, reviewed upgrades, and npm Trusted Publisher remain
mandatory for first-party registry releases. The candidate qualification lane
below does not claim registry adoption or change the current manifests.

## Full foundation tooling adoption

Planning baseline: 2026-11-26. This section owns the tooling part of the
[full module foundation](composition-and-dependency-injection.md), including
source candidates that are not published. It does not activate capabilities,
upgrade dependencies, accept production contracts, or qualify a deployment.
Engineering Foundation remains development-only; Orchestrator owns its source
classes, package catalog, allowed edges, business semantics and evidence.

### Source, artifact and consumer state

The inspected inputs are [Engineering Foundation `8432a973`](https://github.com/agent-teams-ai/engineering-foundation/tree/8432a9737486384f894436bfd9242500e422fa5a),
[Central `89b5d7c5`](https://github.com/agent-teams-ai/.github/tree/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178),
Orchestrator main `3dccf2c53bf11f3939a19734a58f5e64d96673d0`, and the
seven-document PR #111 checkpoint `8c908d6303d761e5d51016922d2eaedf1a362ef8`.
Re-read the actual head and each owner plan before implementation; a source
snapshot is not permission to overwrite another agent's active work.

| Subject | Observed source or artifact | Orchestrator state and next proof |
| --- | --- | --- |
| Foundation / FMS | Main manifests `4.0.2` / `0.4.3`; releases from `da1868240b96113582b508b0c15341c477d6334b` | Candidate pins `4.0.2` / `0.4.3`; installed compiler closure is TS `7.0.2`. FMS v1.1 constructs remain blocked until their separate source enforcement |
| Stack Toolchain | Main manifest `0.3.1`; published source `fac03920e50ebde038ae415edeb7aa9e3d610ada` | Candidate direct pin `0.3.1`; presets and v5 project authority migrated, ordinary reference builds retained |
| Portable Docs / managed adapter / MCP | Main manifests `0.6.9` / `0.7.1` / `0.2.12`; releases from `da186824…` | Docs `0.6.2` / adapter `0.3.2` remain installed. Stable31 records are the previous admission, not a matching new Foundation tuple; successor admission is pending |
| Document Authoring / Repository Mutation | `0.3.9` / `0.5.2`, released from `da186824…` | Portable Docs retains its old transitive pair; Foundation 4 uses the new pair. This candidate is not a completed managed five-package transition; preserve exact-build recovery evidence |
| CI Input Proof / Release Checks | Main manifests `0.1.3` / `0.1.0` | No O adoption or check-omission/publication authority inferred |
| Later main implementation | Effect diagnostics and findings-baseline lease correction follow the release source | [Draft #482](https://github.com/agent-teams-ai/engineering-foundation/pull/482) prepares Stack `0.4.0`, Foundation `4.0.3`, FMS `0.4.4`; delivery remains pending |

Current main contains later bytes under unchanged manifest versions. Never
identify its rebuilt archive as the already published archive of that version.
The [package manifests](https://github.com/agent-teams-ai/engineering-foundation/tree/8432a9737486384f894436bfd9242500e422fa5a/packages)
and [release records](https://github.com/agent-teams-ai/engineering-foundation/releases)
bound these observations; older guide status paragraphs and Central's October
tool catalog are navigation, not a ceiling on current source evaluation.

Keep source implementation, reviewed archive, installed qualification, immutable
publication, central Cohort lifecycle and actual consumer adoption separate.
Central's [inspected registry](https://github.com/agent-teams-ai/.github/blob/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178/governance/docs-qualified-cohorts.json)
has stable33 generation 3 VERIFIED/QUALIFIED at event 189, while stable31 remains
RECOMMENDED at event 186. Only the declared Extension Foundation canary may take
the narrower candidate route; Orchestrator is not that canary.

PR #111's [trusted Docs run](https://github.com/agent-teams-ai/agent-teams-orchestrator/actions/runs/45908886931)
loads validator `b30455e32cf5d54ade6d8301637701347e4ce57c` and rejects the
current registry's generation 3 row at `/cohorts/44` before consumer execution.
This controller/schema incompatibility is an upstream operational blocker, not
failed IAM or module behavior. Its repair must retain authenticated workflow,
current controller and managed adoption boundaries; a new package pin alone
cannot repair it. Central [#434](https://github.com/agent-teams-ai/.github/pull/434)
selects the Extension Foundation canary; [#441](https://github.com/agent-teams-ai/.github/pull/441)
handles finite Runtime retirement recovery. Neither implements Orchestrator's
eligible controller/Cohort transition. The central governance owner must qualify
that transition and its consumer-specific desired selection; these existing PRs
and their source qualification do not constitute Orchestrator migration evidence.

### Complete capability disposition

The [current closed root schema](https://github.com/agent-teams-ai/engineering-foundation/blob/8432a9737486384f894436bfd9242500e422fa5a/packages/engineering-foundation/schemas/foundation-config/v3.schema.json)
and [capability contracts](https://github.com/agent-teams-ai/engineering-foundation/blob/8432a9737486384f894436bfd9242500e422fa5a/docs/architecture/executable-capabilities.md)
define fourteen executable capabilities. Presence enables one; installation
does not. Every row has a disposition now; activation follows its actual inputs
and evidence rather than inventing publishing or domain facts.

| Capability | Current O declaration; planned activation and acceptance |
| --- | --- |
| `workspace.dependency-declarations` | Enabled; preserve exact catalog, workspace protocol and root-only managed development dependencies; qualify any manager/schema change |
| `architecture.source-dependencies` | Enabled v3 with root authority; every materialized source/package has one owner, explicit public entrypoints and runtime/development edges; reject hidden packages, deep imports and both cycle kinds |
| `quality.source-coverage` | Candidate enabled v5 with Foundation 4, neutral topology and Stack project authority; retain real defect/refusal evidence and the separate pending managed admission |
| `quality.format-coverage` | Not enabled; evaluate current source, complete physical census, literal formatter negotiation and real alternate validators; no unsupported suffix, ignored input or successful no-op may disappear |
| `quality.suppression-governance` | Enabled; preserve protected rules, expiring consumer waivers and rejection of blanket exceptions |
| `quality.executable-specifications` | Enabled; retain consumer schema/model ownership and distinct real property, mutation and model gates; connectivity does not prove their execution |
| `documentation.local-references` | Enabled; shared reference checks retain O metadata, prose, diagram and reachability semantics |
| `governance.architecture-decisions` | Enabled; preserve immutable accepted history and reviewed lifecycle/baseline promotion |
| `repository.agent-workflow` | Enabled; qualify changed-file routes and effective instruction scopes without replacing complete required CI |
| `quality.gate-runner` | Enabled for advisory diagnostics only; broader blocking use requires a reviewed existing-script DAG, deadlines, cancellation and preserved complete routes |
| `contract.protobuf-evolution` | Activate with a genuine released Protobuf boundary: exact Buf producer/configuration, descriptor, immutable evidence and breaking-change authority |
| `contract.json-schema-releases` | Activate for a real supported released family: closed references, positive/negative corpus, immutable release digests and actual consumers |
| `package.public-api-compatibility` | Activate before a real public package release; qualify every entrypoint and compiler, with release-owned baselines and hostile installed consumers |
| `repository.security-baseline` | Activate for an applicable publishing profile with genuine package, SBOM, provenance and tarball evidence; no fabricated publishing evidence |

| Separate mechanism or tool | Planned use and boundary |
| --- | --- |
| Source graph / ratchet / findings baseline | Reuse neutral observation, cycles and growth mechanisms; preserve consumer classification. A shrink-only baseline cannot admit forbidden production imports or missing source ownership |
| Docs / Document Authoring / Repository Mutation | Keep canonical Markdown/YAML and inert profiles, disposable projections, explicit authoring intent, exact-preimage mutation and exact-build journal recovery; Foundation `check` does not run authoring |
| Scaffolding | Retain the qualified library envelope and Plan/Apply/Receipt boundary; feature, Host, service and Nx recipes require their own qualification, not invented kernel support |
| Stack Toolchain | Qualify exact checker/preset/lint/format/compile/doctor scope; read-only standalone checking does not replace reference-graph builds. Cleanup remains explicit-file only |
| FMS package | Reuse shared v1.1 kernel/fixtures, optional Node runner and neutral topology projection; preserve O ownership and source-resolution evidence |
| Nx / CI Input Proof | Derived graph and later bounded selection/reuse only; complete input collection, independent successful evidence and executable FULL fallback remain O-owned; start in shadow |
| Release Checks | Adopt at a real publishing Host seam with complete independent observations and official release plan; pure comparison supplies no merge/publication authority |
| Consistency evidence / structural checks / Knip | Plan now; implement shared consistency mechanisms with the first durable mutation, source patterns with the first matching construct and dead-code checks after a real slice |
| Optional MCP / Effect / Landmines | Evaluate the actual selected profile and installed adverse cases; no mandatory fleet dependency, browser claim or E2E completeness follows from availability |

### Coherent migration and unpublished candidates

The [quality v5 migration](https://github.com/agent-teams-ai/engineering-foundation/blob/8432a9737486384f894436bfd9242500e422fa5a/docs/development/quality-v5-migration.md)
replaces the old quality runtime in Foundation 4; unchanged exported v1–v4 schema
bytes do not mean the new major executes those profiles. The migration must:

1. Preserve source policy, suppression rules, unknown-assertion protection,
   native/assets, test identities and complete ordinary gates.
2. Put the production compiler-project list in `toolchain.config.json` and add
   Stack as an exact direct development dependency; keep explicit reference builds.
3. Replace `featureProfilePath` with neutral topology and a v5 profile, including
   one measured budget. If derived from FMS, bind all source inputs with
   `derivedFrom` hashes and run freshness on an existing required route.
4. Qualify current FMS public entries and strict peers. Its Node runner accepts
   Foundation `^1.8.0 || ^2.0.0 || ^3.0.0 || ^4.0.0`, including the candidate `4.0.2`;
   its pure kernel/fixtures can be evaluated independently without forcing peers.
5. Run static, scope and full installed checks, a real failing/corrected source,
   complete unclassified-source/package rejection and consumer native gates.
   Scope-only success does not establish lint or semantic conformance.
6. Retain the previous exact package/profile pair as a coherent rollback; do
   not rewrite accepted ADRs, historical receipts or persisted transactions.

Unpublished implementation may be qualified now through exact reviewed source
archives in disposable consumers. Bind source/tree, build/toolchain, public
exports, archive digests, installed closure, independent outcomes and refusing
controls. Use strict peers and frozen resolution; workspace imports and an
in-place rebuild of an existing version are not installed artifact evidence.

Prepare the actual consumer migration and rollback while qualifying that
candidate. For current registry/managed adoption, deliver the immutable qualified
artifact and applicable central lifecycle, then change the coupled pins, lock,
profiles and observed evidence through their ordinary route. A source-based
production distribution is also a possible explicit successor profile: it must
own immutable custody, content identity, complete resolution, installed/native
qualification and recovery. Define and review that real profile before use;
do not label `file:`, a local link or rebuilt bytes as a passing registry check.
Neither path requires an artificial npm-only research wait or a repeated generic
owner confirmation for work already assigned. It does not waive production
contract, source authority or managed admission requirements.

### Owned tooling tasks and exits

These tasks are the tooling contribution to foundation task F1. Each names
Orchestrator-owned work; upstream shared implementation stays with its owner.
New maintained tooling/tests use ordinary `.ts`, effective strict checking and
TypeScript/compiler/parser implementations at least `7.0.2`.

**T1 — Artifact and execution inventory.** Engineering/tooling owns the exact
manifest/lock, `foundation.config.yaml`, `.oxlintrc*.json`, root `tsconfig.json`
and actual executable closure census. Record candidate and published bytes
separately, every compiler initialization and supported Node/platform profile.
Exit: complete reproducible installed inventory and source archive descriptor;
unknown input or older initialized compiler blocks the affected command.
Rollback: retain current files and historical evidence; no local store patch.

**T2 — Foundation/Stack migration.** Engineering/tooling owns `package.json`,
`pnpm-workspace.yaml`, lock, `toolchain.config.json`, quality profile and
neutral projection under `architecture/foundation/`. Integrate the six migration
steps above, with no duplicate compiler list. Exit: installed scope/full and
rejecting/corrected-source evidence on the same candidate, all required native
routes preserved. Rollback: previous package/profile/lock pair together.

**T3 — FMS v1.1 activation.** Architecture/tooling owns the primary
`architecture/feature-module-standard-profile.json`, quality projection and
`scripts/architecture/` adapter. Consume shared kernel/fixtures; qualify actual
source resolution, parent-only assembly, visibility, republication, type/runtime
cycles and deepest test ownership with first declared constructs. Exit: real
nested accepted/refusing cases and no flat-reader escape. Rollback: retain
`blocked-until-enforced`; never hide physical sources or keep duplicate rules.

**T4 — GM source and required evidence integration.** Architecture/composition
and engineering/tooling own the existing source policy, materialization/catalog
validators, `tooling/architecture-conformance`, lint fixtures and
`architecture/foundation/required-quality-tests.json`. Connect first-scope GM
containment, one Host graph, public surfaces and independent installed consumers
to actual required identities. Exit: useful two-profile operations and real
deep-import/no-op/omission/lifecycle refusal controls. A process/RPC profile also
needs its separate Dapr role evidence. Rollback: refuse the new scope; no second
handwritten assembly path or same-process substitute for an adopted service.

**T5 — Managed Docs migration.** Engineering/tooling owns the existing
`architecture/foundation/docs-*` files, authoring profile, skill and caller with no
inputs. Coordinate exact desired/observed state with Central; inventory recovery
artifacts and qualify actual managed plan/apply/after-check/rollback in TEST.
Exit: admitted lifecycle, coherent installed tuple and genuine required consumer
run at the same revision. Rollback: admitted old tuple and retained exact-build
recovery; never copy target versions into an unobserved historical record.

**T6 — Later capability activation.** Engineering/tooling and each actual
contract/release owner bind the remaining matrix rows to first real contracts,
publishing, durable mutation or measured execution cost. Extend existing gates
and inventories; do not create placeholder schemas, fake SBOMs, source evidence
or competing engines. Exit: each selected row has its own positive/refusing
artifact and consumer evidence. Rollback: preserve the complete previous gate
and report the unsupported capability; affected omission falls back to FULL.
Each future row keeps its real activation trigger; no unused publishing or
affected-execution claim is required to complete the common foundation. The
full capability design remains required now.

**Test volume is not an acceptance target.** The 27 November owner instruction
requires the smallest meaningful regression at the appropriate layer. Reuse
upstream contracts and the existing 18-identity consumer suite; add tests for new
joins, authority or credible failure only. The ranges below are early capacity
estimates for all T1–T6, not instructions to write that many lines. The immediate
compiler correction is a small subset: expected P 200–450, T 200–500 changed
adapter/test/setup lines before actual diff accounting, confidence 7/10. Existing
fixtures are updated, not duplicated; unchanged upstream tests count as zero new
consumer lines. Report actual final scope instead of filling a numerical quota.

O-only conditional estimate: T1–T6's applicable initial tooling integration is
1,250–2,800 maintained integration/tooling lines and 2,200–4,900 test lines,
plus 500–1,100 configuration/declaration lines. The P/T figures are a subset of
the common foundation P 3–6k / T 6–11k allowance, not an additional budget:
F1 includes T1/T2/T5, F2 includes T3/T4, and shared growth/source witnesses with
F7 are counted once. This excludes shared library
implementations, GM Host/consumer construction counted in the composition plan,
broad business features, real provider/service deployments, central recovery,
generated/vendor code and future activations. Missing upstream contracts are
explicit dependencies, not an instruction to duplicate them in O.

### Current validation limits

The previous closure initialized dependency-cruiser/TS `6.0.3` and Foundation
`1.7.2` → API Extractor `7.58.12` → TS `5.9.3`. The 27 November candidate removes
both dependency chains through normal package/lock migration. Published
Foundation `4.0.2` uses the native TS `7.0.2` SDK and the compiler-free API
Extractor Model; the installed root and Stack compilers are both `7.0.2`.
Metadata and CLI checks are permitted on this corrected closure. Never execute
the historical closure as a regression negative control.

The existing graph command uses Foundation's public source graph, preserving
useful cycle/unresolved/unsupported diagnostics. It is still advisory for product
source. Bare imports and aliases may be external observations in that API;
the blocking source-policy and Oxlint boundary gates retain layer/package
resolution authority. Existing valid, adverse boundary and cycle fixtures remain
on the required conformance route. No replacement parser or graph engine exists.

The native Vale executable is cached under the user's
`.cache/agent-teams-orchestrator/docs-tools`, outside the consumer source tree.
Its 40 MB binary exceeded v5's 16 MiB per-input witness limit when the old runner
put it in repository `.cache`. The cache move preserves version/platform and
archive checksum verification; no source exclusion or quality limit is weakened.
Run the real Docs path before the final quality check so cache recreation cannot
hide this regression.

A frozen installation, installed registry assertion and Stack doctor passed on
the initial compatible Node 24 check; the exact default Node `26.11.1` and pnpm
`11.18.0` lane now exercises the migrated checks. The final PR evidence must state
actual results and unresolved failures; this paragraph does not certify every
native/managed gate or a target's production behavior.

Trusted managed Docs remains blocked by its independent central controller and
cohort transition. Portable Docs `0.6.2` has no Foundation runtime edge and keeps
its ordinary semantic route. Preserve that required route and the old managed
receipts while preparing the actual admitted successor. A green portable check
or `assert-registry` result is not a managed Cohort qualification receipt.

## Sources of truth

| Concern                                 | Authoritative source                                |
| --------------------------------------- | --------------------------------------------------- |
| Workspace membership                    | `pnpm-workspace.yaml` and package manifests         |
| Allowed package identity and role       | `architecture/package-catalog.yaml`                 |
| Context acceptance and domain ownership | Owning bounded-context dossier and ADR              |
| Source dependency direction             | Dependency rules and architecture conformance gates |
| Compiler behavior                       | Package and root TypeScript configurations          |
| Portable task command                   | Package manifest script                             |
| Task and project execution graph        | Nx derived view                                     |
| Strategic relationship graph            | LikeC4 source model                                 |

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
- the Foundation public source-graph advisory report, with explicit local-edge
  limits and required valid/cycle/uncertainty controls; blocking source-policy
  and Oxlint gates retain package and layer authority;
- fixture-based architecture conformance tests;
- LikeC4 semantic validation and package-catalog consistency checks;
- repository-local documentation Skill, template-backed `docs:new` scaffolding,
  metadata query, and code impact anchors.

### Source-quality lanes

Status: active.

Oxlint is the lint runtime used by the repository commands.
The JavaScript boundary plugin executes inside Oxlint and is covered by the
architecture conformance corpus.

The fast CLI/editor route uses root `.oxlintrc.json`. Shared policy lives in
`.oxlintrc.base.json`; common tooling/fixture overrides and the protected
production typed configuration extend that base. The Foundation typed gate uses
`.oxlintrc.type-aware.json` and Stack's technical preset on the declared source
closure; it does not load the fast boundary plugin into typed execution. Nested Oxlint configs are disabled so a package
cannot weaken repository policy. Package-specific differences use reviewed root
overrides or a separate explicit capability gate. The conformance config inherits
that policy by deriving a temporary root-level config that clears only ignore
patterns, so intentional invalid fixtures can prove that blocking diagnostics
fire without maintaining a second rule copy. Oxlint counterexamples live in
`tooling/lint-fixtures`. Production lanes keep that directory ignored.
Foundation source-dependencies classifies it as `fixture.lint`
(`development` plus `dynamic`, not a `packageRoot`) so the files cannot sit
outside the graph. The Vitest counterexample is `*.test.ts` without a
`vitest` package import, so focused, disabled, and assertion-free tests
remain provable.

The quality lanes are deliberately different:

| Lane                   | Command                              | Policy                                                                         |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Focused fast feedback  | `pnpm lint:fast:files -- <paths>`    | Blocking rules for files being edited                                          |
| Focused typed feedback | `pnpm lint:type-aware:files <paths>` | Blocking typed safety for one or more explicit TypeScript files or directories |
| Repository fast gate   | `pnpm lint:fast`                     | Blocking correctness, suspicious-code, runtime, test, and boundary rules       |
| Type-aware gate        | `pnpm lint:type-aware`               | Blocking typed safety over production TypeScript roots                         |
| Full lint gate         | `pnpm lint`                          | Fast, type-aware, suppression-policy, and lint-configuration conformance       |
| Durable workflow research | `pnpm research:od035:check` | Strict TypeScript and protected typed lint for the disposable engine fixtures |
| Evaluation lane        | `pnpm lint:advisory`                 | Non-blocking bounded complexity and modernization findings                     |

The advisory lane runs fast repository-wide analysis first, then limits its
type-aware pass to materialized paths from the package catalog. Invalid fixtures
and repository tooling do not become accidental TypeScript programs, and a new
production package cannot silently fall outside typed analysis.

The blocking baseline enables the built-in TypeScript, Oxc, Unicorn, import,
JSDoc, Vitest, Promise, and Node plugins where they provide high-signal checks.
Capability-specific plugins such as React, JSX accessibility, Next.js, Vue, or
Jest are activated only when a real package needs them. Every promotion requires
valid and invalid fixtures and a clean baseline review.

The root policy explicitly extends the Stack Node and production
maintainability presets. Handwritten product and repository-tooling source is
limited to 500 effective lines per file, 150 per function, complexity 20,
nesting depth 4, and 5 parameters. Package tests, script `*.test.mjs` and
`*.test.ts` files, intentional fixtures, architecture-conformance harnesses,
and the disposable `scripts/research/od035` engine harnesses use the Stack
test profile:
800, 250, 30, 5, and 6 respectively. Generated and vendored paths disable only
these five budgets. Agents must split responsibilities before crossing a budget;
there is no untracked per-file maintainability exception.

TypeScript 7 remains the authoritative compiler. Type-aware Oxlint supplements it
through the exact pinned `oxlint-tsgolint` release and never replaces
`pnpm typecheck`. Unsupported rules are not listed as protection; the conformance
suite proves that representative blocking diagnostics really fire. The
type-aware runner resolves explicit source roots, reports the number of selected
TypeScript files, and fails closed when that count is zero. Blocking lanes also
deny warnings so a newly introduced warning cannot silently weaken CI.

Explicit typed-lint targets must exist and contain TypeScript inputs. The runner
checks both repository-relative containment and canonical physical containment,
rejecting parent or symlink escapes. It invokes Oxlint from this repository root
with repository-relative paths, so the exact consumer override selectors apply
to focused inputs as they do to the full typed route. There is no implicit
whole-repository fallback when paths are absent.

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
- intentional invalid fixtures are ignored by normal lint, classified in
  source v3 as `fixture.lint`, and exercised directly by conformance tests.

Stage 0 remains active through every later stage. Nx does not replace it.

### Durable workflow research tooling

[OD-035](../open-decisions/OD-035-local-durable-workflow-engine.md) owns the
comparison of native workflow engines. Its disposable fixtures live under
`scripts/research/od035`. Their SDKs, PostgreSQL distribution, execution loader,
and supporting libraries are exact catalog-pinned root development dependencies.
These research pins do not accept a production engine or qualify a PostgreSQL
distribution for release.

`research:od035:typecheck` compiles every fixture with the primary TypeScript
compiler and the Stack Node profile. `research:od035:check` also runs
`.oxlintrc.research.json`, which inherits the protected Stack typed preset
and repository common policy, enables type-aware analysis, denies warnings, and
disables nested configurations. Root `typecheck:root` invokes this explicit gate,
so both full and fast verification include the research source. The production
quality topology and its mandatory test identities remain unchanged.

The source graph declares development boundaries for the bootstrap and each
candidate. A small PostgreSQL binary adapter resolves fixed public optional
distribution exports relative to the wrapper package. Its reviewed CommonJS
runtime-reference capability is limited to that file; it accepts no arbitrary
module name or path. Research sources also remain inside suppression governance
and the existing conformance-harness maintainability budgets.

`pnpm research:od035 <candidate>` starts an owned disposable native PostgreSQL
cluster, executes process-failure scenarios, records public JSON evidence, and
stops its cluster. The native CI matrix uses the explicit Node 24 compatibility
lane on Linux, macOS, and Windows. A negative control verifies that a bootstrap
failure returns a nonzero status. Windows uses PostgreSQL's own `pg_ctl`
restricted-process startup; all platforms initialize UTF-8 data. The results
distinguish executed assertions, expected negative controls, and unsupported
process-suspension probes. Successful runtime CI does not qualify signed
installation, upgrades, restore, or every OS/architecture combination.

### Dependency catalogs

Status: active.

The default pnpm catalog owns the exact primary toolchain and reusable external
dependency versions. Workspace package manifests refer to those dependencies with
`catalog:` and refer to internal packages with `workspace:`.

Named catalogs record accepted dependency ownership. The tooling migration
removes the retired `tooling-ts6` catalog and its dependency-cruiser peer exception.
The graph command uses the already owned Foundation mechanism, while the default
catalog retains TypeScript `7.0.2`. Exact root development exceptions for
Foundation, Stack, FMS and Docs are declared in the dependency policy; ordinary
workspace dependencies keep their existing catalog/workspace rules.

Dependabot is limited to security updates, so TypeScript patch and minor updates
arrive through manually opened reviewed pull requests, and a major transition
never comes from the updater. A major compiler transition must examine the
primary compiler and every embedded compiler/parser through one reviewed
toolchain decision. Inspect each effective embedded compiler before execution
and preserve the previous gate's guarantees through the reviewed replacement.

Strict catalog mode and `pnpm architecture:dependencies` are blocking. The latter
checks every workspace manifest, including manual edits, and rejects direct
external versions, non-`workspace:` internal references, missing catalog entries,
and non-exact catalog versions.

Package release-age waiting is intentionally disabled for delivery speed. Supply-chain
safety remains covered by exact catalog versions, lockfile review, audit tooling, and
the repository quality gates.

Adding a dependency requires:

1. verifying its exact source/release, supported scope and maintenance state;
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
- every initialized compiler/parser, including embedded programmatic APIs,
  satisfies the `7.0.2` floor; isolation is not an exception;
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

The repository adapter passes an immutable consumer-owned recovery scope into the
Foundation API and consults Foundation's public transaction-aware status only to
give an existing scaffolding transaction Apply precedence. Journal parsing,
lease-protected scope validation, and recovery mutation remain Foundation-owned.

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
- complete dependency analysis through a qualified compiler-compatible route;
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

The Gateway review wrapper in `.github/workflows/reviewrouter-review.yml` comes
from the current-main migration in commit `dec970e`. It dispatches an explicit
review request, PR number and exact review head to
`777genius/review-router/.github/workflows/reviewrouter-runtime.yml@workflow-v1`.
The consumer guard checks the dispatch-only boundary, required inputs, input guard,
request-scoped serialization, read-only repository permissions, OIDC permission,
bound input forwarding and absence of inherited secrets. It also freezes the
complete reviewed wrapper bytes with SHA-256
`d30c359c172a2d2e6ad8af7b5557894ae8d601f5f4957a87153aa93810966cc4`. This verifies the consumer workflow,
not the remote Gateway service's runtime behavior.

The explicit interaction V2 workflow retains the ReviewRouter `v1.0.138` baseline
at commit `75cbecab131d74021677fcd1fb21962994d306b8`: event filters,
read-only fallback permissions, OIDC exchange, immutable checkout actions and
explicit runtime steps remain local. Its Node.js 26.11.1 runner source keeps
SHA-256 `336a904791d2e84164b44b2342aa5acc6d63cff36aac71cbce80a8c6fc8b8843`.

The security gate requires both current workflow files. Targeted Gateway and
interaction mutation fixtures reject authority drift, and exact-source checks
reject any other unreviewed changes. An upgrade updates the affected reviewed
digest, semantic expectations and negative witnesses together.

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

The accepted design proposes `foundation context --changed`, a mutation
generator and `foundation consistency:check --changed --explain`; these are
not shipped commands in the inspected Foundation CLI. Qualify the shared
implementation and actual consumer route before issuing them as instructions.
The planned release gate must retain complete write-path discovery so an
affected-graph omission cannot hide an unregistered mutation. ADR-0078 owns the
policy; T6 owns activation planning, not a claim of implemented coverage.

## Structural architecture rules

Status: accepted, implementation begins with the first matching production source.

ast-grep owns structural code invariants that are more precise than text search and
are not import-graph questions. The initial rule families cover:

- GM imports, descriptors, Assembly entries, static groups, and graph preparation
  containment inside `composition/**` and composition tests under ADR-0113;
- one Host-owned assembly graph and application lifecycle per declared role,
  with gRPC/Dapr invocation mapping confined to adapters behind typed ports
  under ADR-0114 and the [service role map](deployment-profiles.md#service-role-map);
  framework handles must not enter application ports or public contracts;
- prohibited direct clocks, randomness, process APIs, and infrastructure
  constructors in domain code;
- accepted factory and public-handle shapes where TypeScript types alone cannot
  prevent service-locator leakage.

A rule is introduced with valid and invalid fixtures and starts advisory. It becomes
blocking only after it reports the intended invalid forms, accepts supported valid
forms, has a remediation message, and produces no unexplained findings against the
real source tree. Generic style and import direction remain with Oxlint and the
dependency graph stack.

The first materialization PR for a selected private process boundary must connect
its source rules and process/RPC conformance to the required quality runner with
declared test identities and rejecting fixtures. Control Host to Team Topology
S3 must exercise separate processes through Dapr; a same-process router cannot
satisfy that boundary. These boundary checks must block production admission;
an advisory-only rule does not satisfy the materialization requirement. This is
an implementation obligation, not a claim that the current structural tooling
verifies Dapr, deployment, or active-agent
capacity. Deployment and workload qualification retain their own evidence.

## Dead-code and dependency hygiene

Status: accepted, implementation begins after the first vertical slice.

Knip reports unused files, exports, dependencies, binaries, and catalog entries
across pnpm workspaces. It starts advisory because framework entrypoints and
generated contract artifacts can produce false positives. Promotion requires
fixtures for every intentional dynamic or generated entrypoint.

## Public TypeScript API reports

Status: accepted, implementation begins before the first publishable package
release.

The accepted target requires a reviewed public API report for every publishable
TypeScript package, committed for explicit type-surface review. The historical
API Extractor `7.58.12` / TS `5.9.3` chain has been removed from this candidate.
Foundation `4.0.2` supplies the native TS 7 report mechanism and compiler-free
model package. Before the first publishing adoption, qualify its actual public
entrypoints, baselines, packed consumers and release authority through the owning
capability. A safe CLI/toolchain closure does not by itself activate or qualify
public API reports for a product package.

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

| Failure class                                    | Owning tool                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Package identity                                 | Package catalog and topology validator                             |
| Package materialization                          | Package materialization policy, topology validator, and scaffolder |
| Project and task impact                          | Nx                                                                 |
| Structural source import boundaries              | Oxlint with boundary rules                                         |
| Exact package and feature dependency edges       | Topology validator and conformance fixtures                        |
| Local source graph and cycles                    | Foundation public source graph; blocking source-policy and Oxlint own package/layer rules |
| Repository-specific structural patterns          | ast-grep                                                           |
| Unused code and dependencies                     | Knip                                                               |
| TypeScript public API review                     | Accepted API report contract; compiler-compatible tooling qualification required |
| Protobuf compatibility                           | Buf                                                                |
| Packed npm runtime and type resolution           | publint and Are The Types Wrong                                    |
| Strategic context relationship topology          | LikeC4 plus repository consistency validator                       |
| Documentation workflow and implementation impact | Repository-local Skill and code anchors                            |

Do not add overlapping task runners or multiple tools that claim the same
architectural authority. A new tool needs a distinct failure class, deterministic
output, a maintained release line, acceptable TypeScript compatibility, and a
conformance fixture proving value beyond the existing stack.
