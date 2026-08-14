---
name: docs-authoring
description: Use when creating, changing, reorganizing, or reviewing governed documentation in this repository.
---

# Documentation Authoring

Follow `agent-teams.docs-protocol/v1`. The machine-readable authoring authority is
`architecture/foundation/document-authoring.yaml`; do not duplicate its types,
owners, placement, templates, or reachability rules here.

1. Read `docs/README.md`, the nearest index, and
   `docs/standards/documentation.md#authority-by-knowledge-type`.
2. Find the existing authority with `pnpm docs:query`; prefer stable IDs,
   relations, owner, type, and status over filenames.
3. Update that authority, or inspect `pnpm docs:new -- --help` before creating a
   governed document. Preview first and never hand-copy frontmatter.
4. Add the exact link reported by the authoring command to the reported index.
   Preserve unresolved choices with `blocked_by` and use `code_anchors` for
   implementation review routing.
5. Run `pnpm docs:impact`, then `pnpm docs:check`. Also run
   `pnpm architecture:check` when topology or architecture authority changes.

New ADRs remain proposed until explicit product-owner approval. LikeC4 owns
relationship topology. Generated indexes and summaries are disposable views.
Mutation and recovery qualification runs only in disposable fixture copies.
