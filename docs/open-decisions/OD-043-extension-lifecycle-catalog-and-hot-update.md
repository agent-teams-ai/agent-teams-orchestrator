---
id: OD-043
type: open-decision
status: open
owner: architecture
summary: Decide extension catalog governance, isolation tiers, lifecycle transitions, hot update, rollback, and operator experience.
blocked_by: []
related:
  - ADR-0094
  - ADR-0095
  - architecture.extensions
  - architecture.security
  - OD-037
  - OD-042
---

# OD-043: Extension Lifecycle, Catalog, and Hot Update

## Decision required

What exact catalog, installation, activation, update, drain, rollback,
uninstallation, revocation, isolation, and recovery protocols should apply to
built-in, first-party private, community, and custom extensions?

## Accepted constraints

- OCI, ORAS, Cosign, immutable digests, and the shared extension foundation are
  fixed by ADR-0095.
- Artifact storage is separate from catalog and marketplace governance.
- A catalog listing, publisher identity, signature, entitlement, and manifest
  permission request do not grant product authority.
- Active generations are explicit. Update cannot silently replace in-flight
  ownership or leave two mutation authorities active.
- Install, update, disable, rollback, and uninstall require durable observable
  outcomes and must not rely on registration order.
- Uninstall does not implicitly erase user or bounded-context data.

## Questions that remain open

- whether the first catalog is repository-backed, service-backed, federated, or
  only a local profile resolver;
- trust roots, publisher onboarding, moderation, revocation, transparency, and
  compromised-key recovery;
- trusted in-process, sandboxed process, Web Worker, iframe, and remote-service
  isolation tiers;
- exact generation drain, state migration, cleanup, leak detection, rollback,
  and restart fallback behavior;
- offline installation, air-gapped Harbor, cache integrity, and registry outage
  behavior;
- CLI and UI workflows that hide raw OCI, ORAS, and Cosign mechanics;
- conformance requirements for publishing the first stable public SPI.

## Resolution

Open. Implementation must not invent these semantics implicitly.
