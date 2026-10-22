---
id: ADR-0110
type: adr
status: accepted
owner: architecture
summary: Require Get Modular composition and Feature Module Standard v1.1 before expanding production module implementation.
approved_by: product-owner
accepted_at: 2026-10-21
supersedes:
  - ADR-0040
  - ADR-0098
related:
  - ADR-0031
  - ADR-0103
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
---

# ADR-0110: Mandatory Get Modular and Nested Feature Foundation

## Context

The product owner requires Get Modular as the module composition foundation,
including nested features and growth to hundreds of modules. A competing local
module framework or a second production resolver is not an acceptable fallback.
The owner explicitly replaces the earlier Awilix choice and asks that the module
foundation be established before broad business implementation.

The organization has published immutable Feature Module Standard v1.1. Current
Orchestrator enforcement still includes a flat v1 Foundation reader, and the
already materialized sandbox-manifest feature uses an ordinary composition
factory. Neither installing a library nor changing a document proves migration
or nested-feature conformance.

Service deployment and Dapr/Protobuf integration have their own parallel design
work. Module composition must work inside each selected process without deciding
how many processes the product deploys.

## Decision

### Mandatory composition

Get Modular Core and Assembly are the single production composition mechanism
for independently assembled TypeScript capabilities, replaceable implementations,
and configurable module relationships under `apps/**` and `packages/**`. This
includes applicable context, platform, integration, SDK, and executable seams.
There is no package-family exemption for a second handwritten assembly system.

Private cohesive helpers, parsers, mappers, value objects, and fixed library
dependencies remain ordinary functions and static imports. They do not become
module entries solely to increase a module count. Owner-local factories are
implementations assembled by Get Modular, not an alternative module framework.

Each process owns its selected static graph. Domain and application code receive
narrow consumer-owned ports; Get Modular imports and descriptors stay in
composition and tests. Remote services appear through adapters to their published
contracts, not through shared containers or one graph spanning processes.
Non-TypeScript services preserve the same ownership and wire contracts without
being required to execute a TypeScript library.

Use the existing declaration, entry, group, input, resource, and conformance APIs.
Do not introduce a local `ModuleRuntime`, service locator, global mutable registry,
Awilix container, or direct production fallback. Runtime plugin loading, hot
replacement, and the candidate lifecycle kernel are not admitted by this static
composition decision.

### Central authorities

Adopt organization Feature Module Standard `v1.1`:

- repository: `agent-teams-ai/.github`;
- path: `docs/architecture/feature-module-standard/v1.1.md`;
- Git blob: `bd949a9a670862fea851a7791fce772fdef3b4fc`;
- SHA-256: `cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c`.

The [local feature profile](../architecture/feature-module-standard.md) and its
machine-readable profile own the concrete mapping and enforcement state. No
deviation from the organization standard is introduced. Nested features and
composition contracts remain blocked until their complete semantic checks run.
The retained flat reader is an explicitly bounded projection for modules with
neither construct; it is not evidence of nested conformance.

Pin the Get Modular Consumer Module Standard as the selected authoring contract:

- repository: `agent-teams-ai/get-modular`;
- path and anchor: `docs/architecture/common-assembly.md#consumer-module-standard`;
- commit: `ddf1e0b0053f546f12ca70190b237b4f7e78d09d`;
- complete-document SHA-256:
  `c2fe582a14ff6e79620b232ca7ffc914afb0474ec21fd43f208251dd7252f4a3`.

The [pinned central document](https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/docs/architecture/common-assembly.md#consumer-module-standard)
owns its authoring rules; this repository owns product boundaries and activation.
An exact package/archive train and consumer qualification must accompany the first
activation. The document pin alone neither installs dependencies nor selects a
private compiler build. Future pin changes follow the owning adoption process.

### Foundation before expansion

Before adding or expanding business module assembly, complete the module
foundation evidence in
[implementation readiness gates](../architecture/implementation-readiness-gates.md#module-foundation-before-business-expansion).
Allowed work includes the foundation itself, current-seam migration, contract
fixtures, disposable qualification, and corrections to already admitted behavior.
Unqualified direct assembly cannot become a permanent legacy exemption.

ADR-0103 retains its exact sandbox business admission and historical evidence.
It does not establish Get Modular qualification. This decision does not expand
the accepted Team, Work, Run, identity, or deployment behavior of that slice.

Qualification must cover actual consumer source rules, one representative nested
slice, independent wiring oracles, failed/cancelled construction cleanup, and
representative growth on the accepted supported toolchain. A partial validator,
an upstream library test, or a private compiler experiment does not pass the gate.

### Communication and resource ownership

Use Resources when a module acquires resources and Observation when a consumer
follows replaceable latest state. Pure modules need neither. Typed command ports
carry operations; durable owner contracts and their storage/transport adapters
carry facts that must survive delivery failure. Observation `watch`/`load` cannot
substitute for an outbox, inbox, replay log, or revocation contract.

Host composition owns admission, readiness, startup, drain, and shutdown policy.
Modules register cleanup for resources they acquire and borrow slot dependencies
without acquiring disposal rights. Successful construction is not readiness or
authorization, and completed callbacks are not proof of physical release.

## Consequences

- All applicable TypeScript composition seams follow one framework and the
  organization's nested-feature ownership rules from their first activation.
- Hundreds of features do not imply hundreds of packages or services. Feature,
  Assembly entry, package, and deployment identities remain distinct.
- Awilix is no longer the selected production mechanism. ADR-0040 and ADR-0098
  remain historical records with unchanged bodies.
- Existing factory seams require explicit migration and qualification; this
  documentation change claims no runtime integration or deployment readiness.
- A supported compiler growth issue and incomplete nested source conformance
  must be resolved before the corresponding scale is advertised or adopted.
- Parallel topology work must reconcile its composition ADR references with this
  successor instead of reviving the earlier mechanism or duplicating authority.

## Rejected alternatives

- Keep Awilix or manual production assembly as a second supported route. This
  contradicts the owner's explicit single-framework direction.
- Build a custom module framework above Get Modular. The library already owns
  declarations, exact bindings, preparation, and construction mechanics.
- Make every helper a module or every feature a service. Neither follows semantic
  ownership or demonstrated lifecycle needs.
- Declare foundation readiness from documentation or a private compiler result.
  Required consumer and supported-toolchain evidence would still be missing.
- Turn Observation into a universal durable event bus. Replaceable state and
  durable occurrences have different owner, replay, and failure contracts.
