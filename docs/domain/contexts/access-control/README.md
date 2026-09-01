---
id: domain.contexts.access-control
type: bounded-context
status: proposed
owner: access-control
summary: Proposed model boundary for context-local projections of membership and grant facts supplied by the configured product authority provider.
blocked_by:
  - OD-012
related:
  - ADR-0080
  - architecture.context-map
  - architecture.security
  - OD-012
---

# Access Control

Proposed scope: context-local projections of tenant and project membership, role
and grant assignments, and authorization facts consumed by application use cases.
ADR-0080 and the security architecture place the authoritative identity,
membership, and grant facts in the configured product authority provider; this
context never becomes a second grant authority, and each consuming feature owns
its own authorization port. Authentication and domain business invariants remain
outside this context. Whether this boundary stays a bounded context or collapses
into provider adapters remains open under OD-012.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
