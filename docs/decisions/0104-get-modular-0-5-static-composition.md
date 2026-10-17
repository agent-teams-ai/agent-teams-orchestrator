---
id: ADR-0104
type: adr
status: accepted
owner: architecture/composition
summary: Use the exact Get Modular 0.5.0 Core and Assembly pair for static capability composition while preserving context ownership and explicit lifecycle.
approved_by: product-owner
accepted_at: 2026-10-17
supersedes:
  - ADR-0040
related:
  - ADR-0030
  - ADR-0042
  - ADR-0060
  - ADR-0087
  - ADR-0095
  - ADR-0103
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.dependency-rules
---

# ADR-0104: Get Modular 0.5 Static Composition

## Context

The product owner selected Get Modular 0.5.0 for a growing modular codebase.
ADR-0040 already keeps factories and business APIs independent of Awilix, so the
composition mechanism can change before production containers materialize.

Feature ownership, graph construction, deployment, and service routing have
different responsibilities. A large feature inventory must remain manageable
without a service per feature, a mutable global registry, or duplicate production
wiring. The new composition choice must preserve those boundaries.

## Decision

Select the exact pair `@get-modular/core@0.5.0` and
`@get-modular/assembly@0.5.0` for static composition of independently assembled
capabilities in the Orchestrator Host and its owned bounded contexts. The
published Assembly package depends on Core 0.5.0 exactly; do not float or mix the
pair. This is the selected design baseline, not permission to install runtime
dependencies before the owning materialization gates pass.

Adopt the upstream Consumer Module Standard at the immutable pin recorded in
[the local composition profile](../architecture/composition-and-dependency-injection.md#get-modular-adoption-profile).
That profile owns the concrete scope, construction and lifecycle owners,
verification route, and legacy boundary. ADR-0103 owns the separate organization
Feature Module Standard v1.1 adoption.

The selected Host profile has one production composition authority. Assembly
selects exact bindings from explicitly listed entries and static groups; owned
factories construct the capabilities; the Host receives closed roots and typed
context handles. Context-internal capabilities stay private. Cross-context
bindings pass through the provider's Published API and the consumer's adapter.

Use the 0.5 authoring model: declarations, descriptors, `implement`, `input`,
static `group` entries, and `prepare({ modules })` belong in composition. Each
feature group owns its own entries and direct sub-feature groups. The root does
not reach through a parent to assemble a private descendant. Duplicate entry
identities, invalid bindings, and dependency cycles must fail before factories
run. Ordinary private helpers and fixed library calls remain direct imports and
typed factories.

Domain and application code receive narrow owned ports and models. They do not
import Get Modular, public wire DTOs, a broker, a container, or a registry. A
composition contract descriptor is distinct from an application port and a
Protobuf service contract. Capability revisions follow the pinned Get Modular
contract; public protocol evolution follows its own accepted contract profile.

Host lifecycle code owns startup, readiness, resource custody, failure cleanup,
and ordered shutdown. Static graph construction does not discover plugins,
start agent processes, manage PostgreSQL, or acquire business authority. Module
identity is not a tenant, agent, run, process, or service identity. Explicit
operation scopes retain their Unit of Work and cleanup owner; a long-lived
capability cannot retain a request-scoped resource.

Awilix is no longer the default or a parallel production composition mechanism.
Do not build the same feature graph again in a Moleculer service factory, a
direct-factory fallback, or a second registry. A service adapter exposes the
already constructed capability and retains no extra authoritative business
state. Any future service runtime remains a separate adapter choice.

The optional Get Modular resources and lifecycle packages are not adopted merely
because they share the package family. The Consumer Module Standard's
conformance kit is required development tooling for the first adopted production
scope. Before that scope materializes, pin its compatible version and connect
the required layout, namespace, isolation, smoke, binding-oracle, and applicable
contract-suite checks to the existing quality gate with accepting and rejecting
fixtures. The current nested-construct activation boundary in the feature
profile remains explicit until the corresponding semantic checks exist.

This decision supersedes ADR-0040's Awilix composition mechanism and carries
forward its typed factories, context privacy, resource ownership, operation
scope, and explicit lifecycle guarantees. ADR-0087's server-first scope and all
implementation readiness gates remain unchanged.

## Consequences

- Composition has a single typed graph and reviewable static entry inventory.
- Feature and service counts can evolve independently; extraction changes an
  adapter and deployment profile without making a framework the domain API.
- Core and Assembly are pre-1.0 dependencies, so exact pairing, compatible
  authoring, and representative construction tests are required for upgrades.
- Static composition does not solve durable work, distributed ownership,
  authorization, database concurrency, or network failure semantics.
- No runtime package, transport, database, or production feature is materialized
  by this architecture change.

## Rejected alternatives

- Keep Awilix and Get Modular as alternate production assemblies of the same
  capabilities. Two wiring authorities would drift and make lifecycle custody
  ambiguous.
- Register every class, endpoint, or helper as a module. Entry count should
  describe composition seams rather than source-file count.
- Use Moleculer service discovery as dependency injection or domain ownership.
  Reachability is not construction, authorization, or durable authority.
- Add a generic container abstraction. Business ports already isolate the
  application from composition without exposing lookup operations.

## Source qualification

The exact pair was read back from the npm registry on 2026-10-17. Package source
was qualified at `74ce8cf14695660926fdc5575d8f4d957535213a` and merged at
`99816e452630715558306db2370baa2af49575e6`; both use tree
`8fbcefe9b8a39f20c76876be04a1e9d3c21dd55b`. See the
[0.5.0 train record](https://github.com/agent-teams-ai/get-modular/blob/a3a079baca2c6af48c9d45bc08992825be1c2bbd/research/releases/0.5.0-train/release-intent.md)
and [Assembly changelog](https://github.com/agent-teams-ai/get-modular/blob/a3a079baca2c6af48c9d45bc08992825be1c2bbd/packages/assembly/CHANGELOG.md).
The retained train record describes pre-publication qualification; the registry
readback establishes publication. Neither is Orchestrator runtime conformance.
