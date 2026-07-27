---
name: docs-authoring
description: Use when creating, changing, reorganizing, or reviewing architecture, domain, contract, decision, runbook, research, or feature documentation in this repository.
---

# Documentation Authoring

Use this workflow to change governed project knowledge without creating a second
source of truth.

## Workflow

1. Read `docs/README.md` and the nearest directory index.
2. Identify the authoritative artifact type with
   `docs/standards/documentation.md#authority-by-knowledge-type`.
3. Discover existing sources with `pnpm docs:query`. Search stable document IDs
   and related metadata before searching only by filename.
4. Check related open decisions. Do not implement or document an unresolved
   choice as accepted architecture.
5. Update the existing authority. For a new artifact, start from the matching
   file under `docs/templates/`.
6. Add or update `code_anchors` when a document must be reviewed after matching
   implementation or machine-readable sources change.
7. Run `pnpm docs:impact` while iterating. Use `--strict` when validating a
   required anchor locally.
8. If bounded-context relationships change, update `architecture/likec4/` and
   the owning context dossier or ADR together.
9. Run `pnpm docs:check`. Run `pnpm architecture:check` when the change affects
   context topology, package topology, dependency rules, or architecture tools.

## Invariants

- A repo-local Skill is workflow guidance, never architecture authority.
- New ADRs start as proposed. Record acceptance only after explicit
  product-owner approval.
- LikeC4 owns exact context relationship topology, not domain semantics or
  bounded-context acceptance.
- Generated LikeC4 exports, search indexes, and summaries are disposable views.
- Code anchors express review impact. They do not replace tests, ownership, or
  compatibility checks.
- Update indexes and relationships in the same change as the governed document.
