---
id: architecture.composition
type: architecture
status: accepted
owner: architecture/composition
summary: Mandatory Get Modular composition, scope, and lifecycle rules for independently assembled TypeScript capabilities.
related:
  - ADR-0117
  - ADR-0042
  - ADR-0030
  - ADR-0113
  - ADR-0114
  - architecture.dependency-rules
  - architecture.deployment-profiles
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
---

# Composition and Dependency Injection

## Purpose

Composition connects typed feature capabilities to concrete adapters without
exposing the construction mechanism to business code. Semantic ownership,
workspace packages, feature groups, composition entries, and deployed services
are distinct boundaries. Their sizes do not have to match.

## Get Modular adoption profile

The owner clarified on 26 November 2026 that the complete module and engineering
foundation must be designed and prepared before broad business expansion. The
[full foundation implementation plan](#full-foundation-implementation-plan)
replaces the earlier interpretation of a Core/Assembly-only starter. The current
accepted artifact table below remains truthful until the proposed
[ADR-0118 adoption transition](../decisions/0118-full-foundation-capability-adoption.md)
is qualified and recorded; full capability coverage is required now.

ADR-0113 selects the exact static Get Modular baseline. ADR-0117 reconciles the
broader mandatory scope and foundation requirement from the parallel owner
work without changing that baseline. The historical ADR-0110 pin is superseded;
Awilix and competing handwritten production assembly remain prohibited.
The following is the local Consumer Module Standard adoption profile; the
[feature profile](feature-module-standard.md) separately owns FMS v1.1.

| Profile field | Selected value |
|---|---|
| Standard repository | `agent-teams-ai/get-modular` |
| Standard path and anchor | `docs/architecture/common-assembly.md#consumer-module-standard` |
| Immutable commit | `a3a079baca2c6af48c9d45bc08992825be1c2bbd` |
| SHA-256 of complete document | `e5cb510c5ea83e54a6833cc40b6ad31fc5cf8c70d9838e4e0c6923edc6f70919` |
| Core and Assembly | `@get-modular/core@0.5.0`, `@get-modular/assembly@0.5.0`, exact pair |
| Accepting decision | `ADR-0113` for the exact baseline; `ADR-0117` for reconciled scope and foundation |
| Production scope | Applicable independently assembled TypeScript capabilities under `apps/**` and `packages/**`; each actual composition surface is inventoried before activation |
| Composition owner | One selected Host process role, with context-owned entries and curated context handles |
| Lifecycle owner | Each Host for its application resources; Local Supervisor or hosted platform for component availability |
| Legacy boundary | Historical Awilix ADR only; no parallel production container or direct assembly fallback |
| Exceptions | None declared |
| Current implementation status | Selected architecture; production materialization and first-scope conformance remain gated |

The immutable [upstream standard](https://github.com/agent-teams-ai/get-modular/blob/a3a079baca2c6af48c9d45bc08992825be1c2bbd/docs/architecture/common-assembly.md#consumer-module-standard)
owns the exact authoring rules. Every applicable production composition seam
uses Get Modular, including meaningful platform, integration, SDK, contract,
and testing-package assembly, not only Host/context package families. Pure
contracts, private helpers, parsers, mappers, and fixed library dependencies
remain ordinary typed code. Owner-local factories implement capabilities; they
are not an alternative production graph. Library composition exposes a narrow
API without leaking framework descriptors into consumer business code.

The complete successor foundation positively includes Resources, Observation,
development Conformance and a native Effect qualification profile, together with
the lifecycle candidate's owned integration decision. Their uses and exact
candidate artifacts are listed below; none is silently omitted because the MVP
is small. Existing production pins do not yet activate these candidates. Pure
and borrow-only modules do not acquire artificial scopes; state-free modules do
not acquire stores. A competing resource, composition or lifecycle framework is
not the fallback. Core and Assembly adoption alone does not activate
runtime plugin discovery or hot replacement.
The existing extension safety and artifact-admission contracts still apply.

## Runtime topology

```mermaid
flowchart TB
    Profile["Selected process role"] --> Root["Core and Assembly root"]
    Root --> Capabilities["Declared owned capabilities"]
    Root --> Inbound["Inbound adapters"]
    Root --> Outbound["Outbound port adapters"]
    Inbound --> Capabilities
    Capabilities --> Outbound
    Host["Host lifecycle"] --> Root
    Host --> Resources["Owned technical resources"]
    Resources -. "explicit borrowed capabilities" .-> Inbound
    Resources -. "explicit borrowed capabilities" .-> Outbound
```

Each declared Host process role has one production composition authority. It
selects bindings once, constructs its declared capabilities once, and retains
the closed root handles. The [service role map](deployment-profiles.md#service-role-map)
owns process placement under ADR-0114; this diagram describes construction
inside one role. Context-internal capabilities remain private. Other contexts
receive only a declared Published API through their consumer-owned adapters. No
context inspects another context's registrations, implementation instances, or
internal graph.

A separately running Host constructs only its own declared profile; it does not
reconstruct a remote owner's capabilities as an in-process fallback. Agent,
tenant, project, team, task, run, and session identities do not create extra graphs,
brokers, containers, database clusters, or processes.

## Physical placement

The pinned standard maps a feature's composition to flat files:

```text
apps/<host>/src/composition/
  <profile>.root.ts
  <owned-input>.contracts.ts
  <owned-input>.declaration.ts
  <owned-input>.module.ts

packages/contexts/<context>/src/
  composition/
    create-context-handle.ts
  features/<feature>/
    domain/
    application/use-cases/
    application/ports/
    adapters/
    composition/
      <feature>.contracts.ts
      <implementation>.declaration.ts
      <implementation>.module.ts
      <feature>.group.ts
    features/<child>/
      composition/
        <child>.group.ts
```

This is an ownership map, not a scaffold. Directories and composition contracts
appear only with real adopted constructs and their enforcement. The feature
profile currently rejects activation of new nested constructs until its scoped
checker supports them. A Host root may import only curated composition exports;
it never deep-imports a context's feature implementation.

Descriptors carry stable capability identities and revisions. Declarations use
`declareModule` and the selected contract descriptors. `implement` and `input`
produce entries, `group` gives a static navigable grouping, and the root lists
entries and groups in `prepare({ modules })`. Do not reproduce wire-generation
literals, compatibility tokens, or registry lookup in business code.

A parent group owns its own entries and the groups of its direct children. A
root lists top-level groups, Host-level groups, and its own entries. It cannot
assemble a private descendant through an alternate path. Group membership is
static; a deployment variant has its own explicit root and profile identity.
An entry must not be listed twice or depend on registration order.

A composition descriptor at `composition/<feature>.contracts.ts` is not an
application port or a public wire message. Get Modular capability revisions
change with the descriptor value type under its own compatibility rules;
Protobuf, event schema, and SDK evolution remain independent contracts.

## Construction contract

Get Modular imports and types stay in composition and tests. Feature factories
accept narrow dependency records and return narrow APIs. Application and domain
code use only their owned ports and models, never a descriptor, resolver, broker,
SDK DTO, or container abstraction. Port members use function-typed properties,
not method signatures that hide parameter variance.

Prepare and declaration evaluation are free of external effects. Graph errors
must fail before capability factories run. Ordinary factories build passive
components; external startup happens in explicit Host lifecycle steps. Async
construction, where required, retains an explicit owner for every acquired
resource and every returned product until custody is transferred or cleaned up.
No effect may escape a failed construction attempt.

Prohibited mechanisms include:

- filesystem scanning, reflection, decorators, or implicit registration order;
- mutable singleton registration or string lookup from business code;
- a generic `ContainerPort`, `ServiceLocator`, or arbitrary capability registry;
- a second Awilix or direct-factory production graph for the same capabilities;
- constructing the feature graph again inside a gRPC handler or service adapter;
- acquiring runtime execution authority through module registration;
- using `any`, broad casts, or a double assertion through `unknown` to hide a
  binding, capability, or lifetime mismatch.

Get Modular isolates construction; it is not wrapped in a second general-purpose
DI framework. The Clean Architecture boundary is the owned application port.

## Lifetimes and scopes

Constructed context capabilities normally live for the Host process lifetime.
An explicit operation scope is created when a command, query, event delivery, or
Temporal activity needs Unit of Work, authenticated facts, trace context, or
request-local idempotency handling. Its factory and cleanup remain private to
the owning context adapter and lifecycle.

A longer-lived capability cannot retain an operation-scoped dependency. The
operation scope is disposed in `finally` after commit, rollback, and post-commit
intent handling reach their defined boundary. Do not keep a SQL transaction open
for an RPC call, model response, user approval, or durable workflow wait.

Inbound adapters receive already-constructed capability handles from the Host.
A GraphQL request may own bounded loaders and authenticated request resources;
it does not construct another feature graph or hold one SQL transaction across
resolvers. Each command or query retains its owning operation scope. Request
caches cannot outlive their authenticated scope or be retained by singleton
capabilities. Framework contexts are mapped to the narrow application invocation
profile before calling the input port.

## Lifecycle

The Host owns bootstrap order, readiness, health aggregation, process signals,
and ordered shutdown. Contexts borrow only explicitly listed technical
capabilities and never dispose Host-owned resources. A module declaration is not
permission to own an operating-system process.

Startup follows the declared dependency order; shutdown is bounded, idempotent,
and in reverse dependency order. Stop admission and consumers, drain bounded
work, reconcile or preserve durable dispatch intent, close context-owned
resources, and then close shared resources. Do not infer this ordering from a
container or a broker's global exit hook.

The Local Supervisor separately owns the availability and activation of local
Host roles, Dapr sidecars, PostgreSQL, and NATS components. Host adapters own
protocol connections and behavior, not a competing process lifecycle. Hosted
component supervision belongs to the deployment platform. Dapr service readiness
and Host application readiness are explicit observations; neither transfers
business ownership or qualifies the other component automatically.

A graph or Host restart has no business meaning. Tasks, runs, operations, inboxes,
outboxes, and dispatchers recover from their owning durable contracts.

## Context handle

Context bootstrap returns a narrow opaque handle conceptually shaped as:

```ts
interface ContextHandle<TPublishedApi> {
  readonly api: TPublishedApi;
  readonly start: () => Promise<void>;
  readonly health: () => Promise<ContextHealth>;
  readonly stop: () => Promise<void>;
}
```

The composition-owned real type exposes no Core, Assembly, Dapr, gRPC, or database
implementation type. Internal factories, repositories, operation-scope creation,
and graph inspection remain private.

## Cross-context collaboration and service boundaries

A consuming context receives an adapter implementing its consumer-owned port.
That adapter calls the provider's Published API or versioned transport contract.
Integration events remain the preferred mechanism where synchronous
collaboration is not required. Synchronous dependencies form an acyclic graph;
cycles require corrected ownership, events, or an owning process manager.

Before materializing a declared service role, name its owning capability,
selected placement, contract and wire protocol, state and transaction owner,
durability, authorization, concurrency and recovery semantics, lifecycle owner,
and resource budgets. Record these in the owning feature/context and accepted
deployment profile. A new role beyond the accepted map requires a concrete
scaling or isolation reason and an accepted deployment decision; file size,
feature count, or an entity count does not create another service.

[ADR-0114](../decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md) selects
feature-owned Protobuf and standard gRPC through Dapr at real private RPC
boundaries. Apply the process separation from first production materialization.
Control Host reaches Team Topology S3 through its consumer-owned port and ACL in
a separate process through Dapr; an in-process router cannot satisfy that
boundary. Each process assembles its capabilities once, and adapters invoke the
resulting handles. Ordinary collaboration within a role remains typed and local.

The public Connect API, direct JetStream durable handlers, AR execution ownership,
and Host construction retain their existing contracts. Moleculer is not selected
as an additional private RPC layer. Dapr invocation does not adopt Dapr state,
pub/sub, actors, or workflows. Exact dependency and deployment qualification
remains separate from these architecture selections.

## Profiles, verification, and replacement

Local and server profiles assemble the same application capabilities with their
explicit adapter and deployment configuration. Business unit tests use direct
factories and fakes, not a production graph. An in-process test implementation
never becomes an undeclared production fallback.

The upstream authoring budgets are stricter within an adopted Get Modular
feature: 300 effective lines per non-test file, 60 per function, 4 parameters,
and 80 effective lines per module wiring file. Other existing repository budgets
remain in force. Do not enlarge a budget to accommodate generated wiring.

Current `architecture:feature-module-profile` and the quality topology check in
`foundation:check` bind adoption and the construct activation boundary. They do not prove
Get Modular graph or nested-source semantic conformance. Before the first
production scope materializes, pin a compatible `@get-modular/conformance`
development dependency and connect the standard's checks to the existing
Foundation execution gate with declared test identities: `checkModuleLayout`,
`checkNamespaces`, `isolate`, `smoke`, and an independent binding oracle checked
by `checkWiring`. A capability with two implementations, including its fake,
also requires the owner's `contractSuite` and `runContractSuite`.
Cover rejected duplicate entries, invalid bindings, forbidden imports, illegal
nested visibility, cleanup on construction failure, scope disposal, and ordered
shutdown, alongside a valid representative Host graph. Runner integration belongs
to that materialization change; replacing the standard's required checks needs
an explicit accepted exception rather than a weaker local substitute.

Use `pnpm check:changed` during iteration, `pnpm check:fast` for handoff, and the
complete `pnpm check` before a pull request. Passing document checks or installing
0.5.0 does not qualify a running Host or distributed deployment.

The [current compiler-closure blocker](repository-tooling.md#current-validation-limits)
prevents executing those old Foundation-based aggregates until their qualified
migration. Portable documentation checks remain available; they do not replace
the blocked required gates.

Replacing Core/Assembly changes composition and its conformance evidence. It
must not require changes to domain behavior, application ports, public contracts,
or persistence authority.

### Static foundation and extension evolution

The [module foundation gate](implementation-readiness-gates.md#module-foundation-before-business-expansion)
requires full capability design and the common foundation evidence below before
broad business expansion. Exact artifacts, real consumer composition, independent
binding oracles, nested source rules, lifetime and representative growth evidence
are part of that foundation. Dynamic installation and update work has concrete
owners and acceptance rows; a static pass is not full foundation completion.

A reusable capability keeps its contracts independent from one product's UI,
composition root, and persistence authority. Distinct Host integrations are
required to claim portability across those Hosts; two configurations of one
consumer graph establish only their declared profile coverage. This distinction
does not satisfy the separate two-product adoption floor in OD-041.

Plugin lifecycle and replacement mechanisms remain under
[OD-043](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md).
Frontend contribution semantics remain under
[OD-042](../open-decisions/OD-042-frontend-extension-contribution-model.md).
Neither research navigation nor a static composition qualification selects an
extension trust tier, publishes a public SPI, or qualifies hot replacement.

The [current cross-repository handoff](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md#full-foundation-integration-handoff)
tracks Extension Foundation A and Live Module Updates B with exact reviewed
revisions and per-stage evidence. Reuse their shared implementation; Orchestrator
supplies its product authority, state, effect receivers and Host integration.
Realistic independent fixtures can qualify the shared mechanisms before products
are ready, but product adoption still needs its own evidence.

## Full foundation implementation plan

This is the current preparation route for the owner's full-foundation request.
The [dated source review](../research/orchestrator-full-foundation-review-2026-11-26.md)
owns observations, comparisons and estimate uncertainty. ADR-0118 proposes the
coherent artifact transition; the existing readiness document owns gate status.
No runtime dependency or machine activation changes through this documentation.

### Complete capability coverage

Every row is required design coverage. The common rows are implemented and
qualified before broad business assembly; target-dependent rows have mandatory
exits before their use and before any release claiming them. Unsupported
operations refuse before evaluation/effect. An empty interface, a link to future
work or a success stub is not an implementation of a row.

| Capability | Concrete Orchestrator use and owner | Required mechanism and evidence |
| --- | --- | --- |
| Core validation and diagnostics | Composition owner validates role/deployment inventories and externally carried inert declarations | Object and UTF-8 byte compilation, invalid duplicate/size/revision/cycle cases, deterministic plan and bounded structured diagnostics; zero factories after rejection |
| Typed authoring and complete maps | Feature owners publish owned descriptors and curated composition exports | Full descriptor unions and separate imported `CapabilitiesOf` interface bases; used and unused ID conflicts plus union/map parity reject; no global service bag |
| Entries, groups and profiles | Direct parents assemble child groups; each Host selects its own local graph | Explicit required/optional/many choices, ordered hooks, completed static profiles and independent compiled-profile conformance; wrong provider/order fails an independent wiring oracle |
| Repeated instance templates | Host-owned session/operation/worker lifetimes when independent construction is useful | One immutable prepared template, declared borrowed inputs and isolated concurrent runs; reserve ownership before await; plan digest plus factory-set identity for any cache |
| Resource ownership | Resource-owning adapters and Host lifecycle | Resources setup/use/scoped, nested close, cancellation, escalation, abandonment, retry and retained debt; borrowed resources survive, late acquisition remains owned, original close is retained |
| Current-state observation | Owning projection publishes health, execution status or provider availability to local consumers | Single writer, frozen snapshots, read-only facets, watch/load, error reporting, subscription ownership and load settlement; authorization-filtered projections prepared before disclosure |
| Typed commands and hooks | Each consuming feature owns its input port or ordered policy contribution | GM slots supply capabilities; owner defines invocation, order, result, deadlines, cancellation, concurrency, failure and compensation; optional hooks never own mandatory authorization |
| Durable occurrences and processes | Context-owned Work, Run, audit and integration event handlers | Common proof uses owned port contracts and realistic outbox/inbox, JetStream and workflow fixtures; actual business transitions stay in admitted feature increments; duplicates, replay, gaps and ambiguous effects remain separate from Observation |
| Module and architecture conformance | Architecture/tooling plus contract owners | Conformance isolation/smoke/contract suites/namespaces/wiring/layout and handle diagnostics; actual shared source facts and FMS checks, not a second parser |
| Native Effect | A representative resource-owning asynchronous execution/integration profile | Native GM Effect construction with exact errors/requirements, interruption, provider sharing and borrowed inputs; private Layer details stay inside modules; no parallel inter-module resolver |
| Executable generation lifecycle | Host adapter and LMU, with the actual executor owning physical execution | Stable facade, operation affinity, admission, current receiver fence, original-attempt outcome and retained-work/cleanup custody; private lifecycle candidate only through its reviewed owner contract |
| Extension trust and typed contribution | Extension Foundation plus owning product contract | Verified immutable artifact/closure, owner-defined namespaced contribution revisions, required/optional outcomes and rejecting evidence before evaluation |
| Installation, update and state | Product installation/publication/state owners plus LMU algorithm | Durable enablement/head/attempt records, current-grant checks, CAS/unknown reconciliation, schema/retention policy, exact retirement and safe rollback |
| Browser, Desktop and isolated execution | Frontend, Local Host/Runtime and protected product receivers | Actual environment, privilege, crash, reconnect, old-client asset and physical containment evidence; presentation stays outside domain/application |
| Engineering and agent tools | Repository tooling, shared Engineering Foundation/FMS/Stack/Docs | Full source census, strict compiler/lint, quality/format, contract/release checks, guarded authoring/scaffolding, required-runner and provenance routes from the tooling plan |

Get Modular groups are labels, not tenant authorization trees or runtime
namespaces. Product organization/department/team hierarchies remain domain data;
thousands of agents reuse a finite module graph and independent execution state.
Features, source files, groups, instances, packages and OS processes are separate
inventories. A module is not automatically a package, service or plugin.

### Common foundation task cards

Cards below name proposed implementation work, not executed evidence. New source
uses ordinary strictly checked `.ts`. No production path is created in this
planning change. Each implementation PR binds exact files, test identities and
an evidence location to its owner before materialization.

F0–F7 form the common gate, using existing admitted seams and substantive test
consumers. The role and dynamic cards F8/F9 below are separate dependent gates;
their design is required now, but they are not common entrance rows. This avoids
requiring a new role feature to exist before its own foundation can qualify.

| Card and owner | Concrete work and source boundary | Entrance and independently observable exit |
| --- | --- | --- |
| F0 — architecture/composition | Inventory actual composition seams, capability owners, process profiles, borrowed/owned resources, contribution/update boundaries and exact source/artifact states in the adoption record | Full table above and OD-043 target rows have owners, failure contracts and evidence; proposed ADR-0118 transition contains no invented public API or implicitly upgraded pin |
| F1 — engineering/tooling | Execute the [coherent tooling migration](repository-tooling.md#full-foundation-tooling-adoption), including old embedded compilers, quality v5, FMS/Stack and managed Docs dependencies | Exact installed closure respects TS >=7.0.2; frozen/strict-peer profiles and original rejecting quality gates pass; rollout and rollback preserve recovery state |
| F2 — architecture/tooling | Extend `architecture/feature-module-standard-profile.json`, existing source/topology profiles and `tooling/architecture-conformance` through shared source facts and FMS/CMS kernels; register tests in `architecture/foundation/required-quality-tests.json` | A real nested consumer and source-derived forbidden child access, indirect parent assembly, skipped republication, type/load cycles and composition-import failures run in required gates; activate constructs only with this proof |
| F3 — feature and Host composition | Migrate the existing Sandbox Manifest seam in `packages/contexts/agent-context/src/features/sandbox-manifest/composition/feature-module-factory.ts`; classify Local Host discovery without turning pure code into artificial modules; add curated entries/groups/roots in the owning package | Same portable behavior through two independently wired test Hosts with their own drivers, adapters and lifetime owners; installed public roots, meaningful profiles, exact optional/many rows and wrong-wiring oracle; keep application semantics |
| F4 — Host and resource owners | Integrate Resources around actual acquisition, inbound subscription/session and repeated-instance boundaries; original factory remains implementation code | Failed/aborted partial startup closes owned resources, late setup is retained, raw unsettled work cannot release borrowed dependencies, close reentry/debt/retry are witnessed independently |
| F5 — projection and hook owners | Connect one real latest-state projection, one ordered policy capability collection and existing command/durable-event ports | Coalescing is observed without losing durable work; hook order/failure/denial is explicit; latest-only load settles before release; disclosure and revocation use current owning authority |
| F6 — integration and composition | Qualify a native Effect version of a representative resource-owning integration graph, using installed GM/Effect roots and shared source/typed diagnostics | Native success, typed failure, defect, interruption, private Layer finalization, sharing and borrowed lifetime pass; Promise `isolate`/`smoke` is not claimed as native evidence |
| F7 — architecture/tooling | Retain an Orchestrator-shaped nested descriptor-map and module fixture at 100/500/1,000 entries, with actual source enforcement and complete map parity | Common foundation requires the 500-entry difficult shape on the supported toolchain; report compiler, construction/runtime and source-check measurements separately; 1,000 remains a distinct growth row |

Two configurations under one generic Host do not establish the F3 portability
claim. These independent test integrations also do not satisfy OD-041's separate
two-product acceptance floor. The following are dependent implementation cards:

| Card and owner | Concrete work and source boundary | Entrance and independently observable exit |
| --- | --- | --- |
| F8 — selected role owner | Compose the first actual Control Host and Team Topology S3 boundary under the existing placement record, using separate processes and gRPC/Protobuf through Dapr | Real local and remote contract suites, dropped reply, wrong target, sidecar/role failure, readiness and drain; no in-process production fallback or reconstruction of remote features |
| F9 — lifecycle, Runtime and product owners | Join the real shared EF/LMU mechanisms through the [owned dependent cards](../open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md#full-foundation-integration-handoff) | Useful installed contribution, current authorization and state authority, real facade/CAS/unknown/retirement evidence; actual Browser/Desktop/isolation and distribution/product floors remain explicit |

F0 and exact-source qualification can proceed immediately. F1 prepares the
tooling closure for F2; F2 and F3 evolve together so enforcement precedes each
new construct. F4–F6 qualify real uses of that graph. F7 measures the same
authoring shape, rather than an easier substitute. F8 progresses with the first
owning role feature, preserving its existing placement gate. F9 progresses with
the shared owner workstreams; a replaceable boundary needs its working invocation
facade before dependent business code. It must not be backfilled with an
Orchestrator-local update engine while waiting for the upstream implementation.

Use existing `scripts/architecture`, package tests and conformance owners for the
required witnesses. The implementation adds explicit named fixture identities to
the installed required runner; merely adding a file beside tests is insufficient.
Packed consumers use built public exports and installed declarations. Runtime
and type identity, absence of deep imports and deliberate rejecting mutations
must be tested from the installed artifacts, not inferred from workspace tests.

### State, lifetime and upgrade boundaries designed now

Stable operation ports hide replaceable instances. Supported continuations,
callbacks, streams and raw external work belong to the complete operation, not
merely its returned Promise. A single selected generation remains coherent
through nested/reentrant calls and awaits. Stop ingress, request cancellation,
settle work, revoke write authority, close resources and observe physical exit
are distinct transitions with different owners.

Canonical domain state, grants and durable operation receipts outlive transient
instances. Product records distinguish contract revision, package version,
artifact digest, installation, contribution, generation, attempt, head revision
and state baseline. An old generation retaining a resource lease has no implied
permission to perform a new protected effect. The real receiver rechecks its
current scope and fence. Cross-context state uses owned ports and events, never
a joint database transaction.

Publication returns committed, rejected/conflict or unknown. Unknown retains
the original candidate/attempt until authoritative reconciliation; a current
head alone cannot prove an earlier operation's result. Retirement addresses an
exact registration instance, so a late A disposer cannot delete B by name.
Rollback selects a new compatible authorized generation and preserves committed
effects and schema/grant history. Existing workflow, persistence and Runtime
owners retain their machinery; this foundation does not create copies.

### Source artifacts and rollout

Unpublished source is an allowed evaluation and qualification input. Build and
pack an immutable reviewed cohort, retain its build and archive identities, and
exercise separate frozen installed consumers. The
[tooling adoption route](repository-tooling.md#full-foundation-tooling-adoption)
specifies how those candidates reach a truthful production distribution and
managed profile. No dependency waits merely because research used newer source;
no current registry assertion is claimed to pass for different local bytes.

Change package pins, lock, source profiles, required gates and qualified evidence
together. Keep a coherent rollback pair and preserve incomplete operations and
authoring recovery journals. Leave the old accepted ADR bodies as provenance;
the accepting successor identifies exactly which adoption fields change.

Complete design and common foundation qualification enable dependent increments
within their qualified transitive closure. They do not complete the whole
extension/update/target programme. Its pending rows stay visible until actual
implementations and independent evidence satisfy the promised profiles.

## Commands, hooks, state, and durable events

Choose communication by the guarantee the consumer needs:

| Need | Mechanism and owner |
|---|---|
| Request an operation and receive a typed result | Consumer-owned command/query port, selected through a slot |
| Select a policy or contribute ordered behavior | Explicit required/optional/many capability contracts, with owner-defined order and failure semantics |
| Observe replaceable latest state | Get Modular Observation, with one writer and subscriber-owned lifetime |
| Call a remote service | Published Protobuf contract and selected transport adapter |
| Preserve every committed occurrence | Feature-owned durable event or operation contract, outbox/inbox and reliable adapter |
| Recover a long-lived business process | Owning process manager and selected durable scheduling adapter |

A hook is an explicit capability with a purpose, owner, order, failure result,
and permission boundary. It is not an unrestricted global callback registry.
Authorization and business invariants cannot be delegated to optional notification
hooks.

Observation `watch` and `load` may coalesce changes and operate on latest state.
They are appropriate for replaceable state or an invalidation hint that causes a
read of authoritative state. They cannot be the sole source for incremental
durable projections, Work dispatch, billing, audit, or access revocation.
A durable subscriber may publish its resulting current state into Observation
after its durable checkpoint commits.

This is a deliberate semantic distinction, not a requirement to add durable
delivery to Observation. Browser use needs its own qualification; Node behavior
does not prove browser parity.

## Shared mechanisms and independent products

Orchestrator owns Team, Work, Task, assignment, Run, project-owned Execution
Directory registration/materialization, and orchestration placement/binding
intent. Agent Runtime owns actual execution, sandbox, and process resources
under the [runtime boundary](runtime-boundary.md). Platform invokes Orchestrator
capabilities through the public API/SDK and versioned managed lifecycle/authority
contracts. It does not implement a second task engine or write Orchestrator
storage.

Platform retains its own customer, commercial, product-project, admission, and
deployment policy. Its product authority adapter is one selected deployment
integration. Standalone Self-Hosted selects its independent authority and must
operate without a Platform endpoint or private package registry.

The [companion Platform proposal in PR #55](https://github.com/agent-teams-ai/agent-teams-platform/blob/a4d47e1c27c3c1efc0e94f770fc9064b0bc17bfc/docs/architecture/platform-orchestrator-boundary.md)
records the hosted product relationship and proposed exact integration contracts.
The link pins the reviewed proposal, not merged Platform authority. Each product
can release independently; a managed composition binds compatible contract and
capability versions explicitly. A shared mechanism must not force standalone
Orchestrator to deploy Platform or update both products together.
[The research coverage](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md)
records the evidence, pending Platform adoption, and remaining product choices.

Reusable libraries may own concrete mechanisms shared by real consumers: OIDC
validation, provider administration adapters, the selected relationship-
authorization client and its conformance suite, transport primitives, and Get
Modular itself. OpenFGA remains the candidate described in
[OD-012](../open-decisions/OD-012-identity-authorization-tenant-isolation.md); this composition
contract neither selects the IAM stack nor requires speculative package
extraction. Product permission names, role policy, membership lifecycle, domain
aggregates, repositories, and transactions remain with their owners. Similar
fields do not justify a shared `Tenant`, `Project`, `Principal`, or `Task` domain
package.

For a concrete mechanism already expected to serve both products, follow the
organization's [library-first rule](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md#library-first-design-and-deliberate-evolution):
design one reusable library and contract from the start, and validate it with
disposable consumers and at least one real consumer in the same delivery.
Do not first duplicate the mechanism in both products while waiting for a
second implementation. This does not authorize speculative packages, a shared
business domain, or a universal IAM framework; the named owners and actual
repeated need still determine the boundary.

A shared provider adapter does not imply one remotely mandatory authorization
service. Each product/process supplies its own policy through narrow ports and
uses explicitly versioned contracts. This avoids both copied provider plumbing
and a distributed application that can only change all services together.

## Activation and existing implementation

ADR-0117 preserves the mandatory framework choice. Production activation is pending
the [module foundation gate](implementation-readiness-gates.md#module-foundation-before-business-expansion).
The exact Core/Assembly baseline is selected by ADR-0113, but not installed by this reconciliation; no
runtime, scale, browser, or complete source conformance is claimed.

At reviewed main `98f653172215e2a2c73cc484db3fa4fe72ed21ba`, the materialized
`agent-context/sandbox-manifest/composition/feature-module-factory.ts` remains a
known migration seam. `packages/platform/local-host-control` also requires
classification of actual independently assembled seams; pure utilities do not
automatically need entries. New source from concurrent materialization must be
included in the same inventory before activation. Neither package receives an
implicit permanent exemption.

Required consumer evidence includes:

- source inventory and exact adoption scope with no second production resolver;
- complete nested visibility, direct-parent assembly, republication, and cycle
  checks from the existing source classifier;
- `isolate`, per-root `smoke`, an independent `checkWiring` oracle,
  `checkNamespaces`, and `checkModuleLayout` integration;
- contract suites for alternative implementations, including fakes;
- preparation failure with zero factory calls, attempt isolation, cancellation,
  startup failure, and resource handoff/cleanup;
- supported-toolchain growth and exact packed-artifact tests.

`checkModuleLayout` validates supplied source facts; it is not an import parser.
Foundation remains the source/dependency policy engine. A second handwritten
parser or module framework is not the migration plan.
