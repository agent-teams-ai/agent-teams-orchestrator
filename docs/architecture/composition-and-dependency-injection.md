---
id: architecture.composition
type: architecture
status: accepted
owner: architecture/composition
summary: Mandatory Get Modular composition, scope, and lifecycle rules for independently assembled TypeScript capabilities.
related:
  - ADR-0042
  - ADR-0030
  - ADR-0110
  - architecture.dependency-rules
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
---

# Composition and Dependency Injection

## Purpose

Get Modular is mandatory for applicable TypeScript production composition under
`apps/**` and `packages/**`, as accepted by ADR-0110. This includes context,
platform, integration, SDK, and executable capabilities that are independently
assembled, replaceable, or connected through configurable module relationships.
A handwritten module framework, Awilix container, or second production assembly
path is prohibited.

An owner-local factory remains the implementation of a module. Private helpers,
parsers, mappers, value objects, and fixed library dependencies use ordinary
functions and static imports; they are not independent modules merely because
they live in separate files. A feature, Assembly entry, package, and service are
different boundaries.

The [pinned Consumer Module Standard](https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/docs/architecture/common-assembly.md#consumer-module-standard)
owns Get Modular authoring rules. ADR-0110 records its complete-document digest.
The [local feature profile](feature-module-standard.md) maps the organization
standard and records actual enforcement. This document owns product composition
scope and lifecycle boundaries, not another module API.

## Process and service boundaries

Each selected Host or process role owns its static composition graph and closed
root capabilities. A service in another process is represented by a narrow
consumer-owned port and a transport adapter. Dapr/Protobuf service integration
does not share a container, module registry, transaction, or capability object
between processes.

This rule supports the owner's service-first direction. Canonical main now owns
deployment roles and Dapr integration through its
[backend adoption](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/94a480d004e8e6eaf79507feeae30428d372a3d3/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md).
PR #79 is a closed historical source. This pending branch still needs integration
with main's separate module adoption and exact pin; see the
[branch integration status](overview.md#branch-integration-status).
This composition decision neither requires a modular monolith nor selects a new
service mesh or message broker. Non-TypeScript services follow the published wire
and ownership contracts without executing Get Modular.

The Host owns process signals, admission, readiness aggregation, and shutdown.
It supplies explicit borrowed technical capabilities. Receiving a capability
does not confer ownership of its connection, repository, transaction, or cleanup.

## Physical placement and nested assembly

Inside each feature, use the standard's flat `composition/` surface:

- `<feature>.contracts.ts` for descriptors and composition types;
- `<module>.declaration.ts` for one inert declaration;
- `<module>.module.ts` for one `implement` entry;
- `<feature>.inputs.ts` only when declared inputs exist;
- `<feature>.group.ts` for the feature's own entries and direct child groups.

Host roots live at `src/composition/<role>.root.ts`. A root lists top-level
feature groups and its own Host entries. Only the direct parent composes a child
feature at `features/<parent>/features/<child>/`. A Host cannot reach into a
nested feature to wire its implementation directly.

Composition descriptors are distinct from public transport schemas and
application ports. They may be consumed only by permitted composition code and
tests. Public republication follows the organization standard one ancestor level
at a time. Moving a feature changes its structural identity, not an existing
published capability ID.

Directories and files appear only with real owned behavior. No empty layers,
module-per-class rule, module-per-endpoint rule, or generic shared directory is
introduced.

## Preparation and bindings

Use the public Core/Assembly APIs: `defineContract`, `declareModule`,
`implement`, `input`, `group`, and `prepare`. Production roots use the
standard's static `profileId` form and literal entries. Required slots with one
eligible provider can be completed by Assembly; optional, many, and ambiguous
relationships require explicit bindings. Ordered many bindings carry deliberate
order, never filesystem discovery or registration order.

Contract owners publish descriptors and exact compatibility revisions. Preserve
literal inference and use feature-local maps; modules do not import a Host-wide
capability bag. Domain and application code receive narrow consumer-owned port
records. They do not import Get Modular, framework descriptors, transport DTOs,
or concrete selected adapters.

Preparation must reject an invalid graph before any factory runs. A successful
plan establishes wiring only. It does not establish permissions, provider trust,
readiness, delivery guarantees, or business eligibility.

The following are prohibited:

- a raw container, cradle, registry, or resolver passed into business code;
- string lookup or instance fallback when a declared capability is missing;
- filesystem scanning, dynamic registration, or decorators for static assembly;
- direct production construction that bypasses the selected graph;
- broad casts, `any`, or double casts that hide wiring errors;
- speculative runtime discovery, hot replacement, or lifecycle-kernel adoption.

Direct construction remains valid for focused business tests and independent
oracles, not as a second production deployment mode.

## Resources and lifecycle

Use `@get-modular/resources` for resources acquired by a module, through
`setup`, `use`, and the standard `scoped` adapter. Borrow-only and pure
modules need no resource scope. Register cleanup at acquisition; a module never
closes a slot dependency merely because it received that dependency.

The Host creates a separate attempt scope and supplies declared run inputs.
Entries must not capture request, tenant, or attempt state when they are created.
A longer-lived component cannot retain a shorter-lived dependency. Durable
tenant, project, team, task, Run, and session identities do not create module
lifetimes automatically.

Host policy separates construction, external startup, readiness, admission,
drain, and cleanup. Do not infer this ordering from graph construction alone.
After cancellation, retain custody until the factory settles; preserve both the
created journal and any untransferred returned product. A timeout does not prove
that acquisition or cleanup stopped.

Shutdown stops admission and subscribers, drains bounded work, and closes owned
resources in their declared order. Escalation, abandonment, cleanup debt, and
physical process termination remain explicit Host decisions. A completed cleanup
report states what callbacks completed, not a stronger physical-release claim.
Business recovery uses authoritative stores and process contracts; rebuilding a
module graph cannot recover durable Work or Runs by itself.

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

The companion [Platform boundary direction](https://github.com/agent-teams-ai/agent-teams-platform/blob/main/docs/architecture/platform-orchestrator-boundary.md)
owns the hosted product relationship and its proposed exact integration
contracts. Each product can release independently; a managed composition binds
compatible contract and capability versions explicitly. A shared mechanism must
not force standalone Orchestrator to deploy Platform or update both products
together. [The research coverage](../research/collaboration-hierarchy-and-workspace-review-2026-10-22.md)
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

A shared provider adapter does not imply one remotely mandatory authorization
service. Each product/process supplies its own policy through narrow ports and
uses explicitly versioned contracts. This avoids both copied provider plumbing
and a distributed application that can only change all services together.

## Activation and existing implementation

The framework choice is accepted. Production Get Modular activation is pending
the [module foundation gate](implementation-readiness-gates.md#module-foundation-before-business-expansion).
No exact package train is installed by this documentation decision, and no
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
