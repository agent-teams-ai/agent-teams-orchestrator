---
id: ADR-0040
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/composition
summary: Compose each bounded context through an independent private Awilix container while keeping features and public APIs container-agnostic.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0007
  - ADR-0030
  - architecture.composition
  - architecture.dependency-rules
  - architecture.feature-module-standard
---

# ADR-0040: Context-Private Awilix Containers

## Context

The orchestrator will contain multiple large bounded contexts and more than one
Host profile. Manual dependency wiring alone will become repetitive, while one
process-global container would expose every registration to every context and
create a large collision-prone service namespace. A container per feature or per
technical package would confuse source ownership with runtime lifecycle and add
unnecessary scopes and disposal paths.

The composition mechanism must not enter domain or application code, become a
service locator, or weaken package and Published Language boundaries.

## Decision

Use Awilix as an adapter-local composition mechanism. Every materialized bounded
context owns one independent private container with no parent container or fallback
to another context. The Host is the lifecycle owner and supplies each context with
an explicit typed whitelist of shared platform resources and allowed context APIs.

Features do not own containers. A feature exports typed factories and a narrow
module API. Context composition registers those factories and adapters in the
context-private container. SDK, contract, integration, platform, testing, and
tooling packages do not receive containers merely because they are packages; they
use typed factories unless they own an independent runtime lifecycle that is
accepted separately.

Awilix imports, containers, registrations, scopes, resolution, and cradle types are
allowed only under `composition/**`. Domain, application, contracts, adapters, and
public feature modules remain unaware of Awilix. No generic `ContainerPort` or
container abstraction is introduced.

Context containers use:

- `strict: true`;
- explicit typed registrations;
- PROXY injection with narrow destructured dependency types;
- one child scope per inbound command, query, event delivery, or Temporal activity
  when scoped resources are required;
- explicit scope disposal;
- explicit startup and reverse-order shutdown owned by lifecycle code.

Filesystem auto-loading, decorator metadata, parent containers, raw cradle
exposure, resolution from business code, and async external side effects during
dependency resolution are prohibited. External connections start through explicit
lifecycle steps after the graph has been constructed.

The Host receives only a typed context handle containing the context's public API,
health, start, and stop capabilities. Contexts collaborate through consumer-owned
ports, Published Language adapters, or integration events. They never resolve a
dependency from another context's container.

## Consequences

- Runtime composition reinforces bounded-context isolation without changing domain
  models or package contracts.
- Registration names and scoped lifetimes remain local to one context.
- A context can be extracted into another process without redesigning its feature
  factories or public API.
- Host bootstrap and lifecycle coordination are more explicit than with one global
  container.
- Shared platform resources need clear ownership because context containers borrow
  but do not dispose them.
- Awilix can be replaced by changing composition code only.

## Rejected alternatives

- One process-global container containing every context registration.
- A parent-child container hierarchy across bounded contexts.
- One container per feature or every workspace package.
- Decorator-driven Inversify, Nest, TSyringe, or TypeDI injection in application
  classes.
- Manual factories only for the entire future Host graph.
