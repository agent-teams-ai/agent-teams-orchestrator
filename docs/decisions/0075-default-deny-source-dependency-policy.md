---
id: ADR-0075
type: adr
status: accepted
owner: engineering/tooling
summary: Require an exact default-deny source dependency policy for every cross-package import.
approved_by: product-owner
accepted_at: 2026-08-01
related:
  - ADR-0032
  - ADR-0038
  - ADR-0041
  - architecture.dependency-rules
---

# ADR-0075: Default-Deny Source Dependency Policy

## Context

The package-role matrix prevents broad direction violations, but still permits
any bounded-context package to depend on any other bounded-context package. That
cannot prove consumer ownership, ACL placement, or use of a narrow published
surface. Relative imports and broad root exports can also bypass the intended
context boundary.

The semantic LikeC4 context map is not an import allowlist: an information-flow
relationship may be asynchronous and does not automatically authorize source
coupling.

## Decision

Adopt `architecture/source-dependency-policy.yaml` as the canonical, exact,
default-deny list of cross-package source dependencies.

Every edge names one consumer package, one provider package, and the exact
provider export subpaths it may import. A manifest dependency and an import must
both match an edge. Role direction, package exports, and layer rules remain
additional gates rather than being replaced by this policy.

The following rules apply everywhere:

- no cross-package dependency is allowed by role alone;
- cross-package imports use package names and exact exported subpaths;
- package-root, wildcard, `src/**`, absolute, `file:`, and cross-package relative
  imports are forbidden;
- package-local import aliases cannot target another package;
- TypeScript path mappings cannot act as architecture boundaries;
- type-only, dynamic, re-exported, generated, test, and composition imports are
  subject to the same policy, with explicit test edges where required;
- source dependency cycles are forbidden;
- domain and application code never import another context directly; a
  consumer-owned port and adapter or an integration event is required;
- a direct in-process adapter may import only the provider's exact Published
  Language surface;
- application composition imports an exact `./module` surface, never feature
  internals.

Feature-to-feature dependencies remain context-private and will use colocated
feature policy once the first context package is materialized. They cannot cross
the package boundary.

## Consequences

- Adding a new dependency requires an explicit architecture-policy change with a
  reviewable consumer, provider, and surface.
- Initial policy has no speculative edges; first-slice packages add only the
  relationships their accepted design requires.
- The policy and conformance fixtures add tooling work before production code,
  but prevent boundary drift while the graph is still small.

## Rejected alternatives

- Continue using only the role-level dependency matrix.
- Generate source dependencies automatically from LikeC4 information flow.
- Create one npm package per feature solely to obtain package encapsulation.
- Rely on review or TypeScript path aliases to prevent internal imports.
