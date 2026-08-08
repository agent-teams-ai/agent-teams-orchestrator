---
id: ADR-0028
type: adr
status: accepted
superseded_by: []
owner: integration/runtime
summary: Keep execution fences inside AR while preserving the product approval and runtime permission boundary.
related:
  - ADR-0003
  - ADR-0008
  - ADR-0026
  - OD-004
  - architecture.runtime-boundary
supersedes:
  - ADR-0013
---

# ADR-0028: Runtime Published Language and Internal Fence

## Context

ADR-0013 correctly separated product approvals from technical runtime permissions
and assigned the Runtime Published Language to AR. It nevertheless allowed an
`ExecutionFence` to cross the protected Runtime ACL in a permission decision.

AR now treats that fence as internal enforcement authority. Publishing it would
turn an internal fencing token into a cross-system capability, expand secret
handling, and couple the orchestrator to AR custody mechanics.

## Decision

AR owns the canonical, versioned Runtime Published Language/API. Orchestrator
features own narrow consumer ports. Separate outbound command and inbound event
ACL adapters translate between the models; neither repository imports the other's
domain model.

Product and technical meanings remain separate:

- Agent Communication owns team messages and product inbox semantics; AR owns
  runtime input and provider output.
- Run Orchestration owns continuation of an orchestration workflow; AR owns
  technical session resume and reattachment.
- Approval Management owns product approval policy, eligible authorities,
  routing, expiry, evidence, and product decision state.
- AR owns `RuntimePermissionRequest`, technical capability scope, capability
  grants, custody validation, provider enforcement, and runtime continuation.

`ExecutionFence` is AR-internal enforcement authority. It never crosses the
Runtime Published Language, Runtime ACL, orchestrator persistence, logs,
diagnostics, or public control contracts.

A permission decision references the runtime permission request, decision
identity, idempotency identity, expected published request revision, expected
capability scope, validity deadline, opaque authority decision reference, and any
additional non-authorizing published concurrency guard selected by OD-004. The
orchestrator does not reconstruct that guard from process, attempt, epoch, or
provider data.

AR atomically resolves and validates its current internal fence, custody state,
request revision, validity, and capability scope before recording enforcement
intent. A stale or invalid decision causes no provider side effect.

Duplicate, stale, conflicting, expired, and uncertain outcomes are normal typed
contract outcomes. Decision acceptance, provider enforcement, enforcement
acknowledgement, and runtime continuation are distinct lifecycle facts. An
uncertain outcome uses published reconciliation, provider idempotency, or
controlled recovery rather than a blind retry.

The same decision ID with the same canonical semantic payload returns the recorded
result. Reusing it with another payload is a conflict. Both repositories run the
applicable Runtime Published Language fixtures; AR additionally proves internal
fence enforcement without disclosing the fence.

Signed decision attestation remains deferred until an untrusted network boundary
requires it.

## Consequences

- The orchestrator cannot accidentally persist or disclose runtime authority.
- AR may change fencing implementation without changing orchestration domain
  models.
- Permission requests need a published concurrency contract that does not expose
  internal custody tokens.
- Orchestrator tests validate published stale outcomes; AR tests validate the
  internal stale-fence mechanism.
- Product approval and technical enforcement remain separately auditable.

## Rejected alternatives

- Pass `ExecutionFence` through a protected orchestrator integration package.
- Treat `executionEpoch` as a capability token or replacement fence.
- Let the orchestrator derive AR custody from process or provider identity.
- Collapse product approval, permission acceptance, provider enforcement, and
  runtime continuation into one state transition.
