---
id: domain.contexts.approval-management
type: bounded-context
status: proposed
owner: approval-management
summary: Proposed model boundary for product approvals, routing, expiry, and evidence.
blocked_by:
  - OD-011
related:
  - architecture.context-map
  - ADR-0028
  - OD-011
  - OD-012
  - OD-032
---

# Approval Management

Proposed scope: product approval requests, eligible authorities, decision routing,
expiry, revocation, and auditable evidence. Technical runtime permission state and
provider enforcement remain owned by `ar`.

Dangerous actions will require product approval. Assignment acceptance and Work
completion do not supply that approval. [OD-032](../../../open-decisions/OD-032-last-mile-side-effect-safety.md#deferred-dangerous-action-approval-research)
owns the deferred research into approver eligibility, exact action binding,
revocation, expiry, and dispatch enforcement. Current product authority remains
subject to [OD-012](../../../open-decisions/OD-012-identity-authorization-tenant-isolation.md).
ADR-0028 permits a selected human or machine authority; this direction does not
require human approval for every assignment or every action and does not accept
the detailed approval model.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
