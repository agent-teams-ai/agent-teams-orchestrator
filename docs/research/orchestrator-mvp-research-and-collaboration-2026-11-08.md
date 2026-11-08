---
id: research.orchestrator-mvp-research-and-collaboration-2026-11-08
type: research
status: active
owner: architecture
summary: Dated proposal for incremental product implementation, shared-foundation readiness, and orchestration research.
related:
  - ADR-0027
  - ADR-0051
  - ADR-0072
  - ADR-0079
  - ADR-0095
  - ADR-0096
  - ADR-0103
  - ADR-0113
  - ADR-0114
  - ADR-0116
  - ADR-0117
  - OD-004
  - OD-005
  - OD-013
  - OD-026
  - OD-027
  - OD-028
  - OD-033
  - OD-041
  - OD-042
  - OD-043
  - OD-048
  - architecture.composition
  - architecture.dependency-rules
  - architecture.extensions
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
  - architecture.overview
  - domain.modeling-standard
---

# Orchestrator Product Implementation and Collaboration Plan, 2026-11-08

## Scope and provenance

**Draft proposal for incremental product implementation in the accepted
architecture.** The product owner's 2026-11-09 clarification makes the first
implementation the intended foundation of the product. No later Orchestrator
rewrite is assumed. Each delivered capability uses its real owner, contracts,
state and composition from the outset. The first usable release can still be
an MVP; that describes its feature scope, not a temporary architecture.

Bounded research remains useful where evidence can change a decision. Such
candidate probes and their test data are explicitly disposable. They do not
create a parallel product implementation or implicitly admit new behavior.

The product owner's discussion with Hassan identified an AI Product Blueprint,
autonomous task planning, and an evidence-based feedback loop as useful first
applications of a general orchestration system. They do not fix the product to
software development, particular roles, or a Claude-to-Codex sequence.

Initial research: **2026-11-08**. Architecture alignment review:
**2026-11-09**, against [the initial proposal d1c62d9](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/d1c62d9c82ff26f0aa000769204f62cbd91f6071/docs/research/orchestrator-mvp-research-and-collaboration-2026-11-08.md).
The product-direction review extends [the retained-MVP revision 389e084](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/389e084fc8819c74dc6454f8281363aa26be1d43/docs/research/orchestrator-mvp-research-and-collaboration-2026-11-08.md)
with organization governance, Extension Foundation, and current Runtime reuse.
Method: repository and upstream source review; the proposed experiments below
have not been executed. Reviewed baselines:

- [Orchestrator at a34587b](https://github.com/agent-teams-ai/agent-teams-orchestrator/tree/a34587b313e656eeb43d755b4a4f08c40dff2116).
- [Agent Runtime at f990acc](https://github.com/agent-teams-ai/agent-runtime/tree/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e).
- [OpenCode 2.2.6 at dc2ffcf](https://github.com/anomalyco/opencode/tree/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06).
- [Get Modular source at 5fb8347](https://github.com/agent-teams-ai/get-modular/tree/5fb83478dd7b95216be92c4d3077eddf2774eef8),
  reviewed for context, not an upgrade of the adopted 0.5.0 pair or its standard.
- [Organization guidance at 0b44c64](https://github.com/agent-teams-ai/.github/tree/0b44c64c824f536bd1b085341e7669bcc64ef124).
- [Extension Foundation at 29ae5b0](https://github.com/agent-teams-ai/extension-foundation/tree/29ae5b0269d9d83f071344e3e18761ded04ff53d)
  and [draft provider research at 7fd1e33](https://github.com/agent-teams-ai/extension-foundation/blob/7fd1e3392c732b64053edb11cfd32a7711dfdec8/docs/research/plugin-choice-deepening-2026-11-06.md).

The document's `active` metadata means active research. It grants no production
implementation admission and changes no accepted ADR. Links to `main` below
provide current navigation; these commits fix the reviewed baseline.

## Findings and design options

### Product direction and delivery scope

Build the smallest environment in which a user gives work to a team, agents
coordinate and review results, new information can change ongoing work, and
interrupted work continues without losing recorded progress. The first
integrated acceptance target uses two teams, three or four agents, and one
project with disposable test data, delivered through separately admitted
increments. It is broader than the existing first-sandbox admission. This
demonstrates coordination and recovery, not the eventual 10,000-agent capacity.

Use TypeScript at the supported baseline (at least 7.0.2), Clean Architecture,
SOLID, strategic/tactical/evolutionary DDD, and semantic DRY. Keep the functional
scope small while following the accepted feature, state, and composition model.
Replaceable and effectful integrations use narrow consumer-owned ports.
Implement actual capabilities with their full applicable architectural rules.
The initial delivery does not require empty future contexts, every extension
placement, or a polished desktop integration. If externally installed plugins
are selected for that delivery, their complete applicable admission and
qualification become explicit work, rather than an assumed library feature.

Distinguish two deliverables. A candidate probe answers a bounded question in
the governed research lane and cannot become a product execution path by simply
changing its label. A retained slice uses the real owner/application code,
contracts, migrations, and accepted feature layout. Each slice identifies its
current implementation admission or the exact extension needing review before
implementation. A context dossier marked accepted does not admit all future
features: ADR-0103's Work scope excludes assignment, dependencies, completion,
and review. These remain proposed product increments under the
[readiness gates](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/implementation-readiness-gates.md).

Hassan can choose any workstream by interest and experience. The product owner
maintains the overall architecture and has substantial runtime and input
delivery experience; that direction is not automatically assigned to Hassan.
Both can contribute across boundaries.

### Applicable organization and foundation rules

The [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md),
[organization governance](https://github.com/agent-teams-ai/.github/blob/main/GOVERNANCE.md),
and each repository's accepted local adoption apply from the first retained
change. The organization standard explicitly favors small coherent deliveries,
library-first ownership for concrete shared mechanisms, and reduced feature
scope before weakening invariants. It does not require a universal platform
before useful product behavior.

The [Feature Module Standard registry](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/feature-module-standard/README.md)
and Orchestrator's [local profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/feature-module-standard.md)
own the selected immutable version and scope. Current upstream guidance does
not silently upgrade that pin. Engineering Foundation supplies adopted checks;
Get Modular supplies composition; Extension Foundation supplies applicable
extension mechanisms. None replaces product-owned invariants or decisions.

Keep three claims separate: intended architectural compliance, admission to
implement a particular capability, and observed release/deployment qualification.
This proposal establishes a delivery direction and review route. It does not
turn open decisions, draft libraries, or passing research fixtures into any of
those qualifications. Use the owning sources below instead of copying their
rules into a second normative standard.

### Workstreams to choose from

| Workstream | Question and smallest useful result |
| --- | --- |
| Module foundation and domain model | Qualify a small Get Modular composition scope and the selected slice's DDD boundaries before expanded business assembly. Reuse the existing Sandbox Manifest seam and required conformance tooling. |
| Extension integration | Define the first concrete extension journey, product-owned port, artifact/lifecycle scope, and applicable admission. Connect real consumers to the shared foundation without creating another plugin manager. |
| Configurable workflows and authoring | Research existing libraries, formats, and industry approaches. Compare two different team processes and recommend a definition model and editor strategy before implementation. |
| Tasks and continuous execution | Authorized users and agents create, inspect, update, and coordinate Tasks. Dispatch eligible work until completion, blocking, pause, or an explicit budget. Recover a missed wake without a busy loop. |
| Runtime integration | Assess and qualify the existing ADR-0091 interactive path for the first retained integration. Complete its canonical provider adaptation and Runtime ACL; keep OpenCode as a separately scoped harness comparison. |
| Durable processes and recovery | Use Temporal and PostgreSQL to recover waits and progress after a crash. Exercise JetStream redelivery and reconcile uncertain external operations. |
| Feedback, priority, and attention | Accept user and teammate messages, requirement changes, and service events durably. Apply routine updates at safe points; preserve progress before an urgent switch. |
| Task continuity and collaboration | Resume with the same executor, hand work to another, and let two authorized executors contribute to one Task. Compare a bounded LangGraphJS adapter with the simpler baseline. |
| Agent and team communication | Test direct and group conversations, configurable cross-team routing, and leader-oriented user interaction. Research protocol reuse. |
| Evidence and next-phase loop | Inspect artifacts, compare results with acceptance criteria, request rework, and plan the next eligible step. Use Hassan's product-development example as a configurable fixture. |

These are product implementation directions with bounded research questions.
Comparing libraries does not commit us to building every candidate. The
integrated delivery uses jointly agreed options and records deferred or
unsupported capabilities explicitly. Unrelated work can proceed while a
dependent extension or provider capability is being completed.

### Baseline and responsibility boundaries

Start with TypeScript/Node, the adopted Get Modular composition, context-owned
PostgreSQL, Temporal, and direct NATS JetStream integration. Include JetStream
in the first integrated product delivery.
[ADR-0114](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md)
owns backend adoption;
[ADR-0116](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md)
also selects full native Temporal with PostgreSQL for Fully Local workflows.

| Concern | Owner or role |
| --- | --- |
| Task identity, assignments, lifecycle, completion, and task lists | Work Coordination and its PostgreSQL state. Temporal visibility is not the product task database. |
| Durable waits, scheduling, retries, and execution progress | Feature-owned application processes through a Temporal adapter, rather than one global workflow owning every domain. |
| Committed facts and asynchronous integration | JetStream adapters with durable consumption, deduplication, and acknowledgement after the relevant application commit. |
| Runtime session and provider controls | Agent Runtime owns execution custody and technical lifecycle. Orchestrator's Runtime ACL translates consumer-owned intents and observations. |
| Messages, attention, context, and activation | Communication owns messages; Attention proposes relevance/disruption; Context owns semantic manifests; Run decides wake, resume, pause, and replacement. |
| Public API | UI/CLI/SDK to Protobuf/Connect to the owning application port. Fastify and the Connect adapter share one HTTP server. |

Connect belongs at that public API boundary. In-process collaboration stays
typed calls within a permitted role; JetStream does not become the SDK's task
API. Follow the accepted service-role map from first materialization. For
example, Control Host to Team Topology is a real separate-process gRPC/Dapr
boundary; it is not deferred until high load. Create no empty future services.
Use the [role map](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/deployment-profiles.md#service-role-map)
and its [first-materialization gate](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/implementation-readiness-gates.md#first-materialization-role-gate),
including required deployment mappings and integration lanes for the selected
role. A test-only in-process composition does not satisfy that production
placement. Public API details remain in
[SDK and transports](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/sdk-and-transports.md).

Use a deterministic fake runtime for failure fixtures and a selected real
runtime for a small end-to-end demonstration. A passing fake does not qualify
the real provider. Both adapters exercise the same owner/application behavior
and applicable port contract suite. Fakes provide external outcomes rather than
substituting another business state machine. Unsupported or unknown outcomes
stay explicit. Retained execution crosses the Runtime ACL into a minimal
AR-owned host/provider adapter; it preserves process custody, technical
continuation, and runtime receipts there. Direct OpenCode SDK characterization
can remain an isolated provider probe. It cannot turn an Orchestrator launcher
into a second runtime owner, and the retained path need not implement all of AR.

### Architecture required for the retained slice

The [DDD standard](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/modeling-standard.md),
[tactical patterns](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/tactical-modeling-patterns.md),
[feature profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/feature-module-standard.md),
and [dependency rules](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/dependency-rules.md)
are binding references. The following maps them to this small delivery; it does
not create a second standard.

| Boundary | Requirement from the first retained implementation |
| --- | --- |
| Domain ownership | Use the existing context map and language. Name the owner, aggregate or process, invariants, accepted commands, transaction boundary, and concurrency rule before coding. Do not introduce a parallel prototype Task/Run model. |
| Domain behavior | Aggregate roots protect legal transitions and invariants. Use entities, value objects, policies, and repositories when their domain role is established. Queries use separate read ports/projections. Technical adapters and Hosts do not need artificial aggregates. |
| Application and SOLID | Each use case coordinates one owned capability through the ports it needs. Provider calls, clocks, identifiers, persistence, and scheduling enter through explicit boundaries. Avoid one universal runtime/engine interface with unused methods. |
| Feature layout | Put actual files in the existing cataloged feature's domain, application, adapters, contracts, and composition surfaces. Curated exports and dependency checks enforce visibility. Feature, package, context, module entry, and service are distinct boundaries. |
| Durable state | Each context owns its PostgreSQL state, migrations, revisions, receipts, inbox/outbox, and transactions. Commit publication/dispatch intent with the owning state change; do not hold a transaction across model calls or durable waits. |
| Contract mapping | Domain events, application values, persistence rows, integration events, public API messages, and provider types stay separate. An adapter maps contracts; a shared DTO does not become every context's domain model. |
| Authority and lifecycle | Work commits completion; Run decides activation; AR controls technical execution; each Host owns its declared resources. Module registration and workflow nodes confer no execution or access rights. |
| Evolution | Pin definitions for active work. Evolve persisted state and boundary contracts deliberately, retaining operation identities and unresolved outcomes. Change a boundary through an explicit decision and migration, not a second indefinite implementation. |

For an aggregate candidate, the reviewed decision matrix also records emitted
domain events, external facts, growth bounds, and rejected smaller/larger
boundaries. For a long-running process, name durable state, timers, correlation,
retry/compensation, cancellation, and late-arrival behavior. Reuse the owning
dossier and tactical standard rather than inventing a parallel MVP template.

DRY means one authoritative implementation of each business rule within its
owner. Similar shapes across contexts can retain small mapping code. Do not
introduce generic base aggregates/repositories or a shared product Task package.
A concrete mechanism already expected to serve multiple products follows the
existing library-first policy with a real consumer; speculative package
extraction is not required.

Boilerplate can be generated from the accepted patterns. Ownership, aggregate
consistency, cancellation, and effect semantics still need scenario review.
The first slice should prove those decisions with executable behavior. It is
not enough to generate the intended folder tree. Architecture can evolve after
experiments; this plan reduces avoidable structural rework rather than promising
that no future refactoring will be necessary.

### Get Modular from the first retained composition

This is already selected architecture under
[ADR-0113](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0113-canonical-module-and-composition-adoption.md)
and [ADR-0117](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0117-reconcile-mandatory-module-composition.md),
not a new optional framework choice. Follow the
[composition profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/composition-and-dependency-injection.md):
the exact Core/Assembly **0.5.0** pair and its pinned
[Consumer Module Standard](https://github.com/agent-teams-ai/get-modular/blob/a3a079baca2c6af48c9d45bc08992825be1c2bbd/docs/architecture/common-assembly.md#consumer-module-standard).
Newer upstream source or package versions do not silently replace that baseline.

One selected Host process assembles its meaningful capabilities once through
typed declarations, entries, and static groups. Business factories receive
narrow dependencies; Get Modular imports and descriptors remain in composition
and tests. Private helpers, parsers, and fixed library calls remain ordinary
typed code. No container per Agent/Task, service locator, parallel handwritten
production graph, or additional DI abstraction is needed.

Use a **bounded module-foundation step before business expansion**. Inventory
the real seams, migrate the existing Sandbox Manifest composition, and choose a
small explicit envelope of feature depth, entries/groups, profiles, and
compile/runtime budgets. Qualify compatible artifacts on the supported compiler
using the required conformance kit and source checks. Cover an actual nested
feature, two meaningful profiles, direct-parent visibility/republication,
independent wiring expectations, invalid wiring before factories, failed
construction, cancellation, and cleanup. Connect those checks to the existing
runner. This foundation is currently pending; a flat layout check or dependency
installation does not pass it.
Module wiring checks do not replace source-boundary or domain-invariant checks.

The [foundation gate](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/implementation-readiness-gates.md#module-foundation-before-business-expansion)
allows the smaller qualified envelope to proceed without waiting for every
100/500/1,000-entry research target. Wider composition needs additional evidence.
Select compatible Resources and conformance artifacts explicitly; equal package
family names or latest versions do not establish compatibility. Modules that
acquire resources use the qualified Resources capability; pure or borrow-only
modules need no resource scope. Preserve Host-owned readiness, admission, drain,
and cleanup responsibility. If a required behavior cannot be qualified on the
adopted artifacts, review a bounded upgrade instead of introducing a fallback
assembly or bypassing the gate.

Static assembly does not require hot replacement, a dynamic lifecycle kernel,
plugin discovery, or Get Modular Observation. Observation is not a replacement
for JetStream or durable inbox/outbox history. Existing source-enforcement and
first-materialization gates still apply; nested constructs activate only with
their inventory and semantic enforcement. The source currently contains a
pending foundation, not an already qualified module platform.

### Extension Foundation and the first real extension journey

[ADR-0095](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0095-extension-safety-and-ownership-invariants.md),
[ADR-0096](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0096-shared-extension-foundation-and-oci-distribution.md),
and the [extension profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/extension-points.md)
already constrain this implementation. Preserve these boundaries:

| Owner | Responsibility |
| --- | --- |
| Get Modular | Typed declarations, dependency bindings, graph validation and construction of already selected factories. |
| Extension Foundation | Product-neutral artifact identity, trust, distribution, compatibility and extension protocol/conformance primitives. OCI, ORAS, Cosign and immutable digests remain the accepted direction. |
| Product feature and Host | Narrow semantic ports, authorization, loading, generations, readiness, routing, drain, resource custody and recovery under their declared owners. |

The neutral cores do not import each other. Product-owned adapters may consume
both, as [Extension Foundation ADR-0015](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/decisions/0015-authorize-get-modular-semantic-extraction.md)
requires. An adapter is not automatically an independently distributed plugin.
Intentionally replaceable built-ins use the same narrow semantic contract as
external contributions, while their trusted loading and isolation can differ.
This preserves the [extension model](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/architecture/extension-model.md)
without exposing every helper or aggregate as a plugin.

Extension code never bypasses the owning application, writes another context's
tables, or runs inside its database transaction. Manifest permissions remain
requests; a signature, module registration or successful construction grants
no product authority. Active artifact identity and generation, cancellation,
unknown effects and cleanup retain explicit owners.

The reviewed [Extension Foundation main](https://github.com/agent-teams-ai/extension-foundation/blob/29ae5b0269d9d83f071344e3e18761ded04ff53d/README.md)
is architecture-only: no public runtime SPI or production package is materialized.
Its research is useful evidence, not a finished plugin platform. Therefore
replace an indefinite wait for "plugins finished" with one selected journey,
its exact consumer contract, failure cases, artifacts and measurable exit.
The accepted AR interactive Claude/session path is a concrete consumer to
investigate alongside its owner; this does not reopen that provider choice or
turn an ordinary provider library into an installed OCI plugin automatically.

Production extension adoption still requires the proofs in
[OD-041](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-041-shared-extension-foundation-and-artifact-distribution.md):
GHCR and Harbor round trips, authentication, provenance/revocation,
compatibility, product-facing operations and two independent product
integrations. A public SPI additionally requires independent implementations
and conformance. One trusted fixture cannot satisfy these different claims.
Any narrower production admission needs the owning explicit decision.
[OD-043](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md)
still owns unresolved lifecycle/catalog/hot-update semantics;
[OD-042](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-042-frontend-extension-contribution-model.md)
owns frontend contributions. This plan does not resolve either implicitly.

The product owner can complete the necessary module/extension mechanisms while
Hassan researches workflows, reviews domain contracts, or prepares scoped
fixtures. Qualify the shared mechanism with its real consumer in the same
delivery. Dependent production activation waits for its actual prerequisites;
independent admitted work need not wait for all possible plugins and Hosts.

### Workflow research: more than drawing boxes

A database persists data; it does not define what a process means. Compare
these layers separately:

| Layer | What must be represented or decided |
| --- | --- |
| Authoring | Canvas, forms, validation feedback, variables, undo, and usable editing. |
| Definition | Steps, branches, waits, bounded loops, inputs, roles, routing permissions, and immutable revisions. |
| Execution | Active step, accepted events, timers, retries, cancellation, and recovery. |
| Product state | Current Tasks, assignments, messages, context, artifacts, and authority. |
| Persistence | How each owner stores its definitions, state, and history. |

Before implementing an interpreter, map the authoring representation to owned
operations: Work lifecycle belongs to Work Coordination, Run plan/activation to
Run Orchestration, and provider execution to AR. An editor node or graph step
can invoke an owned command or return evidence; it cannot become an independent
authority over those states.

[React Flow](https://reactflow.dev/learn/advanced-use/computing-flows) supplies
interactive nodes and edges, node data, connection utilities, and hooks for
data propagation. It is more than a picture, but does not supply our durable
execution semantics.
[FlowGram](https://github.com/bytedance/flowgram.ai/blob/main/README.md) offers
a broader toolkit: canvas, forms, validation, variable scopes and type
inference, reusable node materials, and runtime-related facilities. Evaluate
its framework and desktop product separately; neither establishes that its
executor meets our Temporal recovery requirements.

Compare both on review/rework within one team and delegation with parallel
work and review across two teams. Change contact/delegation topology between
the fixtures, not only role names. Check headless definition access, versioning,
type/variable validation, custom nodes, accessibility, licensing, maintenance,
and custom code. Stars are a secondary signal. Inspect
[Langflow](https://github.com/langflow-ai/langflow) and
[Node-RED](https://github.com/node-red/node-red) as integrated editor/executor
references; adopting their execution model needs a separate justification.

Deliver a recommendation and a jointly reviewed small demo plan. We may use an
editor separately from execution or adopt more of a framework. A production
visual builder is not required for this research phase.

[Open Workflow Specification](https://github.com/open-workflow-specification/specification/blob/main/dsl-reference.md)
provides a declarative vocabulary for calls, conditions, loops, events, waits,
and errors. It could reduce custom format design and support validation and
interchange. It supplies neither our database nor an automatic Temporal
implementation. Compare a supported subset with a small project-owned schema;
record unsupported features and mappings. Do not promise lossless portability.
This specification is distinct from the `openworkflow` engine studied in OD-035.

**Temporal remains the durable engine baseline.** XState is only an optional
helper for pure transition logic if it reduces code or improves validation.
It is not a replacement for Temporal selected by this plan. Deterministic
orchestration means recorded inputs and rules govern permitted transitions;
it does not mean identical LLM answers. Prompts describe responsibilities but
do not enforce assignment or completion rules.

### Current Agent Runtime reuse and later evolution

Evaluate the existing interactive session path as the first retained Runtime
integration. [AR ADR-0091](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/decisions/0091-interactive-agent-session-synthetic-vertical-slice.md)
already admits a distinct session owner, durable input/handoff semantics and a
runtime-owned provider SPI. Current source includes the session owner,
PostgreSQL store and [Host composition](https://github.com/agent-teams-ai/agent-runtime/blob/main/packages/apps/embedded-runtime/src/features/interactive-session-runtime/README.md).
The [implementation record](https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/architecture/interactive-agent-session/implementation.json)
still marks Host adoption pending and excludes real-provider and deployment
qualification. Existing implementation and completed qualification are different.

Keep the retained path: consumer-owned Orchestrator ports, a stateless Runtime
ACL, the selected AR-owned Host/session owner, and its provider implementation.
The ACL translates contracts and retains only permitted connection state; it
does not acquire durable session, dispatch or recovery ownership. Pin the exact
Runtime/provider/platform/profile and verify packaging before adoption:
the current Embedded Runtime package is private at version 0.0.0.

The actual Claude SDK donor is the
[interactive provider experiment](https://github.com/agent-teams-ai/agent-runtime/blob/main/experiments/interactive-provider-contract/README.md),
not an arbitrary legacy provider package. Its six Claude source files are
existing TEST-only inputs. Follow ADR-0091's one-time move/adaptation into the
ordinary external provider library: canonical factory/open configuration,
capability confirmation, handoff semantics, checkpoint ownership and failed-open
cleanup. No production root imports the experimental subtree or preserves a
second editable algorithm. The erased
[interactive-contracts entrypoint](https://github.com/agent-teams-ai/agent-runtime/blob/main/packages/contexts/agent-execution/src/interactive-contracts.ts)
owns the dependency surface; prove an isolated packed consumer and joined
Runtime/provider behavior rather than assuming similar interfaces interoperate.

Current ordinary Codex execution has a separate macOS arm64 cooperative profile;
that evidence does not qualify Linux/Windows or the interactive path. The frozen
contained-turn path must not be widened to fit this scenario. Existing OpenCode
research also does not supply a qualified production adapter. Select a concrete
provider and deployment profile, and demonstrate its real authentication,
control, recovery and cleanup before advertising availability.

Keep product progress independent of native provider checkpoints. In the
reviewed [interactive owner](https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/interactive-agent-session/application/use-cases/interactive-session-owner.ts),
checkpoint requires a ready session without active input or pending control.
Restore requires a closed compatible session with a checkpoint and advances
generation; it is not an arbitrary mid-tool snapshot or automatic crash replay.
Provider checkpoints cannot transfer another agent's Task ownership. Orchestrator
preserves progress, artifacts, feedback and unresolved effects; AR resumes a
technical session only where its exact capability is qualified.

The v3/greenfield plans are already on main through
[AR PR #243](https://github.com/agent-teams-ai/agent-runtime/pull/243), which
superseded the unmerged PR #235. Follow the current
[architecture program](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-architecture-program-plan.md)
instead of starting a competing rewrite. A later Runtime implementation can
replace this adapter after the same behavioral contracts pass and its state
cutover is proved. Equal TypeScript method names are insufficient. Preserve
operation identities, runtime references, nonempty durable state and cleanup
obligations; never replay uncertain work through a second backend. Any temporary
compatibility path needs a named owner and removal step. No automatic full
Orchestrator rewrite follows from a Runtime version change.

### OpenCode as a separate harness research candidate

OpenCode remains a bounded alternative to investigate behind AR. It does not
replace the already selected interactive Claude contract by this proposal.
The reviewed OpenCode 2.2.6 routes differ:

- **Claude Agent** launches installed Claude Code through the official Claude
  Agent SDK. OpenCode owns tools, permissions, subagents, compaction, and
  canonical history; this is not the unchanged native Claude Code harness.
- **OpenAI/ChatGPT** routes call model endpoints. They do not launch the Codex
  SDK, CLI, or App Server. Access to associated models or a ChatGPT login does
  not demonstrate native Codex runtime behavior.

Sources: pinned
[Claude Agent documentation](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/services/site/src/docs/content/claude-agent.mdx),
[Claude SDK integration](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/claude-agent/claude/session.ts),
[ChatGPT provider](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/chatgpt.ts),
and [OpenAI provider](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/provider/openai.ts).

Choose one AR-owned hosting form after a compatibility check: client/server or
embedded SDK. Isolated provider probes can compare those forms without becoming
the retained execution path. The [embedded SDK](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/sdk/README.md)
needs an explicit persistent database for restart tests. Qualify selected
authentication routes in the intended deployment profile; local subscription
support does not qualify a shared hosted service. See
[Anthropic's plan guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
and [OpenAI's OSS guidance](https://developers.openai.com/siwc/token-sharing-open-source).

Claude Agent needs a logged-in Claude binary on the execution host (at least
2.1.248 for this reviewed version). The provider excludes OpenCode's native
remote-workspace mode and hosts without process spawning. A remotely accessed
server running a local workspace is a separate hosting case to test.

Observe durable queued/steered input, cancellation acceptance versus settled
execution, restart, history reconciliation after disconnect, and bounded tools.
OpenCode's [restart code](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/session/execution/restart.ts)
explicitly has at-least-once recovery and assumes the previous owner is dead.
Its [normal subscriptions](https://opencode.ai/docs/build/client/) are live-only;
the experimental durable log needs separate qualification.

The owning application preserves business operation identities and reconciles
uncertain effects. Distinguish native provider resume from reconstruction using
saved semantic context: record Orchestrator recovery, OpenCode session recovery,
and native Claude continuation or context rebuild as separate observations.
A rebuild must not be reported as native resume. If native Codex behavior is
necessary, compare a native provider adapter behind AR without changing the
consuming application's contract. Existing
[AR OpenCode ACP evidence](https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/spikes/opencode-acp-1-18-25-contract-validation.md)
targets older versions and does not qualify this v2 route. This proposal does
not migrate existing desktop integrations.

### Feedback, checkpoints, and task continuity

Treat incoming information as durable input with source, target, identity,
priority, revision, and application status. Proposed delivery classes are
routine input at the next safe point, an important update before further
relevant actions, and urgent interruption. Map these to actual runtime
capabilities in the experiment. Delivery acknowledgement is not proof that the
model understood or acted on an update. Feedback and test results are inputs or
evidence; they do not grant permission. Urgency informs authorized Run policy,
and neither an agent's approval nor a priority label creates authority.

Before a planned urgent switch, preserve progress and settle or explicitly
classify in-flight operations. A crash may prevent a fresh checkpoint: recovery
also needs the last durable state and operation journal. Team stop prevents
new dispatch and requests cooperative interruption at a supported boundary.
Classify active work as settled, still stopping, or unknown; a stop request is
not proof of a stopped process. Preserve stopped intent across controller
restart until explicit Resume. Terminal cancellation remains distinct.
Resume re-checks requirements, permissions, feedback, and workspace state.

A transferable Task progress record should reference:

- Task and definition revisions, current step/attempt, completed work, and
  next intended action;
- context sources, pending inputs, relevant message cursors, and omissions;
- workspace/base revision, recoverable content, artifacts, and test evidence;
- accepted external operations, receipts, and unresolved outcomes;
- target assignments and authority required for the next activation.

The record references separately owned state, not a new universal checkpoint
aggregate. Old checkpoints cannot overwrite newer Task requirements. Native
provider hidden state is not promised to transfer between providers.

Research whether **LangGraphJS associated with a Task** improves step history,
handoff, and continuation enough to justify another checkpoint/versioning
surface. Compare Temporal with an owned application process against Temporal
with a bounded graph adapter on the same fixture. Decide whether graph state
is execution-local progress or product coordination; identify one owner for
each transition, retry, and external effect. Current
[extension points](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/extension-points.md)
describe optional agent-local graphs. A graph shared across Task executors is
a research proposal, not an existing accepted contract.

An adapter experiment cannot transfer Work, Run, or AR authority to LangGraph.
Any proposed ownership change requires its own architecture decision. The
initial comparison preserves current owners and compares execution mechanics.

For the graph comparison, record the exact JS/checkpointer versions and crash
between a completed node or external effect and persisted checkpoint. A
cooperative pause alone is insufficient recovery evidence.

[OD-048](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-048-mixed-human-and-ai-team-participation.md)
accepts the product direction of multiple equal human/agent executors on one
Task. Test handoff and concurrent contributions. A minimal fixture can use
separate writer workspaces and an explicit integration step. Git worktrees
alone are not process isolation. Exact assignment, handoff, conflict, and
completion contracts still require agreement.

### Communication standards and groups

| Candidate | Useful boundary | What remains ours |
| --- | --- | --- |
| [A2A](https://a2a-protocol.org/latest/specification/) | External agent discovery, messages, tasks, artifacts, and status exchange. | Product groups, authoritative history, attention, and permission to act. |
| [AGNTCY SLIM](https://slim.agntcy.org/latest/slim/architecture/sessions/group/) | Direct and many-to-many group transport, membership mechanics, optional encryption, and configurable acknowledgement/retry. | Membership policy, durable offline mailbox, complete history, and Task ownership. |
| [Agent Client Protocol](https://agentclientprotocol.com/protocol/v1/session-setup) | Client-to-coding-agent runtime integration, including optional session load. | Peer group coordination and portability of provider state. |
| [MCP](https://modelcontextprotocol.io/specification/2026-07-28), with its opt-in [Tasks extension](https://tasks.extensions.modelcontextprotocol.io/specification/2026-07-28/tasks) where supported | Tools/resources and negotiated asynchronous task operations. | Product Task ownership, group conversations, and injection into a busy model turn. |

A2A does not require complete message history or universal message idempotency.
SLIM's optional session persistence is not an application mailbox. Test through
our owned acceptance and reconciliation boundaries. The older BeeAI Agent
Communication Protocol is a different ACP and moved into A2A; do not start a
second integration with that archived protocol.

An optional A2A probe uses one external endpoint: delegation, input-required
feedback, duplicate send, disconnect/query, cancellation, and late result.
Defer adoption if the first application needs no external interoperability.

The SLIM spike compares three participants, DM and group delivery, removal,
offline recovery, and restart with a JetStream-based baseline. Its technical
moderator can be infrastructure, without forcing a leader-agent role. Adopt
SLIM only if it adds useful interoperability or transport behavior. The
experimental A2A-over-SLIM binding is not mandatory.

Our product defines membership, cross-team contact permissions, who wakes, and
when to contact a human. A leader-oriented default can minimize interruptions;
configuration can choose one, several, or no designated contact agents. Agree
history visibility for joined/removed members and whether recipients are fixed
at acceptance or resolved at delivery. Test queued input across a membership
change. Group delivery must not automatically launch every recipient's LLM.

## Decision status and qualification

### Collaboration and implementation sequence

1. **Choose a workstream.** Hassan selects what interests him; agree its
   question, scope, dependencies, and smallest useful result together.
2. **Review before each implementation experiment or increment.** The
   contributor writes a short approach: ownership, ports, state, pinned
   dependencies, failure cases, alternatives, and expected evidence. The
   product owner reviews and discusses it before implementation begins.
   Classify the deliverable as a candidate probe or a retained slice. For a
   retained slice, include its DDD decision matrix, existing admission or
   proposed extension, package/materialization eligibility, and required role
   placement. Changed ownership or failure semantics require a revised approach.
3. **Qualify the bounded foundation before expansion.** Start from the current
   admitted composition seams, exact package artifacts, and a small actual
   consumer. Name the selected extension journey separately; a ready module
   graph does not qualify artifact distribution or product activation. Candidate
   probes and independent admitted work may proceed in parallel. This step does
   not admit new business behavior or complete the whole plugin ecosystem.
4. **Build the agreed experiment or admitted slice.** Keep it bounded and
   replaceable, retaining the canonical domain/application implementation where
   applicable. AI-assisted implementation is welcome; record actual observations.
5. **Review evidence.** Decide adopt, revise, or defer. Update the owning open
   decision or ADR normally when the result changes architectural direction.
6. **Integrate selected mechanisms through admitted increments.** Use
   PostgreSQL, JetStream, Temporal, and one AR-owned runtime path with their
   accepted process boundaries. Extend real features rather than copying a
   standalone prototype engine into product packages. Each added behavior
   retains its required owner, contract, and failure evidence.

Foundation work and corrections to already admitted behavior can start under
the existing readiness rules. Broad business admission remains in review;
ADR-0103 covers a test-only server slice with one Agent/profile, one Team/Run,
Task metadata, planned placement, direct messages and minimum context/observation.
It does not qualify real providers or admit assignments, dependency scheduling,
completion/review, groups or cross-team behavior. Close the precise next
admission while working on the foundation, instead of waiting for every future
architecture question or silently widening that existing scope.

The stopping point for pre-implementation design is a reviewed owner and
contract for the next capability, its invariants and failure behavior, and the
applicable admission evidence. New observations can change the next increment
or justify an owned architectural successor. Do not treat the broad target as
a commitment to implement every planned facility before obtaining feedback.

This supports asynchronous contributions without a full-time commitment. The
plan allocates technical work only; ownership and commercial terms remain a
separate agreement. No token or revenue promise is implied.

### Acceptance evidence across admitted product increments

This matrix describes the integrated target. Each increment takes only its
applicable rows and existing mandatory gates; the complete table is not a claim
that all capabilities are currently admitted or implemented.

| Case | Observable result required |
| --- | --- |
| Human and agent task management | Both use authorized operations; conflicting revisions are detected. Eligible work continues without manual prompts. Blocked work remains visibly blocked. |
| Configurable process | After the authoring decision, two workflow definitions with different roles, routing, and review policies run without engine code changes. Invalid transitions and unauthorized delegation are rejected. |
| Evidence and rework | An incomplete result receives findings, is corrected, and meets criteria against the exact candidate/artifact revision. Later contributions invalidate stale evidence. Budget and rework limits apply. |
| Routine and urgent feedback | Routine input survives to its safe point. A qualified urgent mode preserves progress and applies updated context before further relevant actions. Unsupported, deferred, or unknown outcomes remain explicit. |
| Stop and crash recovery | Stopped intent survives controller restart until Resume; cancellation is distinct. Classify active work and record Orchestrator, harness, and provider recovery separately. Query uncertain effects before repeating them. |
| Handoff and shared work | B receives current context, including feedback arriving during handoff. Obsolete executor writes are rejected. Two current authorized executors can also contribute without losing work. |
| Conversations and cross-team policy | DM and group history survives interruption; only eligible recipients wake. Removed participants cannot receive new restricted messages. Delegation follows configured rules. |
| Redelivery and late results | Duplicate JetStream delivery, missed wake, and late result after cancellation do not create duplicate product transitions or complete the wrong attempt. |
| Domain and source boundaries | The same domain/application implementation serves API, workflow, event, and applicable fake/live fixtures. Negative checks reject framework/provider leakage, cross-context repository access, and a competing production assembly. Invalid domain transitions and stale revisions are rejected. |
| Module composition | The selected small profile passes independent binding and lifecycle checks, including its required nested feature. Fake/live implementations pass the same applicable port contract suite. Additional capabilities remain inside the qualified envelope or qualify its extension first. |
| Extension adoption | The selected contribution exercises its real consumer contract, preserves product authority and reports failed activation/cleanup honestly. Any production adoption of Extension Foundation meets its applicable OD-041 proof or an explicit narrower owning admission. Installed external extensions also exercise their artifact, trust and lifecycle paths; internal composition alone does not qualify them. |
| Durable evolution | Work started under definition revision A survives a revision-B update and restart using pinned A semantics or a reviewed migration. IDs, pending messages, receipts, artifact references, and unknown outcomes are preserved. No general migration framework is required. |
| Runtime replacement | Replacing the selected runtime adapter preserves applicable behavior and product progress. Pending operations and cleanup debt receive explicit migration/disposition; unknown effects are not retried through a new backend. Native checkpoint incompatibility is explicit. |
| Real role placement | Each implemented capability meets its accepted process placement and first-materialization tests. A same-process fixture does not stand in for a required remote boundary. |

Capture definition versions, transitions, operation IDs, message cursors,
artifact digests, restart points, and actual results. Distinguish transport
receipt, application acceptance, context application, and Task completion.
An engine cannot make an arbitrary external operation exactly once; unknown
outcomes remain visible until reconciled.

These checks demonstrate the selected extension and recovery seams. They do not
prove that every future feature will fit without revisiting the domain model.

Review findings are advisory inputs or typed evidence bound to an immutable
candidate/artifact revision. Work Coordination validates the applicable
completion plan and commits completion. A reviewer, graph, or successful
runtime exit cannot independently complete the product Task.

### Preliminary comparison effort

Engineering judgments below cover **one bounded comparison fixture**, not
measured reliability, product estimates, or delivery commitments. Reliability
means expected robustness for that role; confidence means evidence strength;
complexity includes implementation and operation. Scores are out of 10.
Hand-maintained line ranges exclude vendor/generated code, complete IAM,
deployment packaging, and scale qualification. Revise them after the first
experiment; rows are not additive project totals.

| Candidate and scope | Reliability | Confidence | Complexity | Integration / tests / configuration lines |
| --- | --- | --- | --- | --- |
| Adopted Get Modular, bounded initial consumer and source/conformance integration | 8 | 5 | 7 | 600–1,400 / 900–2,000 / 100–300 |
| Current AR interactive boundary: one provider adaptation and isolated contract fixture | 7 | 5 | 6 | 600–1,600 / 800–1,800 / 80–200 |
| OpenCode input/recovery research adapter | 6 | 5 | 5 | 400–900 / 500–1,000 / 50–150 |
| Direct native research adapters for the same fixture | 7 | 6 | 7 | 800–1,800 / 800–1,600 / 50–200 |
| Temporal with owned progress records | 8 | 7 | 5 | 400–900 / 500–1,000 / 50–150 |
| Temporal plus bounded LangGraphJS | 7 | 4 | 7 | 600–1,200 / 700–1,400 / 50–150 |
| Optional XState helper, incremental | 7 | 5 | 3 | 100–250 / 150–350 / 0–50 |
| React Flow editor demo | 7 | 6 | 6 | 500–1,000 / 200–450 / 50–100 |
| FlowGram editor demo | 7 | 4 | 5 | 300–700 / 200–450 / 50–150 |
| Open Workflow subset mapping | 6 | 4 | 6 | 250–650 / 300–700 / 50–150 |
| Small project-owned definition schema | 7 | 5 | 4 | 200–500 / 250–600 / 50–150 |
| JetStream group delivery fixture | 8 | 6 | 5 | 300–700 / 400–900 / 50–150 |
| SLIM group adapter, incremental | 6 | 4 | 6 | 200–500 / 400–800 / 50–150 |

The current-AR row is incremental adaptation/research work, excluding existing
donor code, production Host adoption, the full v3 program, native custody,
external extension distribution and live/deployment qualification. It is not
an estimate for a ready Runtime or the complete product. Missing prerequisites
can change a range by more than a factor of two. Estimate the chosen product
increment again after its contract and dependency inventory are agreed.

## Evidence and sources

### Canonical architecture reading map

These sources contain the full design and unresolved questions. This proposal
is a delivery proposal with research questions, not a replacement architecture
authority.

| Topic | Absolute GitHub reference |
| --- | --- |
| Overall control plane | [Orchestrator architecture](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/overview.md) |
| DDD and domain evolution | [Full DDD standard](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/modeling-standard.md), [Tactical patterns](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/tactical-modeling-patterns.md), [Context map](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/context-map.md) |
| Feature boundaries and assembly | [Feature profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/feature-module-standard.md), [Composition profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/composition-and-dependency-injection.md), [ADR-0113](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0113-canonical-module-and-composition-adoption.md), [ADR-0117](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0117-reconcile-mandatory-module-composition.md) |
| Source, placement, and implementation admission | [Dependency rules](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/dependency-rules.md), [Package catalog](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/architecture/package-catalog.yaml), [Deployment profiles](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/deployment-profiles.md), [Readiness gates](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/implementation-readiness-gates.md) |
| Shared stack and practices | [Backend stack](https://github.com/agent-teams-ai/.github/blob/main/docs/backend-stack.md), [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md) |
| Organization governance and pinned standards | [Governance](https://github.com/agent-teams-ai/.github/blob/main/GOVERNANCE.md), [Feature Module Standard registry](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/feature-module-standard/README.md), [Development tools catalog](https://github.com/agent-teams-ai/.github/blob/main/docs/development-tools.md) |
| Extension ownership and readiness | [ADR-0095](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0095-extension-safety-and-ownership-invariants.md), [ADR-0096](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0096-shared-extension-foundation-and-oci-distribution.md), [Extension profile](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/extension-points.md), [OD-041 adoption evidence](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-041-shared-extension-foundation-and-artifact-distribution.md), [OD-043 lifecycle](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md), [OD-042 frontend](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-042-frontend-extension-contribution-model.md) |
| Task ownership and collaboration | [Work Coordination](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/work-coordination/README.md), [OD-048 participation](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-048-mixed-human-and-ai-team-participation.md) |
| Process ownership and Temporal | [Run Orchestration](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/run-orchestration/README.md), [ADR-0027](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0027-temporal-as-run-orchestration-adapter.md), [OD-005 boundaries](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-005-temporal-workflow-boundary.md) |
| Configurable lifecycle | [OD-027](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-027-configurable-work-lifecycle.md) |
| Communication and attention | [OD-026](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-026-communication-notification-and-attention.md), [Agent Attention](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/agent-attention/README.md) |
| Context, feedback, and resumption | [Agent Context](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/domain/contexts/agent-context/README.md), [OD-028 lifecycle](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-028-agent-context-lifecycle.md), [OD-033 convergence](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-033-ooda-convergence-and-context-activation.md) |
| Runtime boundary and failures | [Runtime boundary](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/runtime-boundary.md), [ADR-0079 authority](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0079-runtime-authority-binding-cutoff-and-disposition.md), [OD-004 ports](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-004-runtime-capability-ports.md), [OD-013 partial failure](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-013-partial-failure-and-compensation.md) |
| Completion and evidence | [ADR-0072](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0072-atomic-work-completion-evaluation.md) |
| Workspaces and continuation | [ADR-0062](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0062-workspace-materialization-and-runtime-isolation.md), [ADR-0069](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0069-opaque-runtime-execution-identity.md) |
| Runtime design and OpenCode | [AR reading order](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/README.md), [AR foundation](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/architecture-foundation.md), [AR OpenCode integration](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/opencode-integration.md) |
| Current Runtime and v3 evolution | [ADR-0091 interactive path](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/decisions/0091-interactive-agent-session-synthetic-vertical-slice.md), [Implementation record](https://github.com/agent-teams-ai/agent-runtime/blob/main/architecture/interactive-agent-session/implementation.json), [Architecture program](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-architecture-program-plan.md), [Greenfield foundation](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/agent-runtime-greenfield-foundation-plan.md) |
| Platform relationship | [Platform-Orchestrator boundary](https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md) |
| Reusable foundations | [Get Modular](https://github.com/agent-teams-ai/get-modular), [Extension Foundation](https://github.com/agent-teams-ai/extension-foundation), [Engineering Foundation](https://github.com/agent-teams-ai/engineering-foundation) |

### Existing evidence and upstream references

For module adoption, begin with the existing
[Sandbox Manifest composition seam](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/a34587b313e656eeb43d755b4a4f08c40dff2116/packages/contexts/agent-context/src/features/sandbox-manifest/composition/feature-module-factory.ts)
and the [current activation inventory](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/architecture/composition-and-dependency-injection.md#activation-and-existing-implementation).
The [dated Get Modular review](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/research/get-modular-adoption-and-scale-review-2026-10-21.md)
is supporting evidence; ADR-0113/0117 and the current profile own the adoption.
The source review of a newer upstream tree does not qualify its published
archives or a mixed Core/Assembly/Resources/conformance set. Verify the actual
compatible artifacts before the foundation implementation.

Reuse scenarios and bounded mechanics from the retained
[Temporal research source](https://github.com/agent-teams-ai/agent-teams-orchestrator/tree/a34587b313e656eeb43d755b4a4f08c40dff2116/scripts/research/od035/temporal)
and its [evidence manifest](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/a34587b313e656eeb43d755b4a4f08c40dff2116/docs/research/evidence/od035-2026-10-23/manifest.json).
That small business fixture is not the production Work model. Older July
foundation harnesses were deleted; their retained counts are not rerunnable
source or new execution evidence.

Inspect the [interactive provider experiment](https://github.com/agent-teams-ai/agent-runtime/blob/main/experiments/interactive-provider-contract/README.md)
and [runtime evidence index](https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/architecture/evidence-traceability.md)
before duplicating runtime work. Preserve each experiment's version, platform,
fake/live boundary, and unresolved gates.

Additional primary references for the proposed comparisons:

- [Temporal TypeScript message passing](https://docs.temporal.io/develop/typescript/message-passing).
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence).
- [XState pure transition functions](https://stately.ai/docs/pure-transitions).
- [JetStream consumers](https://docs.nats.io/nats-concepts/jetstream/consumers).
- [SLIM session persistence](https://slim.agntcy.org/latest/slim/architecture/sessions/)
  and [experimental A2A binding](https://github.com/a2aproject/experimental-cpb-slimrpc).
- [Archived BeeAI ACP](https://github.com/i-am-bee/acp).

## Limitations and remaining questions

Before implementing the relevant workstream, agree:

1. What is the first retained slice and its current admission, and what exact
   small Get Modular envelope and compatible artifact set must be qualified?
2. Which two process definitions test flexibility, and which editor/definition
   format deserves a small demo?
3. Which exact current AR/provider/artifact/profile pair can support the first
   retained path, and what remains before joined/live qualification? Does a
   separate OpenCode comparison answer a concrete remaining question?
4. What is the smallest transferable progress record, and does LangGraph add
   useful state beyond Temporal and owned records?
5. Which operations are safe interruption points, how long can interruption
   wait, and how do we handle an unknown external result?
6. Which permissions, workspace consistency, and completion rules govern
   handoff and simultaneous contributors to one Task?
7. Does SLIM add enough value over the initial transport? Which external A2A
   capability is needed by the first application?
8. What is the first real extension journey? Does it need independent external
   installation now, or a built-in implementation of its owned contract?
   Which EF/Host admission and proof are required for that exact choice?

All implemented capabilities retain their applicable security, ownership,
deployment and evolution requirements. Managed multi-tenant availability,
deployment lifecycle, 10,000-agent performance, complete visual authoring and
commercial delivery need their own actual qualification. Later increments
extend this same product; deliberate refactoring remains possible when evidence
changes a contract. A second complete implementation is not the default plan.
