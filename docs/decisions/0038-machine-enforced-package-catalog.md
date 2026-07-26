---
id: ADR-0038
type: adr
status: accepted
owner: architecture/tooling
summary: Reserve package identities in a catalog and materialize code only after the owning architecture document is accepted.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0007
  - ADR-0032
  - architecture.context-map
  - architecture.dependency-rules
  - architecture.feature-module-standard
---

# ADR-0038: Machine-Enforced Package Catalog

## Context

The target context map and package roles must be visible to agents before code is
created. Empty packages would make proposed bounded contexts appear accepted,
while documentation alone cannot stop an agent from adding `packages/shared`,
`packages/core`, or another uncataloged ownership boundary.

The repository needs one default-deny topology gate without duplicating domain
acceptance status across configuration files.

## Decision

Maintain `architecture/package-catalog.yaml` as the machine-readable registry of
reserved production package IDs, roles, paths, package names, and owning document
IDs.

The catalog does not own lifecycle status. The referenced ADR, architecture
document, or bounded-context dossier remains authoritative. A catalog entry whose
owner is proposed reserves its canonical name and path but cannot contain
production files. Materialization requires an `accepted` or `active` owner.

Every materialized package under `apps/**` or `packages/**` must:

- have an exact catalog entry;
- use the cataloged package name and role;
- declare the owner document in package metadata;
- include a TypeScript configuration;
- expose explicit package exports when it is a library;
- avoid prohibited root dumping grounds and uncataloged source.
- declare only cataloged internal dependencies allowed by package role.

A bounded-context package additionally requires an accepted bounded-context
dossier. Proposed contexts remain documentation-only. Adding a new catalog entry
is an explicit architecture change; it does not itself accept the owner.

CI runs package-topology validation before dependency linting. Conformance fixtures
prove that a proposed context can reserve a path, cannot materialize code, an
accepted context can materialize a valid package, and an uncataloged package is
rejected.

The package scaffolder reads this catalog and cannot invent a package, role, path,
or owner. It refuses proposed owners and existing targets, writes package boundary
files atomically, and never generates ceremonial DDD artifacts. The accepted first
feature slice is added deliberately in the same change. A library package without
at least one feature slice remains CI-invalid.

## Consequences

- Agents see planned package identities without empty code structures.
- Unknown `shared`, `core`, or arbitrary context packages fail CI.
- Context acceptance remains DRY in the domain dossier.
- Platform, integration, SDK, testing, and app packages receive the same ownership
  discipline.
- Package-level export and dependency rules can become stricter as real packages
  supply conformance cases.

## Rejected alternatives

- Precreate every proposed bounded-context package.
- Use directory naming conventions without machine validation.
- Duplicate context lifecycle status in the catalog.
- Allow generators to create uncataloged package identities.
