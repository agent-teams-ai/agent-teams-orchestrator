---
id: ADR-0094
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture
summary: Fix non-negotiable ownership, authority, transaction, identity, and lifecycle constraints for every future extension system.
approved_by: product-owner
accepted_at: 2026-08-13
related:
  - ADR-0021
  - ADR-0051
  - ADR-0074
  - architecture.extensions
  - architecture.persistence
  - architecture.security
  - OD-034
  - OD-037
---

# ADR-0094: Extension Safety and Ownership Invariants

## Context

The Orchestrator will eventually support built-in, private first-party,
community, and user-supplied implementations behind narrow extension points.
Agent Runtime and future Web or Desktop clients may reuse technical extension
infrastructure while retaining different domain contracts and trust boundaries.

A generic plugin framework can otherwise become a service locator, a second
application layer, an untracked authority path, or a shared data model. These
failures would violate Clean Architecture, SOLID, DDD bounded-context ownership,
and the ability to extract contexts into services.

ADR-0074 still defers public plugin SPI materialization. This decision fixes the
guardrails that every later design must satisfy; it does not select a registry,
module host, lifecycle protocol, or public contract.

## Decision

- There is no global `PluginManager` that resolves arbitrary application
  services. Composition may coordinate installation and lifecycle, but it owns
  no business semantics and is never a service locator.
- Extension code is never invoked inside a database transaction or Unit of Work.
  Durable intent is committed before an external effect. An ambiguous outcome is
  reconciled instead of retried blindly.
- Registration or discovery order never defines priority, ownership, routing, or
  conflict resolution. The consuming feature owns explicit semantics and rejects
  unresolved duplicate providers.
- Manifest permissions are requests, not grants. Effective authority is the
  intersection of declared requirements, installation consent, current product
  authorization and policy, deployment qualification, and runtime enforcement.
- Commercial entitlement, product authorization, and technical capability
  enforcement remain separate decisions. None implies either of the others.
- Logical extension identity, publisher identity, artifact digest, installation
  identity, source incarnation, and active runtime generation are separate.
- Mutable tags such as `latest` never identify an installed or active artifact.
  Installation, activation, rollback, and audit pin immutable digests and
  resolved contract versions.
- A timeout or lost acknowledgement after a potentially accepted effect enters
  reconciliation. Retry requires proven idempotency or authoritative evidence
  that the effect did not occur.
- Uninstall does not implicitly delete user or bounded-context data. Export,
  retention, transfer, and erasure use an explicit owner-controlled disposition
  process.
- A public SPI is not published from one implementation. It requires at least
  two independently exercised implementations, stable ownership, compatibility
  fixtures, and a conformance suite proving substitutability without shared
  internals.

These invariants apply equally to open, private, commercial, community, and
custom extensions. Distribution or publisher ownership does not establish trust.

## Consequences

- Shared extension infrastructure can reuse technical manifests, identities,
  lifecycle protocols, lock files, provenance, and conformance tooling without
  importing Orchestrator, Agent Runtime, or Frontend domain models.
- Every domain-specific extension point remains narrow and consumer-owned in its
  product repository.
- Lifecycle coordination, registry storage, hot update, isolation, and
  marketplace governance remain open implementation decisions constrained by
  these rules.
- Some extension effects require post-commit dispatch and reconciliation rather
  than a convenient synchronous callback.

## Rejected alternatives

- A universal `PluginContext` or container-backed global `PluginManager`.
- Registration order as application behavior.
- Manifest declarations that automatically become authority grants.
- A shared plugin database or plugin-owned migrations in bounded-context tables.
- Mutable tags or SemVer alone as active artifact identity.
- Blind retries after ambiguous extension effects.
- Automatic data deletion as a side effect of uninstall.
- Publishing an SPI before independent implementations and conformance evidence.
