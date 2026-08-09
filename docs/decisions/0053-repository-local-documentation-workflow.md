---
id: ADR-0053
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: engineering/tooling
summary: Govern documentation changes with one repository-local authoring Skill and machine-validated code impact anchors.
approved_by: product-owner
accepted_at: 2026-07-27
related:
  - ADR-0041
  - architecture.repository-tooling
  - standard.documentation
---

# ADR-0053: Repository-Local Documentation Workflow

## Context

The documentation set will grow with bounded contexts, contracts, operations,
and implementation packages. Navigation prose alone cannot reliably remind an
agent which authority to update when code changes, while an AI-specific index can
silently become another source of truth.

The repository needs one portable workflow for agents and a deterministic way to
report which governed documents are affected by changed implementation or
machine-readable sources.

## Decision

Maintain one canonical Agent Skill at `.agents/skills/docs-authoring/`. The Skill
routes agents through the documentation index, authority matrix, metadata query,
templates, open decisions, impact analysis, and quality gates. It provides a
workflow only; architecture documents, ADRs, context dossiers, contracts, and
runbooks retain authority.

Allow governed documents to declare repository-relative `code_anchors`. Every
anchor has an explicit `advisory` or `required` enforcement level. The
documentation validator rejects unsafe or stale patterns. `pnpm docs:impact`
matches changed paths against these anchors, reports affected documents, and in
strict mode fails only when a required impacted document was not changed.

Skill structure, metadata, size, and local links are validated with positive and
negative fixtures. The documentation CI runs Skill validation and pull-request
impact analysis. Code anchors never target governed prose or Skills and never
replace tests, contract compatibility, or human review.

## Consequences

- Agents get one concise, repository-versioned authoring workflow.
- Code-to-document review impact becomes queryable without claiming that every
  source change requires prose churn.
- Required anchors can be promoted narrowly after an advisory baseline proves
  that they do not create false blocking failures.
- The repository owns a small validator rather than depending on a weak generic
  Skill checker for semantic quality.
- Contributors must maintain anchors when source locations change.

## Rejected alternatives

- Duplicate the Skill for each agent product. Copies would drift and create
  conflicting workflows.
- Infer documentation impact only from Git history or embeddings. Results would
  be nondeterministic and could not provide a blocking guarantee.
- Make every anchor required immediately. Early broad patterns would encourage
  meaningless documentation edits and noisy CI failures.
