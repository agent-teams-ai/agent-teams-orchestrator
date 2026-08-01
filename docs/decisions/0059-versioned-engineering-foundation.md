---
id: ADR-0059
type: adr
status: accepted
owner: engineering/tooling
summary: Distribute shared engineering policy as an exact dev-only package with explicit local-link and registry modes.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - ADR-0032
  - ADR-0038
  - ADR-0041
  - ADR-0053
  - ADR-0056
  - architecture.repository-tooling
---

# ADR-0059: Versioned Engineering Foundation

## Context

The orchestrator, Agent Runtime, and future clients need the same fast lint,
documentation, architecture-conformance, package-policy, and repository workflow
foundation. Copying complete configurations and validators into every repository
would create divergent rules and repetitive upgrades. Making all repositories one
workspace would instead couple their release, access, and product lifecycles.

Local foundation development must provide immediate feedback across sibling
repositories without allowing an unnoticed symlink, dirty checkout, or unpublished
artifact to enter CI or a release.

## Decision

Reusable engineering tooling is published from a dedicated public foundation
repository as the exact dev dependency
`@agent-teams/engineering-foundation`. Product and runtime source cannot import it.
The initial registry is the public npm registry; consuming GitHub npm Packages
must not require contributors to configure a GitHub token.

The foundation owns only reusable engineering capabilities:

- tool presets, configuration builders, schemas, and generic validators;
- reusable documentation and architecture-conformance engines;
- tested scaffolding primitives and conformance fixtures;
- shared CI action implementations and update metadata.

Each consuming repository remains authoritative for its business architecture,
package catalog, bounded-context map, dependency permissions, security
classifications, project-specific rules, fixtures, and accepted ADRs. A small
repository adapter may supply those facts to the foundation. The foundation
cannot infer or redefine them.

Normal development and CI use the exact version recorded in `package.json` and
the committed lockfile. Renovate proposes version updates through ordinary pull
requests; no consumer follows an unpinned branch or floating package range.

Sibling-repository development uses only repository wrappers:

```text
foundation:check
foundation:attach <absolute-path>
foundation:status
foundation:detach
foundation:assert-registry
foundation:pack-test
```

`foundation:check` executes every capability declared by strict
`foundation.config.yaml` and returns one deterministic aggregate report. The
first blocking capability is `workspace.dependency-declarations`; consumer-owned
policy input remains in `architecture/foundation/`.

Raw `pnpm link` is an implementation detail, not the documented agent workflow.
`foundation:attach` verifies package identity, compatible foundation metadata,
dependencies, and build output before linking. It changes neither the consumer
manifest nor lockfile and writes only an ignored local-state record containing
the source path, package version, and Git commit. `foundation:status` resolves
the installed package real path and reports `LOCAL` or `REGISTRY` plus version
and commit evidence.

`foundation:detach` removes the link and restores the exact lockfile installation.
CI, packaging, and release entrypoints run `foundation:assert-registry` and fail
when a local link or local-state record exists. A linked package that exports
compiled output runs its own build watch. `foundation:pack-test` installs the
generated package tarball into an isolated consumer fixture so publication
contents, exports, dependencies, and lifecycle scripts are tested independently
from the symlink path.

Foundation releases use immutable semantic versions and release notes. A breaking
rule or migration ships with a versioned migration note and is adopted per
repository through review and its complete local gates.

## Consequences

- Common tooling has one implementation and one release stream.
- Product-specific architecture remains local and cannot leak into a generic
  foundation package.
- Local cross-repository development is fast but visibly different from the
  reproducible registry mode.
- Every repository retains a thin adapter and project-specific fixtures; removing
  that small duplication would require moving product ownership into foundation.
- Foundation upgrades are explicit pull requests and may progress independently
  across repositories.

## Rejected alternatives

- Copy complete validators and configurations into every repository.
- Import foundation code from production packages.
- Use floating Git branches, workspace paths, or `latest` as committed
  dependencies.
- Make a local symlink the default or allow CI and releases to consume one.
- Require GitHub Packages authentication for a public engineering dependency.
- Put orchestrator or Agent Runtime domain rules in the shared foundation.
