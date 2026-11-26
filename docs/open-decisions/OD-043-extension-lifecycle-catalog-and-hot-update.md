---
id: OD-043
type: open-decision
status: open
owner: architecture
summary: Decide extension catalog governance, isolation tiers, lifecycle transitions, hot update, rollback, and operator experience.
related:
  - ADR-0095
  - ADR-0096
  - architecture.extensions
  - architecture.security
  - OD-037
  - OD-042
---

# OD-043: Extension Lifecycle, Catalog, and Hot Update

## Decision required

What exact catalog, installation, activation, update, drain, rollback,
uninstallation, revocation, isolation, and recovery protocols should apply to
built-in, first-party private, community, and custom extensions?

## Accepted constraints

- OCI, ORAS, Cosign, immutable digests, and the shared extension foundation are
  fixed by ADR-0096.
- Artifact storage is separate from catalog and marketplace governance.
- The shared Foundation has already selected one PostgreSQL canonical store
  per writable catalog source and explicit deterministic authority routes in
  [EF ADR-0003](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md)
  and [EF ADR-0004](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/decisions/0004-deterministic-catalog-federation-and-namespace-authority.md).
  This open decision still needs to select product adoption and placement; it does not introduce
  Git, a search index or an OCI registry as a co-equal catalog writer.
- A catalog listing, publisher identity, signature, entitlement, and manifest
  permission request do not grant product authority.
- Active generations are explicit. Update cannot silently replace in-flight
  ownership or leave two mutation authorities active.
- Install, update, disable, rollback, and uninstall require durable observable
  outcomes and must not rely on registration order.
- Uninstall does not implicitly erase user or bounded-context data.

## Questions that remain open

- the first product catalog placement and adoption profile: a writable service,
  qualified federation or a read-only local/signed-snapshot resolver, under the
  shared canonical-store and authority rules;
- trust roots, publisher onboarding, moderation, revocation, transparency, and
  compromised-key recovery;
- trusted in-process, sandboxed process, Web Worker, iframe, and remote-service
  isolation tiers;
- exact generation drain, state migration, cleanup, leak detection, rollback,
  and restart fallback behavior;
- offline installation, air-gapped Harbor, cache integrity, and registry outage
  behavior;
- CLI and UI workflows that hide raw OCI, ORAS, and Cosign mechanics;
- conformance requirements for publishing the first stable public SPI.

## Full foundation integration handoff

**Current source review: 2026-11-26.** These are Orchestrator-dependent
implementation cards under OD-043. The
[full foundation review](../research/orchestrator-full-foundation-review-2026-11-26.md)
records the common capability inventory and source/adoption comparison;
[proposed ADR-0118](../decisions/0118-full-foundation-capability-adoption.md)
records the proposed adoption transition. Neither document accepts this open
decision, a public SPI or production readiness. Common module migration, nested
source enforcement and tooling activation remain with the composition/readiness
owners and are budgeted once outside these dependent cards.

### Current upstream handoffs

| Owner and source | Observed state | Orchestrator handoff |
| --- | --- | --- |
| EF main [`a1b5007ae4777bb5b01adab35a9ee83546a62333`](https://github.com/agent-teams-ai/extension-foundation/tree/a1b5007ae4777bb5b01adab35a9ee83546a62333) | Architecture and TEST qualification; the production package catalog is empty | Reuse accepted artifact/trust obligations and qualified evidence; TEST matchers are not a shipping runtime dependency |
| EF workstream A, [Draft #70](https://github.com/agent-teams-ai/extension-foundation/pull/70), [`d1830b3515f311c1af538b33e15ac5a0e955ade3`](https://github.com/agent-teams-ai/extension-foundation/blob/d1830b3515f311c1af538b33e15ac5a0e955ade3/docs/architecture/plugin-delivery-plan.md#workstream-a-packaged-extension-foundation-2026-11-26) | Open, unmerged, plan-only at inspection | A owns evidence verification, contribution compatibility, the verified artifact path and its package/conformance proof; O supplies its product authority and adoption evidence |
| LMU main [`a780597acd3fcae2936a2a258241f1da7ce62f94`](https://github.com/agent-teams-ai/live-module-updates/tree/a780597acd3fcae2936a2a258241f1da7ce62f94) | Static authoring and controlled-restart TEST reference; no production LMU package or accepted public API | Reuse installed-root, state and lifetime evidence within its declared scope; it does not prove live A-to-B overlap |
| LMU workstream B, [Draft #9](https://github.com/agent-teams-ai/live-module-updates/pull/9), [`171b0f56ba359b27cc8649d4686996dedb15090f`](https://github.com/agent-teams-ai/live-module-updates/blob/171b0f56ba359b27cc8649d4686996dedb15090f/docs/plans/first-operation-implementation-plan.md#workstream-b-complete-module-updates-2026-11-26) | Open, unmerged; owner-authorized implementation B0-B7, with B0 and L0/L1 reported in progress; inspected head contains documentation, not completed runtime evidence | B owns the complete operation, invocation/state boundary, independent Hosts and final EF join; O integrates the resulting qualified artifacts through narrow ports |
| B0 installed consumer, former [Draft #8](https://github.com/agent-teams-ai/live-module-updates/pull/8), [`66da493bd2984b3b871463203102f78613127cee`](https://github.com/agent-teams-ai/live-module-updates/blob/66da493bd2984b3b871463203102f78613127cee/docs/plans/installed-feature-consumer-plan.md) | Closed unmerged as superseded; reviewed plan incorporated into #9 at the inspected head | One dependent-feature proof through installed canonical Export contracts; no separate competing implementation or prerequisite for existing closed static composition |

Refresh exact heads, changed paths and executed receipts before implementation
or acceptance. A PR title or authorized execution does not establish delivered
behavior. A/B own their reusable implementations and shared integration files;
Orchestrator does not edit those concurrently or copy their transition rules.
The [shared assignment](https://github.com/agent-teams-ai/live-module-updates/blob/171b0f56ba359b27cc8649d4686996dedb15090f/docs/plans/foundation-delivery-plan.md#two-executor-assignment-2026-11-26)
retains sequencing. Its trusted Node EF-verified-artifact join does not supply
durable installation, a production Host or Orchestrator's stricter adoption gate.

#### Successor source inspection

Later on 2026-11-26, [LMU #9](https://github.com/agent-teams-ai/live-module-updates/pull/9)
advanced to [`2f7392f3b1a9541e84ece0a910a14c49cbacb62f`](https://github.com/agent-teams-ai/live-module-updates/tree/2f7392f3b1a9541e84ece0a910a14c49cbacb62f).
It contains the B0 installed dependent-consumer implementation and
[L1 invocation/native-authority TEST probes](https://github.com/agent-teams-ai/live-module-updates/blob/2f7392f3b1a9541e84ece0a910a14c49cbacb62f/tests/qualification/update-operation/invocation-profile.md).
The [selected cooperative fixture](https://github.com/agent-teams-ai/live-module-updates/blob/2f7392f3b1a9541e84ece0a910a14c49cbacb62f/docs/decisions/0001-cooperative-update-profile.md)
does not yet supply the complete production operation or product adoption.
Keep the earlier four-Markdown-file checkpoint above as history; current source
and executed receipts belong to their exact owning PR/run, not its title.

A further source inspection found [LMU #9](https://github.com/agent-teams-ai/live-module-updates/pull/9)
at [`97e051b73f42e485ca5479ecb06444edd548097c`](https://github.com/agent-teams-ai/live-module-updates/tree/97e051b73f42e485ca5479ecb06444edd548097c).
This unmerged private source contains the portable invocation and update
coordinator, preparation/publication/reconciliation/retirement, installed
public-root consumers and an optional native Resources adapter. The
[usage and ownership contract](https://github.com/agent-teams-ai/live-module-updates/blob/97e051b73f42e485ca5479ecb06444edd548097c/docs/architecture/cooperative-operation-usage.md)
keeps the ordinary library independent of GM/EF; `live-module-updates/resources`
is a separate optional peer integration. Consume these shared mechanisms through
O2/O5 rather than implement another coordinator or cleanup stack.

Complete B6 qualification of the same packed operation through independently
wired Node and Chromium Hosts, ordinary delivery and actual-main checks, and
the B7 EF-verified-artifact join remain pending under the
[owning phase plan](https://github.com/agent-teams-ai/live-module-updates/blob/97e051b73f42e485ca5479ecb06444edd548097c/docs/plans/first-operation-implementation-plan.md#workstream-b-complete-module-updates-2026-11-26).
Earlier L1 target evidence does not establish those complete-operation exits.
The finite cooperative profile requires synchronous inert canonical-head reads;
it does not qualify O3 durable/multi-replica authority, O4 restart recovery,
streams or hostile containment. A local cached head cannot stand in for the
unqualified distributed authority. Those capabilities retain their actual owner
and profile-specific evidence.

EF #70 now records owner-authorized implementation in its PR assignment, while
its published source head remains the two-document `d1830b35` checkpoint above.
The assigned first artifact profile is trusted finite Node with one signed
self-contained ESM bundle and declared data assets. It supplies no arbitrary
graph loader, durable installation or hostile containment. Neither shared PR is
treated as a completed product delivery by this successor observation.

### First Orchestrator adoption journey

The proposed first contribution is a **read-only sandbox-manifest inspection
summary**, a projection builder for operator inspection of already authorized
immutable metadata. Its semantic owner is the existing
[Agent Context sandbox-manifest feature](../../packages/contexts/agent-context/src/features/sandbox-manifest/README.md)
in `packages/contexts/agent-context`, package `@agent-teams/agent-context`.
The current `SandboxManifestApi.getManifest` remains the authorized source.
Placement is the selected
[Control Host interactive composition](../architecture/deployment-profiles.md#service-role-map)
in the catalogued server or local application; this introduces no Agent Context
assembly worker or provider-formatting responsibility.

This is an **implementation reservation for OD-043**, not an existing port,
implemented plugin or extension of ADR-0103 admission. A narrow owning decision
must admit the summary use case, contribution contract and lifecycle profile
before production code. Put its port and adapter beside sandbox-manifest; do
not materialize another package solely for this example. The adapter receives
only reduced immutable metadata disclosed by the owning use case after current
scope checks and returns bounded plain data. The use case validates the result
and current disclosure authority before exposing it. It receives no SQL,
seed/migrate method, source
resolver, credentials, grant authority or aggregate-policy replacement. It
cannot compile provider prompts or turn manifest text into runtime authority.

Architecture/composition owns the selected Host's O3/O4 installation/publication
implementation within the existing catalogued app reservations and materialization
gates. Before code, record its exact source paths, durable repository/schema owner,
scope and CAS
transaction. Consume the configured Access Control authority through the owning
port; do not create another grant ledger. Agent Context keeps its manifest
schema and canonical data. An absent Host installation/head/attempt store is
substantive prerequisite work, not an assumed adapter or part of A/B's delivery.
The role gate places recovery/drain handlers; an interactive handler cannot
absorb background work that requires a separate coordination or execution role.

The required product acceptance journey is: verify/install contribution A;
activate and obtain a useful authorized summary; retain one admitted A operation
while qualified B serves new requests; disable and remove; restart and reconcile
without resurrecting the disabled contribution or deleting the source manifest.
The Host fences stale projection publication and revoked disclosure at the real
receiver. A pure summary contribution need not invent private durable state;
where a later contribution owns state, its actual custody/migration owner and
compatibility evidence are additionally required.

This journey joins O2-O5 and O9 using actual shared artifacts. It is not passed
by the library's Document fixture or by two configurations of one O Host.
OD-041's GHCR/Harbor and independent-product floor and the Browser/Desktop/
isolation exits below remain required at their applicable production claims.
Eligible built-ins follow the same supported operation and retirement rules
without fabricated OCI artifacts or artifact installations. A package is not
automatically an installed plugin; unsupported change profiles refuse or use an
explicitly qualified controlled-restart path.

### Product seams to establish before dependent implementation

Feature-owned application ports remain independent of GM, EF, LMU, transport,
renderer and provider types. Outer adapters map their actual supported facts;
neither EF nor GM neutral core imports the other. A replaceable entry exposes a
stable operation boundary while its raw instance stays within its lifetime
owner. An ordinary pure or borrow-only module needs no artificial lifecycle.

Keep semantic contract/revision, GM capability/revision, package version,
artifact and executable-closure digest, installation, candidate/runtime
generation, update attempt, active-head revision and state baseline distinct.
Exact listener/resource identity is separate from a stable route or plugin name.
Owner-defined typed contributions and trusted payload validation replace no
product grant or receiver check. The
[EF contract packet](https://github.com/agent-teams-ai/extension-foundation/blob/d1830b3515f311c1af538b33e15ac5a0e955ade3/docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#proposed-first-contract-packet)
remains proposed; its TEST exact-revision carrier is not an accepted universal
manifest, SPI or permission system. Do not freeze invented API names here.

Atomic selection, admission and retention cover the whole supported operation:
synchronous reentry, nested calls, awaits and any separately promised stream
consumption/return/error. Returning a Promise or iterator does not establish that
all work has settled. Custody precedes candidate evaluation or acquisition and
survives partial setup, late completion and a caller abandoning its wait.
Seal new ingress before cancellation callbacks; distinguish cancellation,
settlement, cleanup and actual physical termination. Preserve borrowed pools and
canonical state, the original Resources/native close flight, and visible debt.

The inspected LMU L1 profile uses explicit operation-bound continuations: a
fresh facade call is a new admission; bound nested and post-`await` calls retain
the admitted generation. Roots and explicitly registered descendants retain
work, and an escaped settled continuation refuses new work. Unregistered detached
work and streams are outside that first profile. Ordinary calls within a static
feature stay ordinary calls; no ambient service bag or wrapper for every helper
is introduced. Its Node Map and browser session-storage authority are session
fixtures, not Orchestrator's durable or multi-replica publication implementation.

Publication uses the real authority's expected revision and original
attempt/payload binding. Relevant current head, schema/state basis and grants
are enforced at the protected transition; a preliminary check is insufficient.
Candidate callbacks and external effects run outside database transactions.
Committed, rejected/conflicting and unknown outcomes stay distinct. A lost
acknowledgement retains the possibly active candidate until same-attempt
authoritative reconciliation; a later head does not prove the attempt never won.
Matching replay follows the owner's receipt; changed payload under one identity
refuses. Replica conflicts require canonical CAS, not a process-local mutex.

Canonical state and migrations remain with their feature/schema/custody owners.
A delayed A write still needs current receiver authorization and fencing; a
generation lease cannot grant it. Returning to old code creates a new authorized
compatible generation against current state and grants, without rewinding
external effects. A late A disposer cannot remove B's exact registration.
Runtime, borrower, artifact, history, old-client and private-state holds retain
their own owners and budgets; reader zero or a timeout cannot authorize deletion.
Normal upgrade and emergency revocation, overlap-safe preparation and exclusive
resource transfer, and drain versus forced interruption need explicit policies.

The coordinator and shared foundation have their own outer upgrade boundary.
The selected deployment owner or native Supervisor must qualify replacement of
that closure, using controlled restart where required, while preserving pending
attempts, installation records, state and recovery journals. A new coordinator
reconciles the original authority before replay or reclamation. It cannot claim
self-update safety from an ordinary feature cutover while old work is unresolved.

### Orchestrator-dependent implementation cards

These cards consume common foundation work rather than create another global
roadmap. Before code, record the concrete feature, owning package/role, allowed
paths, selected profile, accepted contract and current upstream artifact. New
packages appear only with substantive admitted behavior. An absent mechanism is
named implementation work; a successful stub cannot close its card.

#### O2: invocation and lifetime integration

Host composition consumes B's working one-generation B2 boundary and qualified
Resources/executor mechanisms. Demonstrate useful work, post-close refusal and
nested/reentrant/await affinity through installed exports. Hold raw work across
close, preserve borrowed state and observe the original cleanup/debt result.
A deliberate premature release must fail an external witness. If B2 is absent,
route the actual gap to its owner; do not copy the private lifecycle candidate.

#### O3: authoritative publication and reconciliation

The selected product authority implements durable scoped heads, expected-revision
mutation, current receiver fences and original-attempt/payload receipts. This
substantive owner mechanism is separate from LMU's reusable algorithm. Exercise
reply loss after commit, changed replay payload, racing replicas, stale state or
grant changes after preparation and delayed old-generation writes. Each context
retains its own transactions; no cross-context Unit of Work is introduced.

#### O4: durable installation and state custody

The selected lifecycle and custody owners implement durable artifact/contribution
records, enablement, staged references and restart reconciliation under the
applicable [EF ADR-0011 floor](https://github.com/agent-teams-ai/extension-foundation/blob/a1b5007ae4777bb5b01adab35a9ee83546a62333/docs/decisions/0011-extension-admission-custody-and-retirement-closure.md).
Disable, uninstall and data deletion remain separate. Fence/drain the complete
affected reverse dependency closure while retaining unrelated siblings and
borrowed providers. Unknown effects or exact state attachments prevent false
terminal completion; restart cannot resurrect disabled sources or stale grants.

#### O5: verified artifact and complete-operation mapping

One outer adapter maps A's verified artifact/import closure and owner-defined
compatible contribution to a known typed loader/factory and B's candidate/attempt.
Verify the actual evaluated bytes and target binding, with custody before import
and current authority before effects. Qualify useful B with coherent held A,
tampered/substituted/wrong-target refusal and exact predecessor cleanup. Reuse
the actual A/B libraries; no O-local verifier, resolver or update state machine.

#### O6: distributed role, state transition and rollout integration

The selected role owns only its local graph and authority scope under the
[role gate](../architecture/implementation-readiness-gates.md#first-materialization-role-gate).
Private calls retain Protobuf/gRPC/Dapr ownership; no local reconstruction of a
remote feature is a fallback. Exercise independent process/sidecar failure,
overload, readiness/drain and lost-reply recovery. State migration uses its
owner's actual baseline and receipt. Multi-scope rollout is an explicit owned
saga; it cannot advertise global atomic cutover or a distributed transaction.

#### O7: Browser and Desktop integration

O API/SDK and Local Host owners provide versioned calls, action/Target binding,
current authority, stale-result handling and unknown/reconnect reconciliation.
Execute actual browser and selected native-shell/OS paths, including malformed,
denied and incompatible calls. [OD-040](OD-040-fully-local-package-materialization.md)
still governs local materialization. [OD-042](OD-042-frontend-extension-contribution-model.md)
owns Frontend contribution/rendering, accessibility and UI continuity; O supplies
protected semantics, not a renderer. UI installation grants no Electron/Node or
local filesystem capability. Node plus Chromium alone does not qualify Desktop.

#### O8: isolated execution and capability receiver integration

The actual security/executor owner selects an enforceable boundary and narrow
brokered capabilities. O supplies current principal/scope/Target/generation
checks at its receivers. Qualify denied file/network/IPC/privilege access,
resource limits, crashes, recovery and observed physical stop in the selected
runtime. Signature, Worker/process placement and a grant toggle are insufficient
containment evidence. AR retains its execution/sandbox custody; O does not build
a second runtime or claim arbitrary JavaScript unload.

#### O9: operator readiness, progress and recovery

Selected operator CLI/API surfaces distinguish desired, selected, useful,
retained old work, unknown publication, cleanup debt and each remaining hold.
Rebuild observations from authoritative snapshots after gaps. Observation may
coalesce latest state and cannot replace durable operations, audit or revocation.
Report readiness and recovery for the actual deployed closure; a loaded module,
mounted view or requested stop is not useful adoption or completed retirement.

### Mandatory implementation and launch exits

Every row is required for its advertised capability; confirmed target rows stay
visible implementation obligations. Full foundation design acceptance requires
reviewed contracts and tasks for all rows now. Profile implementation readiness
needs actual evidence for its complete
dependency closure. Full foundation/release readiness cannot be claimed while a
mandatory row remains pending. The
[readiness gates](../architecture/implementation-readiness-gates.md)
retain admission authority; these cards mark no current gate passed.

| Capability and owner | Required positive and rejecting evidence before its claim |
| --- | --- |
| EF production adoption: product integration and A | Retain [OD-041](OD-041-shared-extension-foundation-and-artifact-distribution.md): same publish/resolve/verify/install/rollback fixture through GHCR and Harbor; public/private auth, scoped credentials/logout/rotation/outage, signature/provenance/revocation/compromised-publisher cases, CLI/API, catalog-outage safety and at least two independent product integrations |
| Whole-operation lifetime: Host and B | Actual installed facade; reentry/nesting/await affinity, held raw work, saved-facade refusal, borrowed-state survival and original-close/debt witnesses; streams require their own consumption/finalization evidence |
| Complete live update: B and product authority | Useful B while admitted A remains coherent; failed/late B preserves ownership; real CAS, lost acknowledgement/same-attempt recovery, stale-writer denial, exact-instance cleanup and finite retention budgets |
| Durable installation: lifecycle owner | Real restart/crash records and effects, no resurrection, distinct disable/remove/delete outcomes, affected dependency closure and sibling preservation; package-manager installation alone cannot pass |
| State/custody/rollout: actual semantic owners | Real schema/baseline transitions, denied or unknown migration, custody attachment/retention authority, compatible return-to-old-code and process/replica conflict/recovery; no invented cross-store atomicity |
| Browser: browser Host and O API/SDK | Operation actually executes in the browser realm against the declared authority/state placement; stale/denied results, retained compatible assets and actual listener/resource cleanup |
| Desktop: native Host/Supervisor and privileged receiver | Selected shell/OS, versioned IPC and denied/malformed calls, native resources, startup/readiness/drain/shutdown and restart evidence; OD-040 and native PostgreSQL/Temporal qualification remain applicable |
| Untrusted extensions: executor/security and effect receivers | Enforced denied capabilities, secret/state separation, quotas, compromised or malicious behavior, current effect fencing and physical stop; trusted-cooperative results do not satisfy this row |
| UI contributions: Frontend owner under OD-042 | Two independent extensions per proposed public contribution point, deterministic conflicts, lifecycle/crash/permission/version controls, host-enforced accessibility/keyboard/localization/theme and declared state/rollback continuity |
| Operator and stable public SPI: respective owners | Truthful useful/unknown/debt/retention outcomes; public SPI additionally needs its separately accepted contract, independently authored implementations and executable conformance before publication |

Two independent TEST Hosts establish only their declared reuse claim. They are
not two product adoptions or two independently authored SPI implementations.
The same built artifact is required when one-artifact portability is claimed;
different native target builds each need their own artifact and contract evidence.
Use disposable fixtures and independent state/effect/work oracles; deliberately
breaking the relevant fence or cleanup must fail after successful setup.

### Focused acceptance evidence

Use the smallest risk-based fixture family that distinguishes these new joins:

| Scenario | Concrete independent witness |
| --- | --- |
| Actual artifact and live adoption | The authorized source manifest is unchanged; useful B summary is observed while held A stays coherent; denied/stale output and late A cleanup cannot replace B's exact registration |
| Durable publication and removal | A small fault schedule around commit/acknowledgement and disable/removal reconciles the same attempt, causes no duplicate effect or resurrection, and preserves owner data after restart |
| Required target or trust boundary | Actual browser, selected native IPC or isolated executor exercises the new denial, privilege or physical-stop guarantee; an ordinary Node run cannot stand in for it |

Reuse A/B's mechanism suites, package/source conformance and unchanged role
fixtures; do not copy L1 invocation/authority cases into every O handler.
Add deliberate defects only for new receiver/fence/cleanup joins needing an
independent sensitivity witness. Select actual fault boundaries before adding
cases, count reused evidence once, and stop optional expansion when those risks
are covered. Documentation-only corrections require no new runtime suite. The
LOC ranges below are uncertain planning estimates, never test-volume mandates.

### Product-owned cost and uncertainty

P counts new handwritten O implementation/integration; T counts meaningful tests
and fixtures. These are conditional planning bands, not implementation quotas.

| Card | P LOC | T LOC |
| --- | ---: | ---: |
| O2 invocation/lifetime mapping | 150-350 | 500-900 |
| O3 real authority/CAS/attempt receipts | 1,000-1,800 | 1,600-3,000 |
| O4 durable installation/custody | 900-1,600 | 1,400-2,400 |
| O5 thin EF/LMU mapping | 250-600 | 700-1,200 |
| O6 existing-role integration | 300-700 | 900-1,800 |
| O7 existing-target boundary integration | 250-600 | 700-1,400 |
| O8 existing-executor/broker integration | 250-650 | 800-1,600 |
| O9 operator receipts/readiness | 200-500 | 500-900 |
| **Conditional O-dependent subtotal** | **3,300-6,800** | **7,100-13,200** |

Allow 45-90 engineer-days for one experienced engineer with focused review and
the stated prerequisites. Fitness U=8/10, expected reliability within the
declared qualified scope N=7/10 and complexity C=8/10 are ordinal judgments;
LOC/time confidence is 3/10 until the real owner/primitive inventory is complete.
The thin O5 allowance does not include absent O3/O4 stores and enforcement.

These are incremental dynamic mechanisms beyond the common F0–F7 budget.
O2 adds generation affinity/admission mapping, not a second Resources layer.
O5 adds the actual verified-closure-to-candidate join. O6 adds update/replica/
version-skew behavior over existing role transport; O7/O8 add dynamic semantics
over existing target/executor substrates. O9 adds update-specific authoritative
receipts and progress, not the common latest-state projection. Count reused
unchanged fixtures once. F8's new role substrate is excluded from both estimates.

Exclude common foundation-root migration/tooling, A/B reusable code and tests,
generated/vendor/docs lines, missing upstream mechanisms, new role substrate,
native supervision/packaging, an absent executor/broker, catalog implementation,
Frontend renderer, shared IAM rollout, external second-product effort and fleet
capacity qualification. O6-O8 assume those actual substrates exist; otherwise
name their owner and estimate the missing implementation separately before a
dependent commitment. Do not add this subtotal to overlapping older estimates
or present it as the complete cost of every target. Exact artifacts, reviews,
native runs and actual-main receipts belong in their owning delivery records.

## Research and next qualification target

The following retains the historical research basis. The dated handoff above
routes current dependent work without relabelling these proposals as execution.

The [reviewed research reference](https://github.com/agent-teams-ai/extension-foundation/blob/10deea1a11748df1fcbfc2766033c462fce3acd0/docs/research/plugin-system-research-reference.md)
records mature plugin systems, production replacement, stateful updates and
OpenClaw at an exact source revision. Its
[hot-reload proposal](https://github.com/agent-teams-ai/extension-foundation/blob/10deea1a11748df1fcbfc2766033c462fce3acd0/docs/research/hot-reload-and-generation-replacement.md)
contains the failure matrix, independent critic corrections and alternatives
rated for confidence, reliability and complexity, with separate production and
test LOC estimates. The links pin the reviewed proposal from
[Extension Foundation PR #55](https://github.com/agent-teams-ai/extension-foundation/pull/55),
not an assumed publication on main. These estimates assume existing product
authority and durable-operation primitives; they are not a production
qualification claim.

The recommended first target is a trusted, overlap-safe request capability:
one closed group of modules behind one typed request port, immutable Get Modular
construction per generation, product-owned durable publication and admission,
bounded old-work drain, and explicit execution/cleanup evidence. The owning
product must still select the concrete capability, trust tier, deployment
boundary, state authority, budgets and approval record before implementing that
profile. This research recommendation is not an accepted first-capability choice;
headless portability does not establish isolation for untrusted code.

Keep the following choices separate:

- normal upgrade and emergency security revocation;
- overlap-safe preparation and exclusive-resource ownership transfer;
- selection of a new generation and migration of already accepted work/state;
- logical authority revocation, registered cleanup and observed physical exit;
- reverting new-work selection and reconciling an uncertain external effect.

The static GM/FMS choice is accepted under ADR-0113 and ADR-0117, with the
current Core/Assembly 0.5.0 baseline and local foundation gate. It does not
select a dynamic Host, release or adopt a private lifecycle-kernel candidate, or satisfy
[OD-041](OD-041-shared-extension-foundation-and-artifact-distribution.md).
The stricter product requirement for two independent integrations and its
distribution/trust/lifecycle evidence remains in force. Research cannot lower
that floor or publish the deferred public connector SPI.

## Resolution

Open. Implementation must not invent these semantics implicitly.
