---
id: ADR-0013
type: adr
status: superseded
owner: integration/runtime
summary: Separate product approvals from runtime permissions and assign Runtime Published Language ownership to ar.
related:
  - ADR-0003
  - ADR-0008
  - OD-004
superseded_by:
  - ADR-0028
---

# ADR-0013: Runtime Published Language and Permission Boundary

Clarifies ADR-0003 and ADR-0008.

## Context

Approvals, messages, and resume exist in both product coordination and technical
runtime execution but have different owners and invariants. Treating a
consumer-owned runtime port as the wire contract would also couple the
orchestrator application model to `ar`.

## Decision

`ar` owns the canonical, versioned Runtime Published Language/API, including wire
schemas, runtime events, errors, capability negotiation, ordering, replay, and
command outcome semantics. Orchestrator features own narrow consumer ports. A
stateless Runtime ACL integration boundary translates between them through
separate outbound command and inbound event adapters; neither repository imports
the other's domain model.

Product and technical meanings remain separate:

- Agent Communication owns team messages and product inbox semantics; `ar` owns
  runtime input and provider output.
- Run Orchestration owns continuation of an orchestration workflow; `ar` owns
  technical session resume and reattachment.
- Approval Management owns product approval policy, eligible approvers, routing,
  expiry, and evidence; `ar` owns the technical `RuntimePermissionRequest`,
  capability grant, and provider enforcement.

The selected human or machine authority makes the decision. The orchestrator sends
the decision through its consumer-owned port using the identifiers, expected
revision, execution fence, expected capability scope hash, validity deadline, and
opaque authority decision reference required by the canonical `ar` contract.

Duplicate, stale, conflicting, expired, and uncertain outcomes are normal typed
contract outcomes. Decision acceptance and provider enforcement are separate
lifecycle facts. The orchestrator never assumes that an accepted or delivered
decision resumed the runtime session.

The same decision ID and canonical payload returns the previously recorded result.
Reusing the ID with another payload is a conflict. A stale revision, fence,
validity deadline, or capability scope produces no provider side effect.

Both repositories run shared Runtime Published Language fixtures in CI. `ar`
validates the canonical API; the orchestrator additionally validates ACL mapping
and consumer-port semantics.

## Consequences

- Product approval state cannot become the technical runtime permission state.
- `ar` does not need to understand orchestrator users, roles, teams, tasks, or
  approval aggregates.
- The orchestrator can replace its runtime ACL without changing domain/application
  behavior.
- Runtime event ingestion and runtime command dispatch cannot collapse into one
  broad bidirectional adapter module.
- Permission retries require idempotency, revision, fence, expiry, and capability
  scope checks.
- An uncertain enforcement outcome requires published reconciliation,
  provider-level idempotency, or controlled recovery rather than a blind retry.
- Signed decision attestation may be added at a future untrusted network boundary
  without changing product approval ownership.

## Rejected alternatives

- One shared domain model for product approvals and runtime permissions.
- Letting the Runtime ACL own approval or runtime-permission state.
- Publishing orchestrator consumer ports as the `ar` wire API.
- Treating decision delivery, provider enforcement, and session resume as one
  atomic operation.
