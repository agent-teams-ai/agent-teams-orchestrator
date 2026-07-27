---
id: architecture.machine-readable-model
type: architecture
status: accepted
owner: architecture/domain
summary: Authority, structure, maintenance workflow, and deterministic validation for the machine-readable architecture model.
related:
  - ADR-0054
  - architecture.context-map
  - architecture.repository-tooling
code_anchors:
  - pattern: architecture/likec4/**
    enforcement: advisory
  - pattern: scripts/architecture/validate-architecture-model*
    enforcement: advisory
---

# Machine-Readable Architecture Model

## Purpose

The LikeC4 model makes strategic context relationships explorable and
machine-verifiable. It is a precise graph, not a replacement for Full DDD
discovery or current architecture documentation.

## Authority split

| Concern | Authority |
|---|---|
| Exact elements and directed relationships | `architecture/likec4/` |
| Bounded-context package identity | `architecture/package-catalog.yaml` |
| Boundary rationale and acceptance | ADRs and open decisions |
| Ubiquitous Language, invariants, aggregates, and concurrency | Owning context dossier |
| Wire shape and compatibility | Owning machine-readable contract |
| Cross-context relationship rules | [Strategic context map](context-map.md) |

The validator cross-checks sources where exact identity must agree. It does not
copy domain semantics into the model.

## Model structure

```text
architecture/likec4/
  likec4.config.json   project identity
  specification.c4    allowed element and relationship kinds
  model.c4            canonical elements and directed relationships
  views.c4            derived human navigation views
```

Bounded-context elements declare `package_id` and `document_id`. Integration
modules and external systems declare their owning document. Relationships declare
`integration_style`, `authority`, and `status`.

Relationship status describes the readiness of that relationship contract. It
must not be interpreted as the lifecycle status of either bounded context.

## Change workflow

When a strategic relationship changes:

1. identify the upstream and downstream owners;
2. update the LikeC4 relationship and its required metadata;
3. update the owning dossier, contract, open decision, or ADR when semantics
   changed;
4. update the package catalog only when a package identity or reservation changed;
5. run the model and documentation gates.

Preview the model locally with:

```bash
pnpm architecture:model:preview
```

The preview server is a development view only.

## Validation

`pnpm architecture:model:check` performs:

- canonical LikeC4 source-format validation;
- LikeC4 syntax and semantic validation without layout coupling;
- export of one named computed project to a temporary file;
- exact bounded-context coverage against the package catalog;
- package ID and dossier ID consistency;
- required relationship ownership metadata;
- presence of the strategic context view.

`pnpm architecture:model:test` proves valid and invalid behavior with isolated
fixtures. Both run inside `pnpm architecture:check`; the model consistency check
also runs inside `pnpm docs:check`.

## Generated artifacts

LikeC4 JSON, images, static sites, layouts, and search indexes are disposable
views. Do not commit them as architecture authority. Regenerate them from the
reviewed DSL whenever a human or tool needs a rendered form.
