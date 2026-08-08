---
id: ADR-0041
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: engineering/tooling
summary: Add dependency catalogs, structural AST rules, dead-code analysis, API reports, and packed-package validation in evidence-driven stages.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0032
  - ADR-0036
  - ADR-0038
  - ADR-0039
  - architecture.repository-tooling
---

# ADR-0041: Deterministic Repository Guardrails

## Context

Architecture documentation helps contributors reason about the system but cannot
stop an agent from selecting a different dependency version, using a container as
a service locator, bypassing a public entrypoint, leaking an infrastructure API
into domain code, or accidentally changing a published package surface.

The repository needs immediate, local, deterministic diagnostics. Adding several
overlapping linters would create conflicting authorities and noisy CI, so every
tool must own a distinct failure class and prove its rules with fixtures.

## Decision

Adopt the following staged guardrail capabilities:

1. pnpm catalogs own reusable external dependency versions. Workspace packages use
   `catalog:` references and internal packages use `workspace:`. Strict catalog
   mode constrains package-manager operations, while a repository validator also
   rejects direct versions introduced by manual manifest edits. Named catalogs
   require an accepted compatibility reason, such as the isolated TypeScript 6
   tooling lane.
2. ast-grep owns repository-specific structural TypeScript and TSX rules that
   cannot be expressed reliably as import boundaries. It starts with Awilix
   composition containment and domain-purity patterns after corresponding source
   exists.
3. Knip owns unused file, export, dependency, binary, and catalog-entry analysis
   after the first vertical slice.
4. API Extractor owns reviewed TypeScript API reports for publishable packages
   before their first release.
5. publint and Are The Types Wrong validate the packed npm artifact and its runtime
   and type export matrix before the first SDK release.

Every ast-grep rule requires:

- an accepted architecture invariant;
- valid and invalid fixtures;
- a narrow file scope;
- a deterministic diagnostic with a remediation hint;
- an advisory observation period before it becomes blocking;
- a documented, narrow suppression when no structural rule can model a valid case.

Generic style, import graph, dead code, wire compatibility, and package publication
remain owned by their existing specialized tools. ast-grep does not duplicate
Oxlint, dependency-cruiser, Knip, Buf, API Extractor, publint, or Are The Types
Wrong.

Exact dependency versions are pinned through the catalog. Tool upgrades include
their conformance fixtures and cannot silently change accepted diagnostics.

## Consequences

- Agents receive fast errors close to the invalid edit rather than architecture
  feedback only during review.
- Dependency and public API drift become visible and reviewable.
- The repository carries more tooling stages, but each has one declared owner.
- Structural rules must be maintained as accepted code shapes evolve.
- New rule ideas cannot become blocking based on pattern plausibility alone.

## Rejected alternatives

- Depend on documentation and code review alone.
- Use one broad scanner as the authority for every failure class.
- Permit direct dependency versions in arbitrary workspace packages.
- Generate API documentation without checking reviewed API reports or packed
  artifacts.
- Make every experimental ast-grep rule blocking immediately.
