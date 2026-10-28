---
id: ADR-0117
type: adr
status: accepted
owner: architecture/composition
approved_by: product-owner
accepted_at: 2026-10-28
supersedes:
  - ADR-0110
related:
  - ADR-0103
  - ADR-0111
  - ADR-0113
  - ADR-0114
  - ADR-0115
  - OD-012
  - OD-048
  - architecture.composition
  - architecture.feature-module-standard
  - architecture.implementation-readiness-gates
summary: Reconcile mandatory Get Modular scope and foundation readiness with the canonical pinned composition baseline.
---

# ADR-0117: Reconcile Mandatory Module Composition

## Context

The owner requires Get Modular for applicable TypeScript module composition,
nested features under the organization standard, and a qualified module
foundation before broad feature implementation. PR #86 recorded that direction
in ADR-0110, followed by collaboration policy in ADR-0111. In parallel, canonical
main accepted ADR-0113's exact module baseline, ADR-0114's separate service roles
and Dapr/Protobuf boundary, and ADR-0115's Fully Local V1 scope.

On 2026-10-28 the owner explicitly requested reconciling the branches and
finishing their integration. The different module pins and overlapping scope
must not survive as two current authorities. This decision preserves both
histories while combining the confirmed requirements without changing package
versions, runtime admission, or the separately owned backend and local decisions.
ADR-0116 is reserved by independent native-workflow work and is not part of this
reconciliation.

## Decision

### One baseline and mandatory composition scope

ADR-0113 remains the authority for the exact adopted baseline: Core and Assembly
`0.5.0`, the Consumer Module Standard at
`a3a079baca2c6af48c9d45bc08992825be1c2bbd`, and organization Feature Module
Standard v1.1. Its complete-document digest, artifact-qualification obligations,
source provenance, and stricter authoring budgets remain unchanged. This decision
supersedes ADR-0110, including its different `ddf1e0b` authoring pin; it does not
rewrite either accepted decision's body or install an upgraded library.

The mandatory composition scope includes every actual independently assembled,
replaceable, or configurable TypeScript production capability under `apps/**`
and `packages/**`. It is not restricted by package family: applicable Host,
context, platform, integration, SDK, contract, and testing-package assembly uses
Get Modular. Each actual surface must be inventoried in its first adoption scope.
A pure contract package, cohesive helper, parser, mapper, value object, or fixed
library dependency does not need an artificial entry. Typed factories implement
capabilities; they cannot form a competing production dependency graph.

Get Modular imports and descriptors stay in composition and composition tests.
Business code receives narrow owned APIs and ports. A library exposes a narrow
public API rather than leaking its graph or framework descriptors. There is no
Awilix fallback, service locator, global mutable registry, or second handwritten
module framework. Focused unit tests may construct ordinary implementations
directly without creating another supported production composition.

Each process owns its selected graph. Private remote service calls follow
ADR-0114's contracts and adapters; they do not share instances or reconstruct a
remote owner's features locally. Feature, entry, group, package, context, service,
Tenant, and Agent execution counts remain distinct. Non-TypeScript services
follow published contracts without being forced to run a TypeScript library.

### Foundation before expansion

Before new or expanded business module assembly, qualify a bounded initial
adoption scope using the [existing foundation gate](../architecture/implementation-readiness-gates.md#module-foundation-before-business-expansion).
The work includes the actual source inventory and migration, the existing
sandbox-manifest seam, complete nested visibility and direct-parent assembly
checks, curated republication, independent wiring tests, and lifecycle failures.
The current blocked construct inventories and semantic source enforcement are
retained; a passing flat-profile validator is not nested conformance.

The initial envelope states exact artifacts, supported compiler, feature depth,
entry/group counts, process profiles, and compile/runtime budgets. A smaller
qualified envelope may activate without waiting for every 100/500/1,000-entry
research row. Expanding it requires evidence for that larger envelope. Dated
experiments against another upstream pin or a private compiler remain research,
not current consumer qualification or permission to upgrade implicitly.

Foundation work, bounded experiments, migration of existing composition seams,
and corrections to already admitted behavior may proceed. ADR-0103's exact
sandbox admission and the separate first-materialization role gate are preserved.
This reconciliation admits no additional Team, Task, IAM, runtime or deployment
behavior and creates no permanent exemption for an existing handwritten seam.

### Reuse library mechanisms with their actual guarantees

Use the existing Resources capability for acquired-resource composition when an
exact compatible artifact is qualified with the selected baseline. Borrow-only
and pure modules need no resource scope. Additional Resources, Observation or
conformance artifacts must be pinned and qualified at their actual first use;
this record does not infer their versions from Core/Assembly or adopt a dynamic
lifecycle kernel. Host-owned readiness, admission, drain, cleanup and physical
process custody retain their existing owners.

Typed capability ports carry commands and queries. Explicit required, optional
and many relationships represent extension points with owner-defined ordering
and failure behavior. Observation follows replaceable latest state and may
coalesce changes; it cannot replace a durable command, outbox, inbox, approval
history or revocation record. This semantic distinction is not a defect to fix
by turning Observation into another message broker.

Concrete mechanisms already expected to serve Platform and Orchestrator are
designed as narrow libraries from the start under the organization library-first
rule, validated with disposable consumers and a real consumer in the same
delivery. Product rules, aggregates, persistence and transactions remain with
their owners. Platform uses Orchestrator APIs/SDKs rather than implementing a
second collaboration or execution engine. Standalone operation requires no
commercial Platform endpoint or private package registry.

### Retained collaboration and open research

ADR-0111 remains the accepted human/AI collaboration and terminology policy:
multiple human Team memberships, equal Task executors, one Work lifecycle,
multiple Task views, Workspace in the UI and Execution Directory for the
filesystem resource. Exact tactical contracts remain with their open decisions.
Assignment does not grant access, start an Agent, or approve a dangerous action.

Keycloak plus OpenFGA remains provisional under OD-012. The four research reports
retain their dated comparisons and evidence limits. This reconciliation does not
select corporate authentication roots, local authority, role templates, graph
consistency, detailed approvals, or cross-organization federation. Those choices
must not be accepted merely to remove a merge conflict.

## Consequences

- One exact module baseline governs current implementation guidance, while the
  owner's broader mandatory scope and foundation requirement remain explicit.
- Historical ADR-0110, its research and immutable digest are retained; only its
  lifecycle points to this successor. ADR-0113/0114/0115 bodies remain unchanged.
- Current architecture and navigation are consistent with separate service roles,
  native PostgreSQL and Fully Local V1; the old monolith/SQLite/future-local
  snapshot is not restored.
- Existing package, source, lifecycle, security and release gates still require
  real evidence. Documentation integration is not module or IAM implementation.
- Platform keeps its own exact adoption and proposed integration contracts;
  referencing this decision does not silently migrate that repository's profile.

## Rejected alternatives

- Keep both Consumer Module Standard pins current: leaves implementers with
  contradictory authoring and compatibility instructions.
- Silently upgrade the canonical package pair to match later research: skips
  exact artifact and real-consumer qualification.
- Retain broader mandatory scope only in research: loses the owner's confirmed
  no-competing-framework requirement outside Host/context package families.
- Rewrite accepted ADR bodies or import unrelated workflow-engine work: destroys
  provenance and expands this reconciliation beyond its owning decisions.
- Require every future scale and dynamic capability before a useful slice:
  replaces a bounded foundation with an unbounded platform prerequisite.
