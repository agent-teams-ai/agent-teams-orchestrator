---
id: ADR-0054
type: adr
status: accepted
owner: architecture/domain
summary: Use LikeC4 as the canonical machine-readable topology for strategic context relationships and integration boundaries.
approved_by: product-owner
accepted_at: 2026-07-27
related:
  - ADR-0042
  - architecture.context-map
  - architecture.machine-readable-model
  - OD-011
---

# ADR-0054: LikeC4 Strategic Relationship Model

## Context

The strategic context map must grow beyond a hand-maintained Mermaid diagram
without becoming a second registry for bounded-context status, domain language,
or package ownership. Broken references and missing relationship ownership must
fail deterministically, and agents need an explorable model rather than another
large prose table.

## Decision

Pin LikeC4 `1.59.2` as a development tool and keep its source under
`architecture/likec4/`. LikeC4 owns the exact graph of strategic bounded contexts,
integration modules, external systems, and directed relationships.
The pnpm build-script allowlist permits only LikeC4's pinned `esbuild` dependency;
no generated renderer enters product runtime packages.

Every bounded-context element references the corresponding package catalog ID
and dossier document ID. Every relationship declares a title, integration style,
authority statement, and relationship status. A repository validator runs LikeC4
semantic validation, exports the computed model to a temporary file, and checks
it against `architecture/package-catalog.yaml`.

The model does not own Ubiquitous Language, invariants, aggregate design,
contract schemas, or boundary acceptance. Those remain in context dossiers,
current architecture, machine-readable contracts, open decisions, and ADRs.
Generated JSON, images, and portals are disposable derived views and are not
committed as authority.

OD-011 remains open because a structurally valid model does not prove that domain
discovery has found the correct bounded contexts.

## Consequences

- Relationship references and required metadata become machine-verifiable.
- The package catalog and LikeC4 model cannot silently diverge on bounded-context
  identity or owning dossier.
- Contributors can preview the model locally without maintaining a duplicate
  Mermaid graph.
- LikeC4 and its rendering dependencies remain outside product runtime code.
- Relationship semantics still require domain evidence and contract design.

## Rejected alternatives

- Keep Mermaid as the exact relationship source. It validates syntax but not
  package identity or relationship metadata.
- Make LikeC4 the authority for all DDD semantics and lifecycle. That would
  duplicate richer governed documents in a diagram DSL.
- Commit generated exports. Derived files would create review noise and drift.
