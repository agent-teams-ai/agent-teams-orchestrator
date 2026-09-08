---
name: docs-authoring
description: Use when creating, changing, reorganizing, or reviewing governed documentation in this repository.
---

# Documentation Authoring

Protocol: `agent-teams.docs-protocol/v1`.

## Required workflow

- Read the current types, owners, placement, metadata, and index policy with `pnpm docs:info`.
- Search first with `pnpm docs:find -- --text query --json`; use `--id ID` for exact authority discovery. Equivalent installed command: `pnpm exec docs-protocol find --consumer . --profile architecture/foundation/docs-protocol.yaml --text query --json`.
- Reuse or relate existing authority instead of creating a competing source.
- Preview with `pnpm docs:new -- --type TYPE --id ID --title TITLE --owner OWNER --summary SUMMARY --dry-run --json`.
- The equivalent installed preview command is `pnpm exec docs-protocol new --consumer . --profile architecture/foundation/docs-protocol.yaml --type TYPE --id ID --title TITLE --owner OWNER --summary SUMMARY --dry-run --json`.
- Review the exact destination, compiled document, metadata, relations, anchors, diagnostics, and returned `planDigest`.
- Apply with `pnpm docs:new -- --type TYPE --id ID --title TITLE --owner OWNER --summary SUMMARY --apply --expect sha256:DIGEST --json` after review. Replace `sha256:DIGEST` with that exact preview digest; keep every authoring input identical. A stale digest requires a fresh preview and review.
- The equivalent installed apply command is `pnpm exec docs-protocol new --consumer . --profile architecture/foundation/docs-protocol.yaml --type TYPE --id ID --title TITLE --owner OWNER --summary SUMMARY --apply --expect sha256:DIGEST --json`.
- Manually update the reported index/link: insert the returned `markdownLink` at the returned `indexPath` when reachability reports `manual-required`. The writer does not edit index prose.
- Inspect the linked authority with `pnpm docs:context -- --id ID --json`. Equivalent installed command: `pnpm exec docs-protocol context --consumer . --profile architecture/foundation/docs-protocol.yaml --id ID --json`. Context is a derived view, not lifecycle approval.
- For edits, preserve canonical frontmatter and sidecar ownership; use the repository's governed review flow rather than bypassing the create-only writer.
- For accepted authority, record supersession explicitly instead of silently rewriting history.
- After the index is current, run `pnpm docs:check`, then `pnpm docs:impact`, then the full consumer gate `pnpm docs:protocol:check` (also exposed as `pnpm docs:repository:check`).
- The equivalent installed portable check is `pnpm exec docs-protocol check --consumer . --profile architecture/foundation/docs-protocol.yaml`; it is only the first step of the consumer gate.
- The full consumer gate retains metadata and relations, all six authoring golden scenarios, local links and reachability, Mermaid, Skill checks, LikeC4, Markdown lint, Vale, CSpell, and code impact. Portable success does not replace these checks.
- Run `pnpm check:changed` during iteration and `pnpm check:fast` before handoff; `pnpm check` is required before opening or merging a pull request.

## Rules

- Never invent owners, types, statuses, paths, or metadata outside `docs:info`.
- If dependencies are absent, use only `pnpm install --frozen-lockfile`; never use npx, dlx, or latest tags.
- Keep preview and apply inputs identical.
- Stop when recovery is required; use `pnpm docs:doctor` before `pnpm docs:recover`.
- Run publication, cancellation, crash, and recovery qualification only in new disposable fixtures. Portable commands do not qualify managed activation; preserve historical lifecycle evidence until trusted replacement authority exists.
- Resolve required anchors and blockers before apply.
- Do not bypass repository scripts or hand-edit transaction evidence.
