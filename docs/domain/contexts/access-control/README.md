---
id: domain.contexts.access-control
type: bounded-context
status: proposed
owner: access-control
summary: Proposed consumer-facing authorization boundary over membership and grant facts owned by the configured product authority provider.
blocked_by:
  - OD-012
related:
  - ADR-0080
  - architecture.context-map
  - architecture.security
  - OD-012
---

# Access Control

Proposed scope: a consumer-facing authorization boundary over tenant and project
membership, role and grant assignments, and authorization facts consumed by
application use cases. ADR-0080 and the security architecture place the
authoritative identity, membership, and grant facts in the configured product
authority provider; this context never becomes a second grant authority, and
each consuming feature owns its own authorization port. Whether consumers use
bounded local projections or synchronous authoritative decisions remains open
under OD-012, and ADR-0080 names this responsibility a logical provider
responsibility rather than an accepted mandatory bounded context. Authentication
and domain business invariants remain outside this context.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
