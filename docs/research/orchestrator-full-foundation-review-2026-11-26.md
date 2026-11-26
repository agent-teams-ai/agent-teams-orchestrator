---
id: research.orchestrator-full-foundation-review-2026-11-26
type: research
status: active
owner: architecture/composition
summary: Source-backed full module and engineering foundation coverage, coordinated implementation tasks, and qualification limits.
---

# Orchestrator Full Foundation Review 2026-11-26

## Scope and provenance

This review records the owner's 26 November direction: design the complete
Orchestrator foundation before broad business implementation, use all applicable
Get Modular capabilities and common engineering tooling to the maximum, and
review current source even when an artifact is not published on npm. A small
starter graph is not the requested end state. Every capability needs an explicit
use, qualification profile or reasoned applicability boundary.

This is dated source research, not an independent normative roadmap or adoption
receipt. [ADR-0118](../decisions/0118-full-foundation-capability-adoption.md)
records the proposed transition; the current
[composition profile](../architecture/composition-and-dependency-injection.md),
[repository tooling](../architecture/repository-tooling.md) and
[readiness gates](../architecture/implementation-readiness-gates.md) own the
implementation and activation route. Accepted ADR-0113/0117 retain their bytes
and current pins until a qualified successor migration changes the active profile.

The audit read public roots, implementation code, package metadata, accepted
decisions, tests, current documentation, PR state and CI observations through
GitHub. It did not execute a fresh package qualification campaign, change a
dependency, migrate a toolchain, or qualify an Orchestrator runtime. Estimates
and design scores below are engineering judgments, separately labeled.

| Reviewed source | Exact revision | Observation and limit |
| --- | --- | --- |
| Get Modular | `50a7148387a3c01163b319da76052ba07e0dbd84` | Main at retrieval; public API, implementation and evidence audit. |
| Orchestrator PR #111 | `8c908d6303d761e5d51016922d2eaedf1a362ef8` | Starting documentation candidate; foundation activation remained pending. |
| Extension Foundation | `a1b5007ae4777bb5b01adab35a9ee83546a62333` | Architecture and executable qualification research; no public production runtime package. |
| Live Module Updates | `a780597acd3fcae2936a2a258241f1da7ce62f94` | Proposed operation and maintained portable reference; no delivered public production update API. |
| Engineering Foundation | `8432a9737486384f894436bfd9242500e422fa5a` | Reusable development tooling; capability and consumer activation states require separate review. |

The Get Modular main [commit][gm-head] is a CI timeout correction. Its
[exact-source CI run][gm-ci] succeeded. The subsequent
[release preparation][gm-release] identifies source `50a714...`, 67 successful
jobs in CI attempt 2, and reports that all current public versions were already
published on `latest`. Publication and current-source equivalence are distinct:
these observations do not independently compare every registry payload byte
with the audited checkout or migrate a consumer's accepted pin.

There were no open Get Modular PRs at retrieval. Completed work includes native
Effect composition (#231), combined-inventory bounds (#240), communication and
overload qualification (#242/#248), foundation guidance (#251/#253), source-policy
and runtime-primitive qualification (#254/#255), the maintained authoring
reference (#256/#257), and the current CI correction (#258). The
[communication reconciliation][gm-communication] preserves the intentions of
closed predecessor PRs #210/#213/#222; those branches are not pending APIs.

## Findings and design options

### Get Modular capability coverage

The following inventory separates accepted mechanism, implementation, available
artifact and consumer evidence. A package being public or tested does not mean
Orchestrator has installed or adopted it. Optional mechanisms should serve real
boundaries; pure helpers do not acquire artificial entries, scopes or stores.

| Capability and current artifact | Real surface and proposed Orchestrator use | Evidence, status and boundary |
| --- | --- | --- |
| Core `0.8.0` | Object and raw-byte compilation, declarations, required/optional/many cardinality, exact compatibility, graph validation, immutable plan/order/digest and diagnostics. Compile each selected role and deployment root before effects. | Public root and installed-package tests; publication reported by current release preparation. The [Core README][gm-core] explicitly retains `not-claimed` qualification wording. A digest identifies inert composition, not executable or live-instance identity. |
| Assembly `0.8.0` | Contract descriptors, declaration builder, entries, groups, typed dependencies and roots, profile completion, independently supplied compositions, borrowed inputs, repeated runs, journals and failure formatting. One production assembly mechanism for applicable TypeScript boundaries. | Accepted ADR-0023/0031/0032/0035/0036 and current [public API][gm-assembly-api]. Core and Assembly are an exact release pair. Promise factories are sequential; construction does not establish readiness or rollback. |
| Resources `0.2.2` | `createScope`, `scoped`, `setup`, `use`, `child`, registration/control facets and reports. Own Dapr clients, connections, subscriptions and execution-instance resources at acquisition. | ADR-0030 supersedes ADR-0028. [Tests][gm-deep-scopes] cover deep trees, reentry, pending debt, escalation and retry. Published; cooperative trusted-code cleanup does not prove physical release. |
| Observation `0.2.1` | One-writer stores, snapshots, read-only facets, `watch`, latest-only `load`, error sink and testing entry. Follow appropriate configuration, availability and local status projections. | ADR-0034 and successor ADR-0039; Node runtime/type/mutation/archive tests. [Contract][gm-observation] documents coalescing, limits and untested browser execution. It is not durable event delivery, authorization or canonical product state. |
| Conformance `0.5.2` | `isolate`, `smoke`, contract suites, namespaces, independent wiring oracle, layout checks and handle diagnostics. Shared module/provider/root qualification tooling. | ADR-0033, public source and packed tests. [Development-only contract][gm-conformance]; independent expectations and a consumer source collector are still required. It does not prove physical release or qualify native Effect entries. |
| Effect `0.1.1`, peer Effect `4.1.4` | Native factories/Layers over verified GM bindings; typed construction errors/requirements, sharing, inputs and native finalization. Qualify a meaningful native resource-owning profile. | ADR-0043 source admission and ADR-0044 release admission. [Published integration][gm-effect] requires Core/Assembly `0.8.0`; `0.7.1` lacks its preparation bridge. Native and ordinary Promise carriers are deliberately distinct. |
| Lifecycle kernel `0.1.0` | Generation phases, call/custody leases, admission checks and retained counts. Review the optional Host mechanism with LMU and define Orchestrator's facade/route/custody adapter boundary. | ADR-0029 admits a candidate. [Source and tests][gm-kernel] exist; manifest is private and README disclaims release/product adoption. No loader, permission enforcement, distributed lease, callback supervision or physical cleanup. |
| Consumer Module Standard | Nested visibility/republication, feature groups, contract evolution, peer identity, ownership, adoption profile and rejecting checks. Design all applicable package-family boundaries now. | [Current CMS][gm-cms] plus exact local successor review. Installing libraries or copying examples does not activate a profile; accepted consumer history is not silently overwritten. |

Coverage includes library mechanisms that must remain ordinary alternatives,
such as Promise and Effect construction. Maximum use means their applicable
profiles are designed and qualified, not that one factory is simultaneously
executed through incompatible carriers or that every module imports every package.

### Composition, maps and independent expected wiring

The current authoring surface is `defineContract<Value>()({ id, revision })`,
`declareModule`, descriptor `provide`/`slot`, `implement<FeatureCapabilities>()`,
and static `group`. Declarations and entry wiring stay in composition; domain
and application code use narrow owned ports. The [Assembly types][gm-types]
make an entry invariant only over capabilities its declaration uses, allowing
independent team maps without importing a global Host map into each feature.

Current [ADR-0041][gm-adr41] preserves complete feature metadata through an
exported descriptor union and a named capabilities interface. Keep each imported
union in its own `CapabilitiesOf<ImportedContracts>` base and retain the same
sources in the union and bases, including unused transitive/private-child
contracts. Separate bases retain early duplicate-ID conflicts. Combining them
inside one mapped union can hide disagreement as a union-valued property.
Generated authoring and compiled parity controls must preserve that distinction;
a custom consumer-local type framework would duplicate the library mechanism.

Ordinary static roots use `prepare({ profileId, modules, roots, bindings, inputs })`.
The [completion implementation][gm-derive] selects all supplied module/input
entries and infers only an unbound required slot with one other provider by
capability ID. Core still rejects an incompatible revision. Optional and many
slots require explicit rows, including `[]`; ambiguous or absent required
providers fail before factories run. There is no registration-order fallback.

The second mode, `prepare({ composition, modules, roots, inputs })`, accepts an
independently compiled successful Core result. [Preparation][gm-prepare]
captures metadata before suspension, reconstructs and recompiles its profile,
and checks complete plan/digest parity. This supports controlled profile import
and desired-profile adapters without trusting a supplied successful-looking plan.
Both modes need representative positive and rejecting consumer evidence.

The raw Core entry is also a real capability: `compileCompositionJson` accepts
one `Uint8Array` per UTF-8 JSON declaration and profile. Accepted bytes are
snapshotted synchronously; exact numeric lexemes are validated before rounding.
The object entry accepts cooperative Host-owned records. Raw parsing is not
authentication, artifact admission or permission to execute the declaration's
claimed owner. A profile-import fixture can qualify this boundary without adding
an unnecessary raw compiler to every role's ordinary startup path.

Groups carry navigation labels only; names, nesting and member order never enter
the plan/digest. A feature tree, group tree, package graph and deployed service
topology remain distinct. Standalone, managed roles and Fully Local need explicit
static roots/profile IDs selecting local or remote adapters. One process owns
its graph; a Dapr client does not reconstruct a remote owner's feature graph.

The [independent wiring oracle][gm-conformance] pins providers and roots plus the
optional, many, explicit and alternative-provider rows that completion cannot
decide. It must be handwritten from intended architecture, not derived from the
profile or plan under test. Retain typed rejection of wrong contracts, revisions,
slots and map parity, together with zero-factory preparation failures.

### Lifetime, callbacks and communication

A prepared assembly is an immutable template, not an instance cache. Each run
has separate inputs, signal and scope and may overlap another run. The CMS
[instance recipe][gm-instances] reserves a child scope before the first await;
borrowed input providers must outlive every receiving instance. Cache identity
needs both plan digest and factory-set identity, since the digest excludes code.
Changing a module rebuilds its instance; nested templates provide smaller seams.

Assembly forwards `{ signal, scope }`; it never disposes that opaque scope.
The Resources `scoped` adapter supplies `{ signal, resources }` and one module
scope under the run. `setup` retains asynchronous acquisition and its cleanup;
`use` registers already-held disposables; `child` separates shorter lifetimes.
The Host retains control and decides close, deadlines, escalation and recovery.
Closing borrowed capability references is not legitimate ownership inference.

`close` reports complete/settled/debts and joins an existing flight. Escalation
requests faster cleanup; abandonment ends one caller's wait while the flight
continues. Failed cleanup remains debt and may be retried. A cleanup awaiting
its own or ancestor close can deadlock. Cancellation does not establish stopped
work, and a returned cleanup callback does not prove a native resource vanished.
Orchestrator needs held-work, late-acquisition and retained-debt evidence, not a
new generic lifecycle manager around these APIs.

Hooks can be capabilities consumed through ordered `many` slots. Their owner
defines invocation stages, outputs, failure policy, concurrency and settlement.
GM supplies selection and injection, not a universal hook/event runtime.
For callback sources, the subscriber owns unsubscribe; a provider that acquires
partially and throws must undo that acquisition. Register subscription custody
inside `setup` before reentry can close the scope; abort listeners must not throw.

The current [optional-event fixture][gm-events] connects one portable behavior
to independently wired callback-request and EventTarget-session Hosts on Node.
It observes equal repeated occurrences, explicit selection, invalid payload
handling and cleanup. It does not prove browser execution, RxJS installation,
replay, durable admission, tree shaking or universal listener-error isolation.
Orchestrator's JetStream and Dapr contracts retain their separate semantics.

Observation `watch` follows keys from an authentic snapshot and delivers later,
possibly coalescing intermediate commits. The owner alone writes and publishes
read-only facets; children request changes through typed commands. Read-only
typing is not field-level authorization. Use it where newest-state delivery
preserves meaning, not for messages, approvals, outbox/inbox or revocation history.

`load` keeps one active run and at most one newest waiting job. A changed value
aborts the active request; stale results are suppressed. The returned Promise
must cover all work and cleanup it starts. It suits queries/projections, not
unreconciled external commands. There is no cross-store transaction or subscriber
ordering guarantee; correlated state needs one owner's atomic aggregate commit.

[ADR-0039][gm-adr39] is a material successor: escalation reports
`observation.load.still-running` and keeps the drain pending until the active
loader settles. It no longer releases dependencies by finishing as a failed
debt while work continues. A Host can abandon a bounded wait while retaining
the original close flight, infrastructure and recovery owner. Subscription counts
and testing waits prove their stated observations, not production readiness.

### Native Effect qualification

The native profile must build a substantive resource-owning graph through public
Effect/GM roots. Wrapping Promise Assembly `run` does not recover native typed
construction, failure, interruption or Scope ownership. The
[Effect practices][gm-effect-practices] own the current recipes; do not copy a
second set into product framework code.

Qualify exact bindings, a shared-provider diamond, two selected alternatives,
declared borrowed inputs, expected failures, defects, interruption, private
resource Layer finalization, background work and stream consumption. Consume
resource-using operations inside the provided native lifetime; returning a lazy
service or Stream after that lifetime closes does not retain its resources.
Operation errors/request requirements remain on the operations, distinct from
the construction Layer's error/environment types.

Ordinary Conformance execution rejects native entries and cannot supply this
evidence by itself. Keep ordinary module/root tests and a separately named
native installed-package suite. Effect may construct independent providers
concurrently; its root order is not a startup protocol or global concurrency
limit. A product-owned bound is needed for expensive fan-out. Keep business
selection in declared GM slots; private native services must not form a competing
inter-module service graph.

### Scale and source enforcement

Hundreds of modules is a concrete qualification target, not evidence of unlimited
scale. The [Core profile][gm-limits] and [Assembly envelope][gm-envelope] impose
different limits; semantic feature nesting does not erase runtime carrier bounds.

| Dimension | Current finite contract/evidence | Consequence for this review |
| --- | --- | --- |
| Selected entries | 4,096 module and borrowed-input entries together. | Count inputs and modules separately in reports, then enforce the total. |
| Module tree | 4,096 module entries plus group nodes; at most 16 group levels with `modules` level 0. | Group overhead consumes budget; arbitrary FMS nesting is not unlimited Assembly nesting. |
| Roots and aliases | 1,024 roots and 1,024 input aliases; metadata identifiers bounded to 128 UTF-8 bytes. | Do not make each domain entity a root or capability. |
| Declaration/binding shape | 64 provides and 128 slots per declaration; 65,536 aggregate provides/slots and bindings; 1,024 providers per row; 262,144 provider occurrences. | Hook collections and generated inventories need explicit budgets. |
| Core graph/diagnostics | Graph depth 2,048 on the residual acyclic graph; diagnostics 256. | Report truncation; graph, source nesting and resource depth are different dimensions. |
| Type-scale fixture | 500 entries from 20 team maps under a Host interface; 100/200/500/1,000 observations. | Evidence concerns that shape, not every nested/inherited feature aggregate. |
| Type cost gate | TS7 single-threaded 500-entry budget: 542,562 instantiations and 104,500 types, with 5% bounds. | Check-time/memory observations are informational, not universal startup guarantees. |
| Packed Core/Assembly | 1,000 literal declarations in supported compiler resolution modes. | A typecheck fixture is not runtime throughput or business concurrency evidence. |
| Resources depth | Regression closes/reports 5,000-deep trees iteratively. | Corrects recursive-stack failure for covered cases; user callback time/memory remain outside the bound. |
| Observation | Default 64 subscriptions per store/scope, 8,192 per store, cascade depth 64; one buffered latest revision. | Short work needs its own scope or owned fan-out; measure realistic keys/subscribers. |

The current [type-scale tests][gm-type-scale] retain their exact fixture and
counter budget. The old [Orchestrator growth review](get-modular-adoption-and-scale-review-2026-10-21.md)
retains a TS7 nested/inherited-map N=500 timeout against `ddf1e0b` and a private
compiler experiment. Latest descriptor-union guidance and simpler Assembly
scale tests are relevant corrective evidence, but do not close that old fixture.
Re-run the actual representative nested shape on the supported current compiler
and selected artifacts; do not replace it silently with an easier fixture.

For the full foundation's stated hundreds-of-modules concern, 500 is a reasonable
representative candidate target; the owning profile records its accepted budget.
Keep 1,000 as an explicit larger target unless separately selected as an entrance
condition. No casts, private compiler, dropped contracts, weaker source scope or
unexplained timeout increase should turn an unsupported result into qualification.

The [CMS layout rules][gm-layout] require nested visibility, one-level curated
republication, direct-parent assembly, group ownership, type-only dependency
checks and no cross-feature load-time cycles. `checkModuleLayout` consumes
normalized file/import/export records; it does not collect the repository or
enforce every FMS layer rule. The GM Oxlint preset is not shipped. Integrate the
shared Foundation collector and declared policy rather than writing another
Orchestrator parser. Keep all governed roots, unknown-boundary rejection and
positive/rejecting fixtures in the actual consumer gates.

Default `smoke` repeats construction with failure and abort after each module;
large graphs can make that expensive. Feature/instance roots and intentional
`at`/`inject` coverage can target risks while an independent full-root oracle
checks composition. This is not permission to omit required ownership cases or
claim a small root qualifies the whole foundation.

### Artifact and evidence states

| Claim | Audited state | Evidence needed before a stronger claim |
| --- | --- | --- |
| Current public cohort exists | Core/Assembly `0.8.0`, Resources `0.2.2`, Observation `0.2.1`, Conformance `0.5.2`, Effect `0.1.1`; release preparation reports publication. | Exact chosen registry/source archive identities and installed consumer checks. |
| Raw/duplicate semantics remain open | Obsolete limitation: OD-005/006 are resolved by ADR-0021; raw compilation and `binding.duplicate-record` are implemented. | Preserve rejecting consumer coverage; proposed historical ADR-0013/0014 metadata is not current open authority. |
| M2/M3 retained qualification | Current Core README says executed at the completed checkpoint; [current-contract][gm-current-contract] retains older pending wording. | Reconcile exact subject/evidence before a qualification claim; do not assert either universal conformance or that execution never occurred. |
| Advanced SDK-growth activation | [Status][gm-growth-hold] is pending/HOLD, qualified false, with four external-authority/source-binding/custody blockers. | Trusted authority transport, exact candidate/base binding, released-artifact source binding and retained observations/receipts. |
| Orchestrator upgraded/adopted all packages | No such result follows from this research or proposed ADR. Current accepted baseline remains distinct. | Reviewed successor, exact artifacts, real consumer gates and retained migration evidence. |
| Dynamic/browser/desktop/hostile support | Required architecture targets with separate implementation/release tracks. | Actual selected platform, loading, isolation, authority, physical stop and recovery evidence. |

Current source fixes root-alias capture, composition/execution parity, inferred
binding budgets, shared unresolved candidates and the combined input/module
ceiling. Deep Resources and Observation value traversal are iterative. These
changes supersede stale defect descriptions, but a source fix is not a new
consumer adoption receipt. Package-version equality alone does not authenticate
current-main payload equivalence.

Immutable packed workspace artifacts are an allowed adoption candidate. Bind
source SHA, archive SHA-256/integrity, peer metadata and installed bytes; retain
candidate versus registry provenance. Keep one physical identity-bearing package
copy per interacting realm. `npm ls` helps inspection but is not a complete
duplicate-identity rejection gate. Never relabel a private candidate as released.

### Shared foundation inventory

The [Extension Foundation snapshot][ef-readme] owns artifact trust/distribution,
catalog separation, OCI/ORAS/Cosign direction and isolation/admission research.
It reports no public production runtime SPI/package. Its packed artifact-to-effect
and source-boundary results do not establish durable installed-plugin lifecycle,
signed OCI admission or the complete live-update operation.

The [LMU snapshot][lmu-readme] owns the proposed update operation, continuity,
switching and uncertainty model. Its maintained portable Document/Format/Export
reference has independent Node/Chromium Hosts; this is bounded fixture evidence,
not a public update runtime. Orchestrator still owns its product facade, readiness,
route/custody adapters and recovery interpretation; it must not copy the private
kernel or rebuild LMU's update state machine.

Separately, LMU [draft PR #9][lmu-draft] advanced during this review to
`171b0f56ba359b27cc8649d4686996dedb15090f`: the owner authorized implementation
and the PR reports B0/L0/L1 work in progress. The inspected head still changes
four Markdown files, not completed runtime implementation. PR #8 closed unmerged
as superseded. The main snapshot and this new assignment are distinct. The current
[OD-043 handoff](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md)
owns exact source/check receipts and the remaining adoption disposition.

The [Engineering Foundation snapshot][foundation-readme] provides development
policy/configuration, source/dependency checks, quality routing, TypeScript/Oxlint
presets, public API/security checks, scaffolding, documentation and artifact
verification. Product runtime must not import it. Package availability, capability
implementation and consumer activation are separate; current source claim drift
must be reconciled against exact ledgers/artifacts. The owning repository-tooling
document records the complete inventory and migration tasks; this report does
not create a second tooling plan or implicitly migrate an installed command.

### Alternatives and estimates

These are three credible construction shapes for the same full static foundation,
not alternatives between respecting and shrinking the owner's scope. All retain
the complete capability review, nested source enforcement, exact artifacts,
ordinary/native evidence and designed dynamic/platform handoff. The owner has
already selected GM and shared tooling; those choices are not reopened here.

U is confidence in fitness, N expected reliability within the declared scope,
and C implementation/maintenance complexity; higher U/N is better, higher C is
harder. Scores are ordinal judgments, not SLA, probability or measured uptime.
P is handwritten production/integration/tooling LOC; T is tests/fixtures LOC.

| Option | Boundary, advantages and principal risk | U / N / C | Incremental P / T | Engineer-days and sizing confidence |
| --- | --- | --- | --- | --- |
| A: ordinary role templates plus explicit native profile | Promise construction for neutral role Hosts; meaningful native Effect graph qualified separately; shared preparation and owned template lifetimes. Lowest carrier migration burden. Risk: accidental duplication of semantics across profiles; reject with common contract expectations and separate carrier tests. Conditional recommendation where existing ports remain neutral. | 9 / 8 / 6 | P 3–6k; T 6–11k | 20–40 focused engineer-days; medium-low confidence until exact seams/checker gaps are measured. |
| B: native Effect role construction plus ordinary boundary profile | Native construction/resource/error model is primary where service contracts fit; ordinary profile remains for external reusable modules and Conformance. Strong native ownership ergonomics. Risk: ambient services or private Layers become a competing selection/lifetime authority. Qualify exact sharing and no scope escape through installed roots. | 8 / 8 / 7 | P 4–8k; T 7–13k | 25–50 days; low-medium confidence because operation/error migration may expand scope. |
| C: multiple component templates behind owned facades | Each role divides independently replaceable lifetime components; Promise/native islands meet through explicit inputs/ports. Smaller reconstruction and smoke units. Risk: too many facades, borrowed lifetime edges and package boundaries. Falsify with independent teardown, stale-reference and replacement-boundary fixtures. | 7 / 8 / 8 | P 4–7k; T 7–13k | 25–45 days; low-medium confidence until replacement seams show real value. |

Option A is the conditional planning baseline, not an accepted execution backend
decision. Its strongest counterexample is an operation-heavy native subsystem
where neutral Promise contracts discard useful typed errors/context and require
more lifetime machinery than native Effect. Option C becomes preferable only
when measured rebuild/lifetime coupling warrants the additional boundaries.

The Orchestrator-only common-foundation allowance for F0–F7 is P 3–6k and
T 6–11k, not the full dynamic application-evolution program. It includes actual
seam/entry/group/root migration, Resources, Observation, native Effect, ordinary
role/port wiring fixtures, complete source enforcement and artifact/growth
qualification. The tooling subset P 1,250–2,800 / T 2,200–4,900 in the
[tooling plan](../architecture/repository-tooling.md#full-foundation-tooling-adoption)
is included, not added: F1 covers T1/T2/T5, F2 covers T3/T4 and shared growth/source
witnesses join F7 once. Configuration/declaration lines are reported separately.

Common work contains fixture-only contract boundaries for future EF/LMU use.
It excludes the runtime generation facade, verified-artifact-to-candidate mapping,
durable publication/attempt receipts, installation, dynamic rollout and target
integration. Those incremental implementations are the additional
[OD-043 O2–O9 allowance](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md#product-owned-cost-and-uncertainty)
of P 3.3–6.8k / T 7.1–13.2k. Reused unchanged tests and ordinary Resources, role
or target substrate are not charged again. F8's new role substrate and missing
native/executor infrastructure are outside these estimates.

The conditional combined Orchestrator scope is P 6.3–12.8k / T 13.1–24.2k,
assuming the named shared mechanisms and required substrates exist. This is
not a complete ecosystem or all-target delivery budget. Sizing confidence is
3/10 until the first inventory measures actual integration and enforcement gaps.

Estimates assume one experienced engineer, existing prerequisites and focused
review. They exclude generated/vendor code, documentation/evidence bytes, EF/LMU
algorithms, a new parser/broker/DI framework, broad IAM/Task/Team/Run features,
actual browser/desktop/hostile runtime implementations and infrastructure rollout.
External blocker resolution and asynchronous review lead time are not included.
Do not sum alternatives. A few hundred integration lines cannot plausibly prove
this full scope; unexpectedly large integration code should trigger a search
for duplicated upstream machinery or product features outside the admitted scope.

### Review findings

1. A comprehensive ADR alone cannot repair mutable text that still advertises a
   tiny initial envelope as the owner's current goal. Reconcile current routes,
   readiness tables and PR description while preserving accepted ADR history.
2. Cover every GM mechanism explicitly. Do not convert optional applicability
   into future omission or force pure helpers into artificial graph nodes.
3. Re-run the difficult nested growth shape. A different green 500-entry fixture
   does not close its historical failure or qualify source conformance.
4. Native construction requires native evidence; ordinary smoke is insufficient.
5. LMU ownership does not erase Orchestrator's facade/admission/custody handoff.
6. Integrate real source collectors and rejecting gates. A declared command,
   install, copied example or no-op wrapper is not enforcement.
7. Keep state, commands, occurrences and durable obligations distinct; preserve
   completion uncertainty, pending cleanup and exact owner authority.
8. Keep designed, implemented, qualified, published and adopted states separate.
   No source claim or green library CI should silently widen a product claim.

## Decision status and qualification

### Independent integration reviews

Three `gpt-6.1-sol` reviewers at `xhigh` examined the actual combined draft from
Get Modular/authoring, tooling/adoption and extension/update/product directions.
The first integration round found no P0 and identified these P1 corrections:

| Finding | Disposition in the corrected packet |
| --- | --- |
| Mutable MVP text still prescribed a small foundation and an obsolete collaboration pause | Reconciled technical route and acceptance row; dated the old pause as historical |
| The common table accidentally required the separate 1,000-entry target | Moved that target outside common acceptance; retained the difficult 500-entry requirement |
| F8/F9 could create a first-role dependency cycle and an implicit dynamic prerequisite | F0–F7 are common; F8 role materialization and F9 dynamic integration are separate dependent gates |
| Two profiles could be mistaken for independent Host integrations | Required distinct test drivers, adapters and lifetime owners; retained the separate two-product EF floor |
| Runtime custody was phrased too broadly | Named the actual Browser/Frontend/native Host/executor owner; AR keeps provider custody |
| LMU implementation authorization was confused with source delivery | Recorded the inspected four-Markdown-file head and separate in-progress report |
| Common, tooling and dynamic budgets could be counted twice | Made tooling a common subset and O2–O9 incremental dynamic work; excluded missing substrates explicitly |

Round 2 re-read the corrected files. All three returned GO for their reviewed
documentation scope, with no remaining P0/P1. This is agent content review, not
GitHub approval, runtime evidence, gate PASS or acceptance of the proposed ADR.
The reviewed content identities below precede only this review-record addition:

| Reviewed subject | SHA-256 |
| --- | --- |
| AGENTS.md | `23a5748ebd59de70631659582938667f440eda50aac29a8660dcc068ce469729` |
| ADR-0118 | `441ed2b01021bb905298a0759fd69f4f21efb8ae2f913f645770bd5e4fdca59b` |
| Composition plan | `23f28087304a9248d35a7a07a0af9855b130e270a735f845a6db3447cc1a04d3` |
| Readiness gates | `7179c2ea3e8641ba6552f5861867751ec670a8aa93441d8af8d07fd22a2f1c5f` |
| Repository tooling | `37b85554352d7e0585190fc5d62e5de672eca72a02a626bae0cbade5f3713cee` |
| OD-043 handoff | `77392a34370a035caeef4cf56d0d525f822a9c7b72156ddda457c7a769a2ed0a` |
| MVP brief | `eace35d5bad93287b3a333e69536babc2d6a740565584c57def5a23655879ef5` |
| Research before this record | `3cf501a43bd3cd7b2784a811be43e456528750a09b6e4d9885cd2bede66c0d18` |

### Admission status

The proposed successor and existing architecture documents own admission and
task sequencing. [ADR-0113](../decisions/0113-canonical-module-and-composition-adoption.md)
and [ADR-0117](../decisions/0117-reconcile-mandatory-module-composition.md) remain
historical accepted authority, not mutable migration checklists. OD-043 retains
the product extension/update question; ADR-0114/0115 retain separate role,
transport and Fully Local requirements. This report accepts no new package,
profile, runtime, provider or public SPI, and marks no readiness row complete.

The complete design can be reviewed now. Broad business expansion follows the
full selected common-foundation proof; dynamic/platform tracks have concrete
owners and per-profile gates rather than an unsupported universal-ready claim.

## Evidence and sources

[gm-head]: https://github.com/agent-teams-ai/get-modular/commit/50a7148387a3c01163b319da76052ba07e0dbd84
[gm-ci]: https://github.com/agent-teams-ai/get-modular/actions/runs/45881280165
[gm-release]: https://github.com/agent-teams-ai/get-modular/actions/runs/45885656221
[gm-communication]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/research/module-communication-2026-10/reconciliation-2026-11-24.md
[gm-core]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/core/README.md
[gm-current-contract]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/architecture/current-contract.md
[gm-assembly-api]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/assembly/src/index.ts
[gm-deep-scopes]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/resources/tests/deep-scope-suite.ts
[gm-observation]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/observation/README.md
[gm-conformance]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/conformance/README.md
[gm-effect]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/effect/README.md
[gm-kernel]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/lifecycle-kernel/README.md
[gm-cms]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/architecture/common-assembly.md#consumer-module-standard
[gm-types]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/assembly/src/features/construction/types.ts
[gm-adr41]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/decisions/0041-preserve-complete-feature-maps-with-descriptor-unions.md
[gm-derive]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/assembly/src/features/construction/derive-profile.ts
[gm-prepare]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/assembly/src/features/construction/prepare.ts
[gm-instances]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/architecture/common-assembly.md#dynamic-instances
[gm-events]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/tests/assembly/optional-event-adapters.test.ts
[gm-adr39]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/decisions/0039-retain-observation-load-drain-until-its-run-settles.md
[gm-effect-practices]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/packages/effect/docs/practices.md
[gm-limits]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/architecture/qualification/v1/resource-profile-v2.json
[gm-type-scale]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/tests/assembly/type-scale.test.mjs
[gm-envelope]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/architecture/common-assembly.md#preparation-and-resource-envelope
[gm-layout]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/docs/architecture/common-assembly.md#feature-layout-and-implementation-form
[gm-growth-hold]: https://github.com/agent-teams-ai/get-modular/blob/50a7148387a3c01163b319da76052ba07e0dbd84/architecture/sdk-growth/status.json
[ef-readme]: https://github.com/agent-teams-ai/extension-foundation/blob/a1b5007ae4777bb5b01adab35a9ee83546a62333/README.md
[lmu-readme]: https://github.com/agent-teams-ai/live-module-updates/blob/a780597acd3fcae2936a2a258241f1da7ce62f94/README.md
[lmu-draft]: https://github.com/agent-teams-ai/live-module-updates/pull/9
[foundation-readme]: https://github.com/agent-teams-ai/engineering-foundation/blob/8432a9737486384f894436bfd9242500e422fa5a/README.md

## Limitations and remaining questions

This review supplies source-backed findings and critical design options, not
fresh runtime benchmarks or independent certification. Existing upstream tests
and successful CI are observations of their exact subjects. Orchestrator still
needs its own artifact/source binding, nested/growth proof, ordinary/native
lifetime evidence and installed-consumer results. Shared capability claim drift
and SDK-growth HOLD remain explicit upstream issues; they are not silently
declared resolved here or converted into a blanket ban on all ordinary adoption.

The next owning review must select construction shapes and actual deployment
profiles, reconcile mutable adoption guidance, and bind completion to the real
consumer commands. Browser, Desktop, hostile extensions and live replacement
retain their declared target status and separate proof. This report does not
reduce the full foundation to a starter skeleton or estimate that wider program
as if it were only Orchestrator adapter code.
