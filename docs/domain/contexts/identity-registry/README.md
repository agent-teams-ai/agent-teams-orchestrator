---
id: domain.contexts.identity-registry
type: bounded-context
status: proposed
owner: identity-registry
summary: Proposed model boundary for human and machine principal identity.
blocked_by:
  - OD-011
related:
  - architecture.context-map
  - OD-011
  - OD-012
---

# Identity Registry

Proposed scope: human and machine principal identity, external identity mappings,
and principal lifecycle facts. Authorization decisions remain outside this
context.

The [first real-authority candidate](../../../open-decisions/OD-012-identity-authorization-tenant-isolation.md#principal-binding-and-lifecycle-candidate)
limits initial discovery to stable human authorship and explicit external
binding/history. OD-011 and OD-012 still own its narrow acceptance; the test
authority in ADR-0103 needs no new production identity package. Membership and
grant records stay in the configured product authority.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
