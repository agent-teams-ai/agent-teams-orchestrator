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

## Required product lifecycle target, 2026-11-27

The owner requires the complete journey: verify/install, activate and obtain a
useful authorized result, update while admitted old work remains coherent,
disable/remove, then restart and reconcile without resurrection or loss of
owner data. A qualified restart fallback retains its explicit scope; it does
not complete the required live old/new-generation journey.

The [Orchestrator handoff in PR #111](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/c01efb6813f0c048497caeefbb8235cead480cb2/docs/open-decisions/OD-043-extension-lifecycle-catalog-and-hot-update.md#first-orchestrator-adoption-journey)
reserves the read-only Agent Context inspection candidate and product-owned
integration cards. It remains a proposal at that source, not an
accepted public SPI or implemented contribution. Refresh the current handoff
before implementation. [EF #70](https://github.com/agent-teams-ai/extension-foundation/pull/70)
and [LMU delivery plan](https://github.com/agent-teams-ai/live-module-updates/blob/77a3ecc4ace12509961bd3ff43e80703b0303c40/docs/plans/first-operation-implementation-plan.md)
own their shared mechanisms and qualification; product adapters join the actual
verified artifact and operation through the feature-owned invocation port.

Apply the [consolidated research](https://github.com/agent-teams-ai/engineering-research/blob/e2a5f6c47e008f93094dc88ed39ea9618722f28d/docs/lessons/preimplementation-decisions.md)
within this decision's existing profile selection:

- Observe useful successor work through the actual product port while held old
  work remains coherent. Retain the original attempt/receipt across lost
  acknowledgement, restart and uncertain publication; reject stale effects at
  the real receiver and prevent a late disposer from removing successor resources.
- State owners record the compatibility horizon for retained readers/writers,
  pending effects, cleanup and replay. Returning to old code uses fresh authority
  against current state and grants; unknown effects remain reconciliation work.
- Select finite pin/drain, explicit safe-boundary handover, exclusive-resource
  transfer or a recyclable realm per capability. Streams and callbacks require
  their actual consumption/finalization lifetime. A separately owned executor
  handles self-update; the caller cannot wait for its own retirement.
  Bound cumulative evaluations and retained artifacts; logical
  retirement alone does not unload Node ESM.
- For selective replacement, LMU consumes GM's old/new graph and binding facts
  plus resource ownership and compatibility. Include all affected consumers
  outside the selected root; retain unchanged shared owners while retained
  consumers still need them, and preserve unaffected siblings.
- The chosen trust profile names actual containment and current capability
  enforcement. A signature, successful import or Worker is not hostile-code
  isolation. Preserve the existing independent-integration and public SPI gates.

Use existing GM Resources/Observation and the EF/LMU owner contracts. These
acceptance details introduce no second loader, scheduler, lifecycle engine or
automatic state migration; the unresolved protocol choices below remain open.

## Research and next qualification target

The [reviewed research reference](https://github.com/agent-teams-ai/extension-foundation/blob/10deea1a11748df1fcbfc2766033c462fce3acd0/docs/research/plugin-system-research-reference.md)
records mature plugin systems, production replacement, stateful updates and
OpenClaw at an exact source revision. Its
[hot-reload proposal](https://github.com/agent-teams-ai/extension-foundation/blob/10deea1a11748df1fcbfc2766033c462fce3acd0/docs/research/hot-reload-and-generation-replacement.md)
contains the failure matrix, independent critic corrections and alternatives
rated for confidence, reliability and complexity, with separate production and
test LOC estimates. The links pin the reviewed proposal from
[Extension Foundation PR #55](https://github.com/agent-teams-ai/extension-foundation/pull/55),
not an assumed publication on main. These estimates assume existing product
authority and durable-operation primitives; they are not a production
qualification claim.

The recommended first target is a trusted, overlap-safe request capability:
one closed group of modules behind one typed request port, immutable Get Modular
construction per generation, product-owned durable publication and admission,
bounded old-work drain, and explicit execution/cleanup evidence. The owning
product must still select the concrete capability, trust tier, deployment
boundary, state authority, budgets and approval record before implementing that
profile. This research recommendation is not an accepted first-capability choice;
headless portability does not establish isolation for untrusted code.

Keep the following choices separate:

- normal upgrade and emergency security revocation;
- overlap-safe preparation and exclusive-resource ownership transfer;
- selection of a new generation and migration of already accepted work/state;
- logical authority revocation, registered cleanup and observed physical exit;
- reverting new-work selection and reconciling an uncertain external effect.

The static GM/FMS choice is accepted under ADR-0113 and ADR-0117, with the
current Core/Assembly 0.5.0 baseline and local foundation gate. It does not
select a dynamic Host, release or adopt a private lifecycle-kernel candidate, or satisfy
[OD-041](OD-041-shared-extension-foundation-and-artifact-distribution.md).
The stricter product requirement for two independent integrations and its
distribution/trust/lifecycle evidence remains in force. Research cannot lower
that floor or publish the deferred public connector SPI.

## Resolution

Open. Implementation must not invent these semantics implicitly.
