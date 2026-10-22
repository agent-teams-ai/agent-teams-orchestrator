---
id: ADR-0113
type: adr
status: accepted
owner: architecture/composition
summary: Adopt the approved module and static composition decisions into canonical main with fresh identity and immutable branch provenance.
approved_by: product-owner
accepted_at: 2026-10-22
supersedes:
  - ADR-0040
  - ADR-0098
superseded_by: []
related:
  - ADR-0030
  - ADR-0042
  - ADR-0060
  - ADR-0095
  - ADR-0103
  - ADR-0114
  - ADR-0115
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.dependency-rules
  - architecture.repository-tooling
  - architecture.implementation-readiness-gates
---

# ADR-0113: Canonical Module and Composition Adoption

## Context

The product owner has approved Feature Module Standard v1.1 and the exact Get
Modular 0.5.0 Core/Assembly pair. Those decisions were published on the architecture
branch under identities that cannot all enter the canonical catalog unchanged.
Canonical main already contains the unrelated accepted ADR-0103 admitting the
first sandbox runtime migration slice. Its identity, body and accepted baseline
must remain intact. The owner now requests integration of the approved architecture
without weakening checks or rewriting accepted history.

This is a new canonical adoption record, not a rename of a published ADR. It
records the same approved module and composition choices and their bounded
supersession effects. The published source records remain unchanged at their
original commits and paths.

## Decision

### Immutable sources and identity mapping

The following sources are pinned to the complete reviewed architecture snapshot
`3a68590e98e3acc77eb1f27e0938f08e93307b50`. Their accepted immutable digests are
the values in that snapshot's accepted-decision baseline, not Git blob hashes.

| Source record in the published branch | Immutable digest | Canonical responsibility |
|---|---|---|
| [Source ADR-0103: FMS v1.1 adoption](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0103-feature-module-standard-v1-1-adoption.md) | `sha256:f4706503f88a586296852629642f7a81e1d21630f1da2c1b55a356d9dec1b8db` | This record's standard adoption and construct activation |
| [Source ADR-0104: Get Modular 0.5 static composition](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/3a68590e98e3acc77eb1f27e0938f08e93307b50/docs/decisions/0104-get-modular-0-5-static-composition.md) | `sha256:ba495d3cd561645a0f28750e43dd0d0418721975ff097ae639c27ec893b9a317` | This record's composition selection and qualification |

The approved requirements and retained evidence of those sources are adopted
with the source-context mapping above. Their branch-local references to the
FMS adoption and Get Modular selection resolve here. Their private service,
durable delivery and distributed-role references resolve to ADR-0114; their
historical server-first release wording is subject to ADR-0115. Their historical
proposal descriptions do not select Moleculer or override the later accepted
private RPC decision.

An unqualified ADR-0103 in the canonical catalog continues to mean
[first sandbox runtime migration slice admission](0103-first-sandbox-runtime-migration-slice-admission.md).
This adoption neither supersedes that admission nor widens its business scope.
Source IDs remain qualified by their immutable branch URLs; they are not aliases
that replace canonical identities. This record does not adopt the parallel
PR86 module pin or its other changes.

### Feature Module Standard adoption

Adopt `agent-teams.feature-module-standard` version `v1.1`:

- repository: `agent-teams-ai/.github`;
- path: `docs/architecture/feature-module-standard/v1.1.md`;
- inspected commit: `f5653f5630057524a4ee44e50c16e138442a9b42`;
- Git blob: `bd949a9a670862fea851a7791fce772fdef3b4fc`;
- SHA-256: `cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c`.

The [local feature profile](../architecture/feature-module-standard.md), backed
by `architecture/feature-module-standard-profile.json`, remains the product
authority. Production roots remain `apps/**` and `packages/**`. Package ownership,
materialization, import policy, TypeScript publication and stricter local rules
retain their owners. There is no deviation from v1.1. Feature, nested feature,
entry/group, package, bounded context and deployed service remain distinct.

Accept the v1.1 nested-feature and composition-contract semantics while keeping
`sub_features`, `republications` and `composition_contracts` empty and activation
`blocked-until-enforced`. The profile gate rejects nonempty inventories and
another activation value, and checks physical production source for nested
feature roots and conventional composition-contract files at feature and
Host/package `src` roots. Omitting a profile entry cannot authorize physical
materialization. Current flat checks do not prove the complete new semantics.

First activation updates classifiers, inventory and enforcement together.
Accepting and rejecting fixtures must cover parent/subtree visibility,
direct-parent assembly, one-level republication without added behavior, the
acyclic downward/lateral use graph including type-only edges, and the separate
load-time cycle prohibition. Only the direct parent assembles children; callers
outside that boundary use declared ancestor republication. Composition contracts
are behavior-free descriptors and value type declarations used from composition.
Existing readiness and materialization gates remain required.

### Bounded flat reader projection

Keep `architecture/foundation/quality-feature-topology.json` as the historical
flat v1 reader input for Engineering Foundation 1.7.2. This is a bounded format
mapping under the v1.1 primary authority, not a second standard or quality waiver.

The projection check requires the exact v1.1 primary binding, blocked empty
inventories and physical activation restrictions. It maps the same production
and excluded roots and materialized package source/test trees, retains the exact
historical reader binding, and rejects drift in either binding or topology.
Foundation independently rejects unclassified workspace packages. Source scope,
required test identities, typed rules and materialization gates remain intact.

Installed-reader acceptance, pin drift, nonempty inventories and undeclared
physical constructs remain covered by the existing consumer tests. New-construct
activation requires a compatible reader and semantic checks; the projection
cannot outlive those preconditions.

### Exact static composition selection

Select the exact pair `@get-modular/core@0.5.0` and
`@get-modular/assembly@0.5.0`. Do not float or mix the pair. This is a design
baseline, not permission to add production dependencies before admission.

Adopt the Get Modular Consumer Module Standard at the existing reviewed pin:

- repository: `agent-teams-ai/get-modular`;
- path and anchor: `docs/architecture/common-assembly.md#consumer-module-standard`;
- immutable commit: `a3a079baca2c6af48c9d45bc08992825be1c2bbd`;
- complete-document SHA-256:
  `e5cb510c5ea83e54a6833cc40b6ad31fc5cf8c70d9838e4e0c6923edc6f70919`.

The [pinned upstream document](https://github.com/agent-teams-ai/get-modular/blob/a3a079baca2c6af48c9d45bc08992825be1c2bbd/docs/architecture/common-assembly.md#consumer-module-standard)
owns its authoring rules. The [local composition profile](../architecture/composition-and-dependency-injection.md#get-modular-adoption-profile)
owns scope, construction, lifecycle, qualification and legacy boundaries. Retain
the accepted Host/context composition scope; this adoption makes no silent pin
upgrade or scope expansion from a parallel branch. Go/Rust services preserve
ownership and wire contracts without running the TypeScript library.

Each selected Host process assembles its applicable capabilities once. Assembly
selects exact bindings from declared entries and static groups; owned factories
construct implementations; the Host receives closed roots and typed context
handles. Context-internal capabilities stay private. Cross-context bindings use
the provider's Published API and a consumer-owned adapter.

Declarations, descriptors, `implement`, `input`, static `group` entries and
`prepare({ modules })` belong in composition. Each feature group owns its entries
and direct child groups. A root cannot reach through a parent to assemble a
private descendant. Duplicate entry identities, invalid bindings and dependency
cycles fail before factories run. Cohesive private helpers and fixed library
calls remain direct imports and typed factories rather than ceremonial entries.

Domain and application code receive narrow ports and models, with no Get Modular,
wire DTO, broker, container or registry imports. Composition descriptors,
application ports and Protobuf services remain different contracts. Capability
revisions follow the pinned composition contract; public protocol evolution
follows its owning contract profile.

### Lifecycle, resources and qualification

Host lifecycle owns startup, readiness, resource custody, failure cleanup and
ordered shutdown. Graph preparation does not discover plugins, start agents,
manage PostgreSQL or acquire business authority. Module identities are not
tenant, Agent, Run, process or service identities. Explicit operation scopes
retain their Unit of Work and cleanup owner; a long-lived capability cannot
retain a request-scoped resource.

Awilix is no longer a default or parallel production composition mechanism.
Do not rebuild the same graph in transport factories, a direct-factory fallback,
a second registry or a generic service locator. Service adapters invoke already
constructed handles and hold no second authoritative business state. A future
service runtime is a separate adapter decision.

Optional Get Modular resource and lifecycle packages are not adopted merely by
family membership. The compatible Consumer Module Standard conformance kit is
required development tooling for the first adopted production scope. Before
that scope materializes, pin its compatible version and bind the required layout,
namespace, isolation, smoke, independent binding-oracle and applicable contract
suite checks to the existing quality gate with positive and negative fixtures.
Nested-construct activation remains blocked until the corresponding semantic
checks exist. Existing sandbox admission does not itself prove composition
qualification, and this adoption claims no completed migration.

### Bounded supersession and preserved history

Supersede ADR-0040's Awilix composition mechanism while retaining its typed
factories, context privacy, resource ownership, operation scopes and explicit
lifecycle guarantees. Supersede ADR-0098's version adoption while retaining its
local product authority, explicit immutable central binding and adoption process.
Their immutable bodies and previous baseline entries remain unchanged.

Only the permitted `status` and `superseded_by` lifecycle fields of these
predecessors change. Append this new record through supported baseline promotion.
Do not replace the canonical ADR-0103 or source ledger with a branch's conflicting
entry. Source acceptance dates remain historical evidence; this canonical adoption
is recorded on the owner's current integration instruction.

## Consequences

- The canonical catalog has unambiguous module authority and preserves both the
  sandbox admission and the original published module decisions.
- One typed graph, context-owned factories and explicit lifecycle avoid competing
  production composition authorities without turning every helper into a module.
- Flat implementation evidence remains honest. Nested semantics, conformance,
  first-scope dependencies and actual runtime behavior remain gated.
- Exact library pairing and standard pins are unchanged. Upgrades require their
  ordinary scoped adoption and qualification, including later branch reconciliation.
- This record introduces no production package, framework dependency, transport,
  runtime implementation or claim of profile or scale qualification.

## Rejected alternatives

- Renumber or rewrite accepted source ADRs, replace main's ADR-0103, or regenerate
  a ledger that hides the collision: destroys stable identity or provenance.
- Import records whose unqualified source references would bind to unrelated
  canonical decisions: makes valid-looking relationships semantically false.
- Keep Awilix, handwritten assembly and Get Modular as competing production
  graphs: duplicates wiring and obscures resource custody.
- Claim nested conformance from a version label or flat reader acceptance:
  omits parent visibility, republication and graph-role enforcement.
- Float package versions or adopt a parallel Common Assembly pin while resolving
  identities: introduces an unreviewed change beyond this integration.
