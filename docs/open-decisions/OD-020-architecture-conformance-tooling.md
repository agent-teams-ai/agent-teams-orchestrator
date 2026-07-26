---
id: OD-020
type: open-decision
status: resolved
owner: engineering/tooling
summary: Select the TypeScript 7 compatible architecture dependency and boundary enforcement stack.
related:
  - ADR-0031
  - ADR-0032
  - architecture.dependency-rules
  - architecture.feature-module-standard
---

# OD-020: Architecture Conformance Tooling

## Decision required

Select the tools and execution tiers that enforce package roles, feature
ownership, dependency direction, deep-import rules, cycles, reachability, and
orphaned modules under the native TypeScript 7 toolchain.

## Constraints

- TypeScript 7 remains the primary compiler and type-checker.
- Fast changed-file checks and complete repository graph checks may use different
  tools but must enforce one versioned rule model.
- A legacy TypeScript dependency is allowed only in an isolated tooling workspace
  under ADR-0031.
- No parser may silently fall back to heuristic JavaScript parsing for TypeScript
  or TSX.
- Product packages cannot import tooling packages or their compiler dependencies.
- Exact versions are pinned and revalidated before installation.

## Candidate direction

Use Oxlint plus `eslint-plugin-boundaries` for fast layer and feature import
checks. Evaluate dependency-cruiser as a slower complete-graph CI gate through an
isolated tooling workspace with its full TypeScript parser and TypeScript 6
available only inside that workspace. The dependency-cruiser SWC parser is not a
candidate while it cannot parse TSX reliably.

Before acceptance, a conformance corpus must cover normal and type-only imports,
dynamic imports, re-exports, path aliases, package exports, workspace symlinks,
TSX text, `.mts` and `.cts`, cycles, cross-feature deep imports, and unresolved
dependencies. Any disagreement with TypeScript 7 resolution is a blocking failure.

## Options

- Wait for dependency-cruiser support for the TypeScript 7 public Compiler API.
- Use the isolated dependency-cruiser plus TypeScript 6 parser after conformance.
- Replace complete-graph checks with another architecture-test library after an
  equivalent capability and maintenance audit.

## Acceptance criteria

- No false dependency edges in the conformance corpus.
- Forbidden paths and cycles fail deterministically.
- Execution time is suitable for the selected local or CI tier.
- The dependency graph contains no production path to TypeScript 6.
- Rule ownership, diagnostics, and upgrade policy are documented.

## Resolution

Resolved by ADR-0032. Oxlint with `eslint-plugin-boundaries` is blocking,
dependency-cruiser uses an isolated TypeScript 6 parser and remains advisory until
the ADR promotion criteria are satisfied, and the conformance corpus is blocking.
