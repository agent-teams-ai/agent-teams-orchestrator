---
id: ADR-0095
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture
summary: Reuse a narrow product-neutral extension foundation and distribute immutable extension artifacts through OCI with ORAS and Cosign.
approved_by: product-owner
accepted_at: 2026-08-13
related:
  - ADR-0074
  - ADR-0094
  - architecture.extensions
  - architecture.security
  - OD-041
  - OD-042
  - OD-043
---

# ADR-0095: Shared Extension Foundation and OCI Distribution

## Context

Orchestrator, Agent Runtime, and future Web and Desktop clients need extension
installation, identity, capability negotiation, provenance, compatibility, and
lifecycle primitives. Duplicating those technical mechanisms would create
inconsistent security and upgrade behavior. Centralizing product-specific ports
or domain models would instead violate bounded-context ownership and turn the
foundation into a shared application layer.

Extensions also need a portable artifact format. Building a custom registry
would duplicate mature distribution, content-addressing, authentication, and
signature ecosystems.

## Decision

- Create a separately versioned `agent-teams-ai/extension-foundation`
  repository for product-neutral extension infrastructure.
- The foundation may own technical manifests, extension identities, capability
  and permission requests, lifecycle protocols, profiles and lock files,
  artifact resolution, provenance verification, compatibility negotiation,
  test kits, and AI-readable diagnostics.
- Product-specific extension ports and contribution contracts remain narrow,
  consumer-owned, and physically located in Orchestrator, Agent Runtime, or the
  Frontend repository that consumes them. Product domain models never move into
  the foundation.
- Use OCI Distribution as the artifact transport and storage contract, ORAS for
  OCI artifact operations, and Cosign for signature and provenance workflows.
- Use GHCR as the first hosted OCI registry. Prove Harbor as the first
  self-hosted conformance target. Other OCI registries may be admitted only
  through the same conformance suite.
- Prefer one OCI distribution adapter with narrow provider profiles for
  authentication, discovery, and policy differences. Create a provider-specific
  adapter only for a proven semantic incompatibility.
- Installation, activation, rollback, and audit pin immutable artifact digests.
  Tags and SemVer assist discovery and compatibility selection but never define
  active identity.
- Artifact storage and catalog or marketplace governance remain separate. A
  catalog references immutable artifacts and cannot grant product authority.
- Built-in modules should implement the same narrow semantic contract as an
  extension when the capability is intentionally replaceable. They need not use
  the same process-isolation or artifact-loading path as untrusted third-party
  code.
- The public self-hosted baseline remains usable without private artifacts. A
  missing optional extension produces an explicit capability outcome rather
  than a hidden fallback or startup failure.

The guardrails in ADR-0094 remain mandatory. Extensions propose decisions,
provide facts, render contributions, or execute effects behind ports. The owning
application and domain layers validate their outputs and retain all authority
over aggregate invariants, authorization, fencing, transactions, and canonical
state.

## Consequences

- Users can combine built-in, first-party private, community, and custom modules
  without changing product domain code.
- GHCR and Harbor are replaceable distribution providers rather than product
  branches.
- Shared lifecycle and security tooling can evolve once while each product keeps
  its own ubiquitous language and extension surface.
- Extension readiness becomes a deliberate design property, not a requirement
  to turn every class or feature into a public plugin API.
- Exact catalog governance, hot update, isolation tiers, and Frontend
  contributions remain open in OD-043 and OD-042.

## Rejected alternatives

- A custom artifact registry and custom signing protocol.
- A universal plugin API shared across all product domains.
- Making every internal service dynamically replaceable.
- Provider-specific GHCR and Harbor domain models.
- Requiring private modules for the public self-hosted baseline to start.
