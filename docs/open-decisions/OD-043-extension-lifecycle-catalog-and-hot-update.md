---
id: OD-043
type: open-decision
status: open
owner: architecture
summary: Decide extension catalog governance, isolation tiers, lifecycle transitions, hot update, rollback, and operator experience.
related:
  - ADR-0095
  - ADR-0096
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
  fixed by ADR-0096.
- Artifact storage is separate from catalog and marketplace governance.
- The shared Foundation has already selected one PostgreSQL canonical store
  per writable catalog source and explicit deterministic authority routes in
  [EF ADR-0003](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md)
  and [EF ADR-0004](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/decisions/0004-deterministic-catalog-federation-and-namespace-authority.md).
  This open decision still needs to select product adoption and placement; it does not introduce
  Git, a search index or an OCI registry as a co-equal catalog writer.
- A catalog listing, publisher identity, signature, entitlement, and manifest
  permission request do not grant product authority.
- Active generations are explicit. Update cannot silently replace in-flight
  ownership or leave two mutation authorities active.
- Install, update, disable, rollback, and uninstall require durable observable
  outcomes and must not rely on registration order.
- Uninstall does not implicitly erase user or bounded-context data.

## Questions that remain open

- the first product catalog placement and adoption profile: a writable service,
  qualified federation or a read-only local/signed-snapshot resolver, under the
  shared canonical-store and authority rules;
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

## Research and next qualification target

The [maintained research reference](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/research/plugin-system-research-reference.md)
records mature plugin systems, production replacement, stateful updates and
OpenClaw at an exact source revision. Its
[hot-reload proposal](https://github.com/agent-teams-ai/extension-foundation/blob/main/docs/research/hot-reload-and-generation-replacement.md)
contains the failure matrix, independent critic corrections and alternatives
rated for confidence, reliability and complexity, with separate production and
test LOC estimates. These estimates assume existing product authority and
durable-operation primitives; they are not a production qualification claim.

The recommended first target is a trusted, overlap-safe request capability:
one closed group of modules behind one typed request port, immutable Get Modular
construction per generation, product-owned durable publication and admission,
bounded old-work drain, and explicit execution/cleanup evidence. The owning
product must still select the concrete capability, deployment boundary, budgets
and approval record before implementing that profile.

Keep the following choices separate:

- normal upgrade and emergency security revocation;
- overlap-safe preparation and exclusive-resource ownership transfer;
- selection of a new generation and migration of already accepted work/state;
- logical authority revocation, registered cleanup and observed physical exit;
- reverting new-work selection and reconciling an uncertain external effect.

The static GM/FMS choice in ADR-0110 is already accepted. It does not select a
dynamic Host, release/adopt the private lifecycle-kernel candidate, or satisfy
[OD-041](OD-041-shared-extension-foundation-and-artifact-distribution.md).
The stricter product requirement for two independent integrations and its
distribution/trust/lifecycle evidence remains in force. Research cannot lower
that floor or publish the deferred public connector SPI.

## Resolution

Open. Implementation must not invent these semantics implicitly.
