---
id: research.get-modular-adoption-and-scale-review-2026-10-21
type: research
status: active
owner: architecture/composition
summary: Preserve Get Modular adoption rationale, communication boundaries, upstream scale evidence, and remaining consumer qualification.
related:
  - ADR-0110
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
---

# Get Modular Adoption and Scale Review, 2026-10-21

## Scope and provenance

Current integration note, 2026-10-28: [ADR-0117](../decisions/0117-reconcile-mandatory-module-composition.md)
reconciles the parallel module history with the canonical ADR-0113 pin and
mandatory scope. ADR-0114 and ADR-0115 govern service placement and Fully Local
V1. Dated comparisons and earlier pending-branch notes below retain their original
source context; they do not override these current decisions.

This report preserves the composition review behind ADR-0110, recorded on
2026-10-21 and archived on 2026-10-22 from Orchestrator PR #86 head
`8483949960cb783fe70090e2e7fbf526a043d362`. The upstream source baseline is
Get Modular commit `ddf1e0b0053f546f12ca70190b237b4f7e78d09d`. The method is
source and retained-evidence review. No consumer installation, benchmark,
browser qualification, or production migration was executed for this report.
Upstream experiment results below retain their original compiler and fixture
scope; they are not new Orchestrator measurements.

## Findings and design options

### Reuse existing mechanisms

The product direction favors useful existing mechanisms and a small amount of
product-specific integration. Core owns graph semantics; Assembly owns explicit
entries, groups, exact bindings, preparation, and construction. Consumer ports
describe needed capabilities. Owner-local factories implement those capabilities
without becoming a second assembly framework. Pure cohesive helpers remain
ordinary static imports and functions.

| Design option reviewed | Disposition and consequence |
|---|---|
| Get Modular Core and Assembly | Accepted by ADR-0110 for applicable independently assembled TypeScript seams. Reuse declarations, entries, groups, inputs, and existing conformance APIs. Exact package activation still needs consumer evidence. |
| Awilix context-private containers | Historical ADR-0040 choice, superseded by ADR-0110. A second production resolver would contradict the accepted single-framework direction. |
| Handwritten assembly as a permanent alternative | Rejected for applicable production seams. Existing ordinary-factory seams must be inventoried and migrated rather than receiving a permanent exemption. |
| A custom module or lifecycle framework above Get Modular | Rejected as an unnecessary duplicate. Host startup/readiness/drain/shutdown policy stays explicit without creating another graph engine or global registry. |
| One package or service per feature, or one entry per helper | Not implied by modularity. Semantic feature, entry, group, package, and deployed service are different identities. |

The review contains no measured LOC savings or comparative numeric scores for
these alternatives. A mandatory product decision is not evidence that migration
cost, operational reliability, or representative growth has been measured.

### Composition across processes

Each process owns its selected static graph. Remote services are adapters to
published contracts, not modules resolved through a shared cross-process
container. Get Modular is a TypeScript composition library, not an IAM provider,
service transport, durable workflow engine, or deployment topology. Non-TypeScript
services preserve ownership and wire contracts without executing this library.
Separate service-topology work remains owned by its own decision process.

Platform uses Orchestrator APIs/SDKs and versioned managed contracts for Team,
Task, Work, Run, organization, and workspace capabilities. Reusable technical
provider and transport mechanisms do not justify shared business aggregates or a
mandatory remote authority service. Standalone Orchestrator must remain usable
without commercial Platform endpoints or a private registry.

### Observation, durable communication, and Resources

The pinned [Observation README][observation] says deliveries can coalesce several
commits and can repeat unchanged state. `watch` and `load` follow replaceable
latest state; they do not preserve every occurrence. A durable projection may
publish its resulting state after its checkpoint commits. Observation alone
cannot provide Work dispatch, outbox/inbox recovery, a replay log, billing,
audit, or authoritative access revocation.

Use explicit command/query ports for operations, owner-defined contribution
contracts for ordered policies/hooks, published service contracts for remote
calls, and owner-local durable contracts for facts that must survive failure.
Optional notification hooks cannot own authorization or business invariants.

The reviewed Observation limit is 64 live subscriptions of one store in one
scope and 8,192 store-wide. Child scopes or a module-level subscription with
explicitly removed receivers bound shorter work. Thousands of agent executions
do not imply thousands of process-wide graphs or leaked subscriptions. The
Node asynchronous echo guard is not proof of browser parity; a browser consumer
requires a separate qualified lane.

The pinned [Resources README][resources] provides cooperative ordered cleanup.
Modules register release for resources they acquire and borrow dependencies
without disposal rights. The Host decides startup, readiness, drain, shutdown,
deadlines, escalation, and cleanup-debt reporting. `complete: true` means the
registered callbacks returned; it does not prove physical release. Successful
construction is not readiness, authorization, or recovery of durable business
state. Untrusted code needs a runtime the Host can contain, not in-process
cleanup as an isolation claim.

### Supported scale versus private compiler evidence

The pinned [growth record][growth] separates supported compiler results from
private remedy candidates:

| Subject and toolchain | Retained result | What it establishes |
|---|---|---|
| Inherited-map consumer on supported TypeScript 7.0.2, N=8 and N=100 | Passed the recorded research stages. | Evidence for those exact fixtures and sizes; not Orchestrator adoption. |
| Same supported route, N=500 | Cold emit reached 180.046857485 seconds at the 180-second cap. N=1,000 was not created or run on that route. | The corresponding supported-toolchain growth blocker remained open at the reviewed pin. |
| Private patched 7.1.0-dev compiler, 2026-10-20 | Completed the unchanged G-01 and G-02/G-03 series through N=1,000 with retained patch, controls, reports, and logs. | A bounded remedy-candidate experiment, not a maintained release, supported compiler adoption, or complete source conformance. |
| Earlier public N=1,000 diagnostic attempts | Infrastructure interruption; no complete stage report or retained artifacts. | Unknown outcome, not a pass, compiler timeout, or established OOM diagnosis. |

The private series retained the original 180-second compiler, 120-second runtime,
and 600-second per-size aggregate bounds. Do not replace supported evidence with
the private result, shallow maps, larger timeouts, weaker oracles, or wiring casts.
Compiler memory diagnostics and highest waited-process RSS are not simultaneous
aggregate process-tree memory. N is the fixture's generated scale parameter,
not a count of deployed services or concurrent agents.

The pinned [Assembly contract][assembly-contract] also has structural carrier
ceilings. These bound allocation and validation, not useful production capacity:

| Dimension | Reviewed ceiling |
|---|---|
| Entries and group nodes combined; selections and order entries | 4,096 |
| Members of one group | 4,096 |
| Group nesting | 16 levels, with `modules` at level 0 |
| Roots | 1,024 |
| Bindings | 65,536 |
| Providers per binding row; provider occurrences overall | 1,024; 262,144 |
| Provides and slots per declaration | 64; 128 |
| Owner-path segments | 8 |

Arbitrary semantic feature nesting does not promise unlimited runtime group
depth. A selected feature tree and its assembly strategy must fit both source
ownership rules and the qualified runtime envelope.

## Decision status and qualification

[ADR-0110](../decisions/0110-mandatory-get-modular-and-nested-feature-foundation.md)
is accepted; this archive does not reopen the framework choice. It pins the
organization Feature Module Standard v1.1 and Consumer Module Standard authoring
contract. A document pin neither installs packages nor qualifies their exact
released archive train. The composition guide and
[module foundation gate](../architecture/implementation-readiness-gates.md#module-foundation-before-business-expansion)
own current consumer activation policy.

At the reviewed head production activation is pending. A smaller initial
envelope may activate after its own evidence passes; N=1,000 does not need to
block one useful, independently qualified slice. Growth to 100/500/1,000 entries
has separate supported-toolchain rows, and each larger envelope remains
unavailable until its corresponding evidence passes.

Required evidence includes actual source/seam inventory and migration; complete
nested visibility, direct-parent assembly, republication, and cycle checks;
a real nested consumer with meaningful alternative profiles; `isolate`, per-root
`smoke`, an independent `checkWiring` oracle, `checkNamespaces`, and
`checkModuleLayout`; contract-respecting alternative implementations; zero
factory calls on invalid wiring; isolated attempts; cancellation; resource
handoff and cleanup; packed public imports; and fixed supported-toolchain growth
budgets. `checkModuleLayout` validates supplied facts, not parsed imports.
Foundation remains the source/dependency classifier; a second handwritten parser
is not the migration plan. Resources qualification includes the reviewed shutdown
reentry fix; an upstream test alone does not qualify the consumer.

## Evidence and sources

- [Accepted composition choice](../decisions/0110-mandatory-get-modular-and-nested-feature-foundation.md)
- [Current Orchestrator composition contract](../architecture/composition-and-dependency-injection.md)
- [Current Orchestrator feature profile](../architecture/feature-module-standard.md)
- [Current implementation gates](../architecture/implementation-readiness-gates.md)
- [Pinned Consumer Module Standard and Assembly contract][assembly-contract]
- [Pinned Assembly package contract][assembly]
- [Pinned Resources contract][resources]
- [Pinned Observation contract][observation]
- [Pinned growth fixture, retained observations, and compiler investigations][growth]

[assembly-contract]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/docs/architecture/common-assembly.md
[assembly]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/packages/assembly/README.md
[resources]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/packages/resources/README.md
[observation]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/packages/observation/README.md
[growth]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/tests/qualification/consumer-fixtures/growth/README.md

## Limitations and remaining questions

Choose the first useful adoption envelope and record feature depth, entries,
groups, roots, dependency density, process profiles, compile/runtime budgets,
and exact packed artifacts. Do not equate those measures with package count,
service count, simultaneous agents, or lifetime construction attempts.

Resolve representative source-conformance and supported compiler evidence before
advertising the corresponding scale. Measure migration and maintenance work
before claiming code savings. Keep startup/readiness and physical containment
claims separate from construction and callback completion. Dynamic plugins,
hot replacement, browser operation, and public lifecycle-kernel admission remain
separate scopes; this static adoption record does not qualify them.
