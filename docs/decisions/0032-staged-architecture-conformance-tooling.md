---
id: ADR-0032
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: engineering/tooling
summary: Enforce fast source boundaries with Oxlint and stage dependency-cruiser as an isolated advisory graph gate.
related:
  - ADR-0031
  - architecture.dependency-rules
  - architecture.feature-module-standard
  - OD-020
---

# ADR-0032: Staged Architecture Conformance Tooling

## Context

The repository needs mechanical Clean Architecture, Full DDD, package, and feature
boundaries before production packages grow. Native TypeScript 7 is the primary
compiler, while dependency-cruiser 18.1.0 still requires the TypeScript 6
programmatic Compiler API.

Oxlint can execute `eslint-plugin-boundaries` quickly enough for every pull request
but does not replace complete dependency-graph analysis. Dependency-cruiser's
experimental SWC parser cannot parse TSX reliably in the accepted version, so it
cannot be used as the compatibility bridge.

## Decision

Use a staged conformance stack:

1. TypeScript 7 remains the blocking primary type-checker.
2. Oxlint with `eslint-plugin-boundaries` is a blocking pull-request gate for
   source dependency direction.
3. dependency-cruiser runs from an isolated tooling workspace with an exact
   TypeScript 6 dependency and its full TypeScript parser.
4. The production dependency-cruiser graph is advisory initially.
5. A blocking tooling-conformance suite proves both accepted and rejected fixture
   behavior on every pull request.

The conformance corpus covers ordinary, type-only, dynamic, aliased, and re-export
dependencies, TSX text containing the word `import`, `.mts` and `.cts` parsing, and
cycles. Package-export and workspace-symlink fixtures are added before production
package graph findings become blocking.

The TypeScript 6 dependency and dependency-cruiser cannot enter production
packages, build artifacts, SDKs, or the primary compiler configuration. Exact
versions are pinned. Tooling disagreements are visible and cannot silently fall
back to heuristic parsing.

Promoting the complete graph gate from advisory to blocking requires:

- real production package roots;
- package-export and workspace-link fixture coverage;
- stable diagnostics on the repository graph;
- an explicit baseline review with no unowned violations.

## Consequences

- Fast, high-signal layer violations block pull requests immediately.
- Complete graph analysis can mature without controlling the product compiler.
- CI carries a second TypeScript version only inside one tooling package.
- Until promotion, cycles in production code must also be caught by package
  references, tests, or review; dependency-cruiser reports them but does not fail
  the build.

## Rejected alternatives

- Downgrade the repository to TypeScript 6.
- Run dependency-cruiser against TypeScript 7 and accept Acorn fallback.
- Use dependency-cruiser's experimental SWC parser despite failing TSX fixtures.
- Treat path aliases as architecture boundaries without package exports and graph
  validation.
