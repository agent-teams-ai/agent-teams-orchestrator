---
name: docs-authoring
description: Use when creating, changing, reorganizing, or reviewing architecture, domain, contract, decision, runbook, research, or feature documentation in this repository.
---

# Documentation Authoring

Use this workflow to change governed project knowledge without creating a second
source of truth.

## Deterministic workflow

1. **Find.** Read `docs/README.md` and the nearest directory index. Select the
   authority with
   `docs/standards/documentation.md#authority-by-knowledge-type`, then discover
   existing sources with `pnpm docs:query`. Search stable IDs, relations, owner,
   type, and status before searching only by filename.
2. **Update or create.** Update the existing authority when it exists. Otherwise
   run `pnpm docs:new -- --help` and create the governed artifact through that
   command. It uses the canonical `docs/templates/` skeleton, validates identity,
   owner, placement, relations, and code anchors, and never overwrites a file.
3. **Connect.** Link the artifact from its nearest index. Check related open
   decisions and preserve unresolved choices as blockers. Add `code_anchors`
   when matching implementation or machine-readable source changes must route a
   documentation review.
4. **Synchronize.** If bounded-context relationships change, update
   `architecture/likec4/` and the owning context dossier or ADR together. Update
   every authority named by the change-consistency matrix in the documentation
   standard.
5. **Verify.** Run `pnpm docs:impact` while iterating and use `--strict` for a
   required anchor. Run `pnpm docs:check` before completion. Also run
   `pnpm architecture:check` when context topology, package topology, dependency
   rules, or architecture tools change.

## Foundation RC preview

The repository-local `pnpm docs:query` and `pnpm docs:new` commands remain the
canonical agent workflow. Foundation 0.16 RC authoring coexists behind explicit
aliases for qualification:

- `pnpm docs:foundation:find -- <filters>` reads the consumer-owned profile;
- `pnpm docs:foundation:new -- <arguments> --dry-run` previews a plan;
- `pnpm docs:foundation:doctor` inspects transaction state read-only;
- `pnpm docs:foundation:recover` is used only when doctor reports an automatic
  recovery route.

Do not use the RC writer to mutate this repository. Exercise publication and
recovery only in a disposable fixture copied from the real metadata schema,
owner catalog, templates, and authoring profile. A successful preview does not
prove parity with the canonical writer's metadata, identity, placement, index,
template, or validator contracts.

## Invariants

- A repo-local Skill is workflow guidance, never architecture authority.
- New ADRs start as proposed. Record acceptance only after explicit
  product-owner approval.
- LikeC4 owns exact context relationship topology, not domain semantics or
  bounded-context acceptance.
- Generated LikeC4 exports, search indexes, and summaries are disposable views.
- Code anchors express review impact. They do not replace tests, ownership, or
  compatibility checks.
- `docs:new` scaffolds from the template authority but never invents domain
  answers, acceptance, index prose, or relationships.
- Update indexes and relationships in the same change as the governed document.
