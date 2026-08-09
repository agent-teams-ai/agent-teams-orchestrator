---
id: ADR-0082
type: adr
status: proposed
owner: architecture/security
summary: Restrict break-glass to reducing Orchestrator authority while keeping recovery in normal owner-local capabilities.
related:
  - ADR-0055
  - ADR-0079
  - ADR-0080
  - architecture.runtime-boundary
  - architecture.security
---

# ADR-0082: Break-Glass Reduces Orchestrator Authority

## Context

ADR-0080 correctly forbids an operator from clearing policy holds, rewriting
receipts, reopening retired identities, or declaring disposition complete. Its
statement that break-glass can also retry and reconcile is too broad, however.
Read literally, it creates an emergency capability that can repeat effects or
manufacture recovery authority outside the aggregate, policy, and technical
owner that normally controls that action.

Emergency containment and ordinary recovery have different safety properties.
An operator may need to close admission immediately even while a downstream
outcome is unknown. Querying a receipt, replaying an exact command, retrying a
qualified containment step, or admitting a successor attempt must still obey
the owning capability's normal idempotency, fencing, freshness, and policy
rules.

## Decision

If accepted, break-glass authority in the Orchestrator only reduces or closes
authority. It may:

- close admission or commit a stronger local suspension or revocation fence;
- freeze an owner-local mutation lane;
- quarantine or detach an Orchestrator-owned binding without destroying shared
  external resources;
- request the narrowest downstream cutoff or containment action through the
  normal consumer-owned port;
- durably record the emergency trigger, actor evidence, target, reason, time,
  and resulting receipt references.

An emergency trigger cannot itself authorize a retry, replay, reconciliation
mutation, successor attempt, destructive disposition, or downstream technical
effect. It cannot create, extend, substitute, or reopen product, execution,
retention, or erase authority.

The following remain normal owner-local recovery capabilities:

- query a durable receipt or current owner state;
- replay the exact command identity and canonical digest;
- resume a feed and detect or reconcile a gap;
- retry an idempotent containment or disposition step under the original typed
  plan and current technical capability evidence;
- resolve an ambiguous outcome through the owning effect ledger;
- request a successor attempt through ordinary admission, predecessor-barrier,
  effect-identity, and policy checks.

Break-glass may enqueue or wake one of those capabilities after its reducing
fence commits, but the recovery capability executes under its ordinary
authorization and preconditions. The emergency credential contributes no retry
or successor authority and cannot be substituted for missing owner evidence.

Downstream AR cutoff, containment, and technical reconciliation remain AR-owned.
The Orchestrator may request a cutoff and observe typed receipts; it neither
imports AR private fences nor declares technical enforcement complete.

Race handling is monotonic. Once an emergency fence wins its owner-local
linearization point, delayed normal work must observe that fence. Recovery can
prove or contain earlier effects but cannot weaken the fence. Reauthorization,
when permitted by the owning product capability, creates a new qualified basis
and still passes every normal successor barrier.

## Consequences

- Emergency response can stop new harm without becoming a second domain or
  execution authority.
- Recovery remains testable through the same owner-local ports, receipts, and
  state machines used outside incidents.
- Operators may need a separate normal recovery credential after committing an
  emergency fence; this is intentional separation of duties.
- Accepted ADR-0080 remains unchanged history. This proposal must be explicitly
  accepted before its narrower break-glass semantics become architecture
  authority.

## Rejected alternatives

- Give break-glass a generic retry or reconciliation permission. This bypasses
  effect identity, owner policy, and capability-specific preconditions.
- Make emergency credentials equivalent to owner or AR authority. This creates
  a hidden cross-boundary superuser.
- Forbid break-glass from waking recovery work. The trigger may schedule normal
  recovery after the reducing fence commits; it simply cannot authorize that
  recovery by itself.
