---
name: docs-authoring
description: Use when creating, changing, reorganizing, or reviewing governed documentation in this repository.
---

# Documentation Authoring

Follow `agent-teams.docs-protocol/v1` in this exact order.

1. Read `docs/README.md`, the nearest index, and
   `docs/standards/documentation.md#authority-by-knowledge-type`.
2. Find authority with `pnpm docs:find -- --text query`; until registry cutover,
   use the documented legacy query compatibility route for the same search.
3. Update existing authority; never create a competing source of truth.
4. Otherwise preview with `pnpm docs:new -- --type TYPE --id ID --dry-run`.
5. Use only profile-declared type, owner, placement, template, and initial status.
6. Put known relations in `related`; every `blocked_by` ID also goes in `related`.
7. Add narrow repository-relative `code_anchors` for implementation review.
8. Apply with `pnpm docs:new -- --type TYPE --id ID --apply` after review.
9. Never hand-copy frontmatter, overwrite a document, or edit a transaction.
10. Manually add the reported index and link exactly as instructed.
11. Run `pnpm docs:impact`, then `pnpm docs:check` for protocol evidence.
12. Run `pnpm docs:repository:check` for repository semantics and prose.
13. Run `pnpm architecture:check` when architecture authority or topology moves.

New ADRs remain proposed without explicit product-owner approval. LikeC4 owns
relationship topology. Recovery qualification uses disposable fixtures only.
