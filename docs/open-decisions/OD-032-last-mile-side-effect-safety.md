---
id: OD-032
type: open-decision
status: open
owner: architecture/security
summary: Define feature-owned action intent, last-mile enforcement, target-aware safety, ambiguous outcomes, and automation downgrade.
blocked_by:
  - OD-012
  - OD-013
  - OD-031
related:
  - ADR-0079
  - ADR-0080
  - architecture.eventing
  - architecture.security
  - domain.contexts.access-control
  - domain.contexts.policy-risk
  - domain.contexts.run-orchestration
  - OD-012
  - OD-013
  - OD-028
  - OD-031
  - OD-033
---

# OD-032: Last-Mile Side-Effect Safety

## Decision required

Define how an agent, user, workflow, or integration proposal becomes one safe
external side effect despite revocation races, stale context, duplicate delivery,
process crashes, multi-region failover, partial remote effects, and APIs with
different idempotency guarantees.

## Fixed boundary constraints

No shared universal business `ActionIntent` aggregate is allowed. Each semantic
owner defines a typed intent and its invariants, for example
`TaskTransitionIntent`, `SendMessageIntent`, or `MergeChangeIntent`.

The responsibility chain is:

```text
proposal
  -> feature-owned typed intent and expected domain revisions
  -> risk and approval decisions
  -> feature-owned authorization decision
  -> feature-owned durable execution process
  -> dispatch claim and fence
  -> capability-specific outbound policy-enforcement point
  -> target CAS, idempotency, or outcome lookup
  -> confirmed outcome, partial effect, or OUTCOME_UNKNOWN
```

- The semantic owner owns intent, business invariants, expected revisions,
  result, cancellation, and compensation policy.
- The configured product authority provider owns grant, delegation, revocation,
  and authorization evidence; a feature-owned port consumes that decision.
- Policy and Risk owns risk and automation decisions.
- Approval Management owns approval facts.
- Run Orchestration owns Run authority and a product
  `RunAuthorityGeneration`. AR's observable `executionEpoch` is technical
  evidence and never substitutes for that authority.
- The still-unaccepted integration boundary owns installation lifecycle,
  credential references, and installation security revision only after its
  context boundary is accepted.
- The feature-owned execution process gathers current owner decisions through
  narrow ports and owns dispatch admission. The outbound adapter performs only
  capability-specific technical checks, credential resolution, the remote call,
  and outcome mapping. It does not decide business authorization, context
  readiness, risk, or compensation.
- AR separately owns technical tool, sandbox, filesystem, and process
  enforcement for runtime-executed operations.

Owner-specific revisions and epochs remain separate. There is no central
`SafetyEpochLedger`, `JITGuardService`, global saga, or policy god-service.
Technical reuse is limited to outbox, inbox, claim lease and fence algorithms,
canonical fingerprints, safe error envelopes, and conformance harnesses.

No network call occurs inside a database transaction. The feature transaction
commits intent, durable execution state, and dispatch work. A dispatcher claims
that work and the outbound adapter performs the final checks immediately before
credential resolution and target invocation.

A short-lived permit or dispatch authorization bundle is not an exactly-once
lock. It is bound to exact intent fingerprint, actor and `onBehalfOf`, resource,
purpose, audience, scope, authorization and approval evidence, and expiry. A
remote signed representation would be a capability credential and therefore
requires key custody, rotation, revocation, replay, logging, and disclosure rules.
The exact in-process versus signed remote representation remains open. It contains
no raw credential and is never exposed to the model.

## Target-aware safety evidence

One mixed `SideEffectSafetyProfile` would blur owners. Every external operation
instead composes three independently owned inputs:

```text
OperationTechnicalCapabilities, owned by the adapter:
idempotency: none | request-key | natural-resource-key
conditional mutation: none | etag | revision | compare-and-set
outcome lookup: none | request-key | operation-ref | conclusive-absence
cancellation: none | best-effort | confirmed
execution: synchronous | asynchronous
idempotency retention
request duration and correlation support

BusinessEffectProfile, owned by the semantic feature:
atomicity: atomic | enumerable-partial
reversibility: reversible | compensatable | irreversible
business duplicate and partial-effect consequences

AutomationDecision, owned by Policy and Risk:
allowed level, approval and audit requirements
retry, reconcile, downgrade, and manual-resolution constraints
```

Automation and retry behavior derive from all three:

- CAS plus idempotency plus outcome lookup may permit automatic recovery.
- An idempotency key is reused only with the same semantic fingerprint.
- A lookup-first target is reconciled before any retry.
- After a request may have crossed the network, absence must be conclusive before
  a new invocation.
- An irreversible operation without idempotency or outcome lookup cannot be
  fully automated.
- A target that lacks technical guarantees forces an explicit lower automation
  level or manual resolution.

No architecture can promise exactly-once external effects when the target lacks
atomic preconditions, stable idempotency, or conclusive outcome lookup.

## Candidate execution semantics

The following is common vocabulary and conformance behavior, not a shared domain
aggregate:

```text
READY -> CLAIMED -> PREPARED -> DISPATCHING
DISPATCHING -> REMOTE_ACCEPTED
            -> CONFIRMED_SUCCEEDED
            -> CONFIRMED_REJECTED
            -> OUTCOME_UNKNOWN

OUTCOME_UNKNOWN -> RECONCILING
                -> RECONCILED_SUCCEEDED
                -> RECONCILED_REJECTED
                -> PARTIAL_EFFECT
                -> MANUAL_RESOLUTION_REQUIRED
```

`DISPATCHING` means that the request might have crossed the external boundary. A
crash from this point never blindly returns work to `READY`. Cancellation is an
orthogonal lifecycle with before-dispatch, requested, confirmed, unknown, and
too-late outcomes rather than an implicit return to a previous state.

The last-mile check validates, as applicable:

```text
intent and expected domain revision
Run authority and RunAuthorityGeneration
authorization and delegation revision
approval validity
installation security revision
context readiness for the action
permit fingerprint, audience, and expiry
dispatch fence
target precondition and safety profile
```

The final preflight blocks a revocation already visible before dispatch
admission. It cannot by itself prevent a revocation committed between that check
and the external network send. A strong revoke-before-effect guarantee requires a
target-enforced conditional mutation, target authorization, idempotent
linearization point, or another protocol that binds the effect to current
authority. Without one, the race is classified as a possible effect and enters
reconciliation, cancellation, compensation, or manual resolution. It never
blindly retries or claims the effect did not occur.

## Scale and failure hypothesis

Hosted mutations use one home-region writer per tenant or stable authority
partition. A region epoch fences orchestrator state but cannot fence an external
target by itself. Failover must prove the old writer quiescent or wait through a
bounded permit, request, and clock-skew window, then reconcile all uncertain work
before related dispatch resumes. Active-active external mutation is prohibited
unless the target enforces a compatible fence or linearization protocol.

Safety work has reserved capacity independent of ordinary data and context lanes.
Stale or unknown authorization, missing audit commit for a high-risk action,
database unavailability, disk full, secret unavailability, or a safety-feed gap
fails closed.

Safe errors record stage, stable code, whether a remote effect is impossible,
possible, partial, or confirmed, and whether recovery is forbidden, same-key,
reconcile-first, or manual. Raw payloads, credentials, permits, and protected
content do not enter events, logs, or telemetry.

## Decisions still open

1. Exact feature-local `ActionExecution` aggregate and dispatch record boundaries.
2. Permit or authorization-bundle representation for embedded, sidecar, and
   remote workers.
3. Initial technical-capability, business-effect, and automation-decision
   schemas.
4. Multi-region authority partitioning and failover coordination.
5. Audit-before-dispatch policy by risk class.
6. Operator reconciliation and manual-resolution contracts.
7. Which initial reversible integration proves the vertical slice.

## Options

1. Feature-owned intent and execution with capability-owned last-mile
   enforcement. This is the leading option.
2. One central action-execution service. This risks duplicating feature
   invariants and becoming a god-component.
3. Adapter retries without durable intent and reconciliation. This is not viable
   for crash recovery or ambiguous outcomes.

## Acceptance criteria

- every external mutation has one semantic owner and one capability-specific
  enforcement point;
- the feature-owned execution process, not the adapter, owns business dispatch
  admission and gathers owner decisions through narrow ports;
- no owner-specific domain revision or epoch is transferred to a central safety
  aggregate;
- crash injection covers every durable and network boundary;
- target simulators cover idempotency, CAS, lookup, partial effect, lost
  acknowledgement, delayed success, cancellation, and credential revocation;
- duplicate, stale worker, lease expiry, revoke race, and region failover cannot
  create an unclassified blind retry;
- failover never treats an orchestrator region epoch as proof that the old writer
  or external target is fenced;
- automation is explicitly downgraded when the target cannot support the promised
  safety;
- reconciliation and manual recovery are authorized, durable, observable
  operations rather than database edits.

## Resolution

Open. The first accepted ADR must be based on one complete reversible adapter
slice and a failure-injection matrix, not only a generic state diagram.
