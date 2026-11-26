---
id: ADR-0118
type: adr
status: proposed
owner: architecture/composition
summary: Proposes the complete Get Modular and engineering foundation adoption transition with exact source artifacts and profile-specific qualification.
related:
  - ADR-0113
  - ADR-0117
  - ADR-0096
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.repository-tooling
  - architecture.implementation-readiness-gates
  - OD-042
  - OD-043
  - research.orchestrator-full-foundation-review-2026-11-26
---

# ADR-0118: Full Foundation Capability Adoption

## Context

On 26 November 2026 the product owner explicitly required full use of Get
Modular and the shared engineering tools, with the complete project foundation
designed before broad feature implementation. A small MVP describes business
scope; it must not reduce the foundation to Core/Assembly factories and postpone
the remaining architectural boundaries. Unpublished source artifacts may be
evaluated immediately.

ADR-0113 currently pins Core/Assembly 0.5.0 and an older Consumer Module Standard.
ADR-0117 extends mandatory composition across applicable TypeScript families.
Neither accepted body is rewritten by this proposal. The accepted Get Modular
runtime pins, CMS profile and product activation evidence remain unchanged until
their coherent adoption migration passes. The separately authorized compiler
and repository-tooling candidate is described below. The owner's full-coverage direction is recorded
in the current [composition plan](../architecture/composition-and-dependency-injection.md#full-foundation-implementation-plan);
this proposed record specifies its next artifact and qualification transition.

The [dated review](../research/orchestrator-full-foundation-review-2026-11-26.md)
compares actual public roots, tests, source, release records and open owner plans.
It distinguishes available mechanisms from Orchestrator adoption. Research and
successful upstream CI are not consumer qualification.

## Decision

### Complete foundation scope

Use Get Modular as the sole framework for meaningful independently assembled
TypeScript capabilities: Host/role roots, nested feature groups, infrastructure
adapters, selected library/SDK assembly and reusable instance templates. Private
cohesive helpers remain ordinary code. Domain/application layers use owned ports;
Get Modular declarations and carrier types remain in composition and tests.

The adoption inventory covers Core, Assembly, Resources, Observation, Conformance,
native Effect and the private lifecycle candidate. Every row names a real use or
qualification profile, owner, exact artifact, positive/negative evidence and
activation state. An incompatible or private surface cannot be omitted as
"optional later" or imported as if it were a released API. Maximum useful
coverage does not require a scope/store/container for every pure function.

The full foundation also includes FMS v1.1 nesting and source enforcement,
engineering quality and authoring tools, typed extension contributions, artifact
trust and distribution, durable installation, update/recovery, state continuity,
Browser/Desktop boundaries, isolated execution and operator recovery. These
capabilities have concrete owning workstreams, even when their implementation is
pending. Existing OD-041/042/043 and deployment acceptance floors remain intact.

### Reviewed candidate cohort

The reviewed Get Modular source is
[`50a7148387a3c01163b319da76052ba07e0dbd84`](https://github.com/agent-teams-ai/get-modular/tree/50a7148387a3c01163b319da76052ba07e0dbd84).
Its complete `docs/architecture/common-assembly.md` SHA-256 is
`ef5044eef1da7a01f3ca40323cd17d9f2597fc22b5abb905c7c77e5318b408d7`.
Retain the organization FMS v1.1 identity and immutable digest from ADR-0113.

| Candidate | Intended adoption |
| --- | --- |
| Core 0.8.0 and Assembly 0.8.0 | Exact compatible pair; object/raw validation, typed descriptors, complete maps, entries/groups, explicit profiles, borrowed inputs and reusable templates |
| Resources 0.2.2 | Ordinary cooperative ownership for acquired resources; Host retains control, original close and cleanup debt |
| Observation 0.2.1 | Latest-state projections, snapshots, watch/load and owned subscriptions; never a durable command, audit or revocation channel |
| Conformance 0.5.2 | Development-only module, contract, wiring and layout evidence; independent expectations remain consumer-owned |
| Effect adapter 0.1.1 with Effect 4.1.4 | Real native asynchronous/resource profile; native construction, interruption, error and lifetime tests, not a Promise wrapper |
| Lifecycle kernel 0.1.0 | Private source candidate reviewed through its actual shared lifecycle owner; no independent Orchestrator lifecycle engine or private deep import |

The six public Get Modular versions have release evidence at the review date;
the lifecycle candidate is private. A source tree and a published archive sharing
a version string are not assumed to have identical bytes. Before activation,
record the actual archive integrity, source/build identity, public exports,
resolved peer closure and one physical identity-bearing package copy per
interacting Host/realm.

Engineering Foundation, FMS, Stack and Docs migrate as a coordinated owner
packet under the [tooling adoption plan](../architecture/repository-tooling.md#full-foundation-tooling-adoption).
That packet resolves current old-compiler initialization, quality profile v1 to
v5, actual source coverage and managed Docs compatibility. A package-only bump
cannot satisfy it. The exact package/profile/lock tuple is completed from the
qualified artifacts; this proposal does not invent that receipt.

### Source artifacts and adoption

An unpublished mechanism may be built and packed from an immutable reviewed
commit into an isolated qualification consumer now. Retain source and archive
hashes, build/toolchain identities, strict peers, a frozen dependency closure and
installed public-root tests. Never infer publication from a manifest version or
use a floating branch, private source alias or untracked linked workspace as
production evidence.

Current registry and managed-cohort assertions remain truthful. Production
adoption either follows their qualified artifact route or an explicitly reviewed
successor distribution contract with equivalent evidence. User authorization to
evaluate source does not require another generic permission request; a missing
shared packaging or admission mechanism is an implementation dependency, not a
reason to bypass its checks.

### Ownership and independence

Core owns local composition semantics; Assembly and the selected native
integration own their respective construction mechanics. Resources owns cooperative
cleanup bookkeeping; Observation owns replaceable state delivery. Engineering
Foundation/FMS own shared development mechanisms. Extension Foundation owns
artifact/trust and neutral contribution compatibility. Live Module Updates owns
the reusable update/recovery algorithm. Orchestrator owns its product grants,
durable installation/head/attempt receipts, state and effect-receiver fences.
Agent Runtime owns provider execution and its physical custody. Browser,
Frontend, native Host/Supervisor and selected plugin executors own their actual
execution boundaries, isolation and termination under the applicable profile;
none is implicitly delegated to Agent Runtime merely by using a module.

The neutral Get Modular and Extension Foundation cores do not depend on each
other. A narrow outer integration joins their real public contracts. Every
selected process owns its own graph. Dapr/Protobuf crosses genuine private role
boundaries; local calls stay local. Deployment variants reuse owning business
implementations rather than reconstructing a remote service in a factory.
Platform invokes Orchestrator through its API/SDK and versioned authority
contracts; this adoption creates no shared product database or second Task engine.

### Scoped tooling implementation authority

On 27 November the product owner explicitly instructed correction of the old
embedded compiler paths. That authorizes the Foundation/Stack quality-v5 and
source-graph tooling candidate described in the
[tooling record](../architecture/repository-tooling.md#source-coverage-adoption).
Its required consumer checks and centrally admitted managed Docs transition
remain separate completion conditions. This scoped instruction does not turn
this whole proposed foundation ADR into accepted product/runtime adoption.
Preserve all other accepted pins, old receipts and outstanding target gates.

### Activation and completion

The [foundation gate](../architecture/implementation-readiness-gates.md#module-foundation-before-business-expansion)
distinguishes complete design, the qualified common foundation, execution
readiness for an exact profile and completion of the full required foundation.
Broad business expansion requires the complete design and common foundation
evidence, including nested-source rejection, Resources/Observation/native Effect
profiles and the representative 500-entry difficult growth shape. The 1,000-entry
target has a separate measured growth row; generated source is not 1,000 business
features or a concurrent-agent throughput result.

Replaceable entries additionally need the working shared invocation boundary and
their current authority/state/lifetime closure before dependent production code.
Browser, Desktop, isolation and live updates retain their own mandatory exits;
static success is not "full foundation ready". Missing exposed capabilities
refuse before evaluation/effect. Existing ADR-0103 admission remains exactly
scoped and grants no new authentication, plugin or deployment claim.

Complete the migration as one coherent package/profile/lock/evidence change,
with a reverse migration that preserves durable state, pending operations and
recovery journals. Its accepting record names the superseded adoption fields and
updates their machine authority; immutable accepted ADR text is retained.

## Consequences

- Agents get a complete capability and ownership map plus finite implementation
  cards before multiplying modules. The same technical mechanisms support
  standalone, managed and local delivery without copying product behavior.
- More foundation work precedes broad feature growth. Missing shared primitives,
  source enforcement or exact consumer evidence remain visible dependencies.
- All capabilities are designed and exercised in their appropriate profiles;
  mutually different carriers and platform guarantees are not mixed into one
  universal container or misleading qualification result.
- Versioned ports and stable operation boundaries reduce avoidable rewrites.
  They do not promise zero future migration, schema changes or API evolution.

## Rejected alternatives

1. Core/Assembly-only starter followed by unplanned extensions: insufficient for
   the owner's explicit full-foundation request and likely to duplicate lifecycle
   and state mechanisms in early features.
2. A custom universal module/event/plugin framework: duplicates selected owners,
   obscures authority and increases the code and test surface.
3. Treat every future target as already supported, or require all future product
   features before any qualified profile can progress: neither matches finite
   evidence, accepted admissions or incremental product delivery.

The [scored alternatives](../research/orchestrator-full-foundation-review-2026-11-26.md#alternatives-and-estimates)
retain confidence, reliability, complexity, scoped code/test estimates and limits.
