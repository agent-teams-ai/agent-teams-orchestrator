# ADR-0002: Bounded-Context Packages and Feature-Owned Slices

Status: **Accepted**

## Context

Layer-first repositories tend to mix unrelated features inside global `services`,
`models`, and `adapters` directories. One package per small use case creates a
different form of fragmentation.

## Decision

Use a pnpm workspace. Each business bounded context is a workspace package. Each
package contains cohesive feature-owned vertical slices, and each feature owns its
contracts, domain, application, adapters, composition, and tests.

Platform adapters and generated clients use separate workspace packages.

## Consequences

- Package exports and dependency tests provide hard boundaries.
- Related domain concepts remain close together.
- Features can be promoted to packages when independent ownership is justified.
- Empty ceremonial folders and broad `shared` business packages are prohibited.
- The workspace adds build and dependency-management overhead in exchange for
  explicit architecture.

## Rejected alternatives

- One global folder per technical layer.
- One npm package per endpoint or use case.
- A large shared package containing cross-context business logic.
