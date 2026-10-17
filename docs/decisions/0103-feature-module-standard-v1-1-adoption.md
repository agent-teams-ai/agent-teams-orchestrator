---
id: ADR-0103
type: adr
status: accepted
supersedes:
  - ADR-0098
owner: architecture
summary: Adopt the immutable Feature Module Standard v1.1 pin with explicit nested-feature ownership and construct activation coverage.
approved_by: product-owner
accepted_at: 2026-10-17
related:
  - ADR-0104
  - ADR-0105
  - architecture.feature-module-standard
  - architecture.repository-tooling
---

# ADR-0103: Feature Module Standard v1.1 Adoption

## Context

The organization published Feature Module Standard v1.1 with explicit nested
feature ownership, direct-parent assembly, republication, dependency graph
roles, and composition contracts. The product owner requested adoption of the
current standard alongside Get Modular 0.5 static composition. Keeping the v1
pin would leave the new composition and ownership rules outside the local
adoption profile.

Version 1.1 is a compatible minor. Its additional requirements apply where a
consumer declares the new constructs. The existing Orchestrator source and
enforcement operate on flat features. Installed Engineering Foundation 1.7.2
also accepts only the flat v1 quality topology format. A version change must
therefore distinguish the accepted architecture from executable support for
the new constructs and preserve the existing coverage obligations.

## Decision

### Immutable adoption and local authority

Adopt `agent-teams.feature-module-standard` version `v1.1` from
`agent-teams-ai/.github/docs/architecture/feature-module-standard/v1.1.md`, Git
blob `bd949a9a670862fea851a7791fce772fdef3b4fc`, SHA-256
`cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c`.
The inspected organization commit is
`f5653f5630057524a4ee44e50c16e138442a9b42`.

This ADR supersedes ADR-0098's version adoption. The stable local authority
remains `architecture.feature-module-standard`, backed by
`architecture/feature-module-standard-profile.json`. Production roots remain
`apps/**` and `packages/**`; package ownership, materialization, source import
policy, TypeScript publication, and stricter local rules retain their existing
owners. There are no deviations from v1.1.

ADR-0104 owns selection and qualification of the GM 0.5 composition pair.
ADR-0105 proposes portable service boundaries and Moleculer placement. Neither an individual
feature nor a GM entry becomes a deployable service by default. The standard
continues to separate feature, package, bounded-context, composition, and
deployment decisions.

### New-construct activation

Accept the v1.1 nested feature and composition contract semantics in the local
profile. Record `sub_features`, `republications`, and `composition_contracts`
as empty inventories with activation `blocked-until-enforced`.

The profile gate rejects nonempty inventories or another activation value and
checks physical production source for nested feature roots and conventional
composition contract files at feature and Host/package `src` roots. This prevents
materializing those forms
without updating enforcement, even if their profile entries are omitted.
The gate does not claim a full parser for visibility, assembly, republication,
or role-sensitive dependency graphs.

The first activation must update the scoped classifiers, inventory, and
enforcement together. Required fixtures must prove parent/subtree visibility,
direct-parent assembly, one-level republication without added behavior, the
acyclic downward/lateral use graph including type-only edges, and the separate
load-time cycle prohibition. Composition contracts remain behavior-free
descriptors and value type declarations used only from composition. Existing
readiness and package materialization gates remain required.

### Bounded Foundation reader projection

Keep `architecture/foundation/quality-feature-topology.json` unchanged as the
historical flat v1 reader input for Engineering Foundation 1.7.2. This is a
reader-format compatibility mapping under the v1.1 primary authority; it does
not adopt a second standard or grant an exception to quality policy.

The projection check requires the exact v1.1 primary binding and the blocked,
empty construct inventories, checks the same physical activation restrictions,
and maps the same production and excluded roots and materialized package
source/test trees. It retains the exact historical v1 binding in the reader
input and rejects drift in either binding or the materialized topology.
Foundation independently rejects unclassified workspace packages. No source
scope, required test identity, typed rule, or materialization gate is removed.

Activating new constructs requires a compatible reader and semantic checks;
it cannot reuse this projection after its preconditions stop holding. Consumer
tests cover installed-reader acceptance, pin drift, nonempty inventories, and
undeclared physical constructs.

### Source evidence

- [Immutable organization v1.1 standard](https://github.com/agent-teams-ai/.github/blob/f5653f5630057524a4ee44e50c16e138442a9b42/docs/architecture/feature-module-standard/v1.1.md)
  owns the compatible minor and construct-specific requirements.
- [Organization publication registry](https://github.com/agent-teams-ai/.github/blob/f5653f5630057524a4ee44e50c16e138442a9b42/governance/feature-module-standard.json)
  records the version, artifact identity, and publication.
- The installed `@agent-teams/engineering-foundation@1.7.2`
  `dist/features/quality-coverage/adapters/profile-input.js` reader accepts the
  v1 identity. The Orchestrator source coverage consumer tests qualify the
  compatibility mapping against that exact installed package.

## Consequences

- Contributors use the current shared ownership vocabulary without copying or
  changing the organization standard in this repository.
- Explicit empty inventories make the present implementation scope reviewable.
  New constructs cannot be advertised as fully enforced from a version pin
  alone.
- Existing flat source, test ownership, and quality coverage remain valid and
  required under the compatible minor.
- Activating nested features or composition contracts requires additional
  classifier and graph work. That cost is visible before production source is
  added rather than deferred behind an unenforced promise.
- The Foundation reader projection has a narrow compatibility lifetime. Its
  prerequisites must remain checked until a compatible reader replaces it.

## Rejected alternatives

- Keep v1 while citing selected v1.1 rules informally. That leaves the stated
  architecture and machine-readable adoption in conflict.
- Accept v1.1 and declare nested semantics fully implemented by existing flat
  checks. Those checks do not prove direct-parent assembly, republication, or
  graph-role semantics.
- Change the Foundation projection label to v1.1 without upgrading its reader.
  The exact installed reader rejects that input.
- Relax Foundation validation, omit source scope, or install an unqualified
  dependency to make the version change pass. The bounded format mapping
  preserves the required protection without changing the published dependency.
- Create a GM module or Moleculer service for every nested directory. Ownership
  hierarchy does not establish an independent wiring or deployment need.
