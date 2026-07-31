---
id: ADR-0067
type: adr
status: accepted
owner: platform/control-api
summary: Keep CreateRun command completion separate from independently observable Run readiness.
approved_by: product-owner
accepted_at: 2026-07-30
related:
  - ADR-0019
  - ADR-0061
  - ADR-0065
  - architecture.public-control-contracts
  - architecture.sdk-transports
  - OD-018
---

# ADR-0067: Separate Run Creation from Readiness Observation

## Context

ADR-0065 correctly separated durable Run creation from provider startup and Work
execution, but made the caller's readiness target part of `CreateRun`. A readiness
wait preference does not change Run intent or state. Different clients may observe
the same Run while waiting for different milestones, and changing only that wait
preference must not change the command fingerprint or idempotency outcome.

Readiness is also multidimensional. Plan promotion, required-participant
activation, optional-participant health, context readiness, and operational
availability cannot safely collapse into one creation status.

## Decision

This ADR partially supersedes only the `CreateRun.readinessTarget` and
target-dependent Operation completion statements in ADR-0065. ADR-0065 remains
authoritative for Run, planning, activation, placement, and runtime ownership.

`CreateRun` is one durable idempotent command. Its accepted transaction validates
the admissible request, creates the stable Run resource in its initial lifecycle
state, records the command receipt and feature-owned Operation, and appends
required outbox work atomically. Its Operation has one fixed result:
`CreateRunResult` with the stable Run reference. It may already be terminal when
returned.

External capability checks, plan promotion, participant activation, context
materialization, and operational readiness continue asynchronously. Their
failures change the owning Run projections and process states; they do not
retroactively change the meaning of successful Run creation.

Readiness is exposed through three independent capabilities:

```text
GetRunReadiness
  -> RunReadinessSnapshot + revision + resume cursor

SubscribeRunReadiness(afterCursor)
  -> resumable typed RunReadinessEvent feed

SDK RunReadiness.waitFor(typedCondition)
  -> snapshot evaluation followed by gap-free feed consumption
```

The wait condition is an SDK observation concern and is not part of the
`CreateRun` request, command canonicalization, receipt, or Operation identity.
SDK conditions are typed factories rather than arbitrary strings. Wire filters,
when later justified, use versioned Protobuf enums or `oneof` variants and capability
negotiation without becoming Run domain types.

The first SDK supports conditions for initial plan promotion, required
participants ready, and Run operational readiness. A plan-scoped condition pins a
plan reference. A Run-scoped condition explicitly follows the authoritative
current plan. Replan behavior is never inferred from a boolean or hidden default.

`RunReadinessSnapshot` keeps lifecycle, planning, required and optional
participant readiness, context readiness, operational availability, health, and
pending interaction as separate typed axes. A feed event records one typed fact
and its Run authority generation; it does not claim global ordering outside the
Run feed.

If a condition is already satisfied, `waitFor` completes from the snapshot. A
disconnect resumes from the last cursor. An expired cursor triggers an explicit
fresh snapshot and new cursor. A terminal Run that makes the condition impossible
returns a typed `READINESS_UNREACHABLE` outcome instead of waiting forever.

CLI and Desktop may provide product-specific convenience commands that wait for
Run operational readiness. They implement that behavior through the same SDK
snapshot, feed, and typed wait capability rather than altering `CreateRun`.

## Consequences

- Command identity depends only on creation intent, not observer preference.
- Multiple clients can wait for different milestones on one Run.
- Readiness progress is resumable and useful independently from the creating
  client.
- SDK and feed contracts require typed snapshot axes, conditions, cursor recovery,
  and unreachable-condition behavior.
- A successfully created Run may later fail activation; clients must observe Run
  readiness rather than infer it from command success.

## Rejected alternatives

- Put a raw or typed `readinessTarget` in `CreateRun`.
- Give `CreateRun` a server default readiness target.
- Encode arbitrary readiness expressions or a public workflow DSL.
- Treat one progress enum or percentage as canonical Run readiness.
- Make each client wait a new durable server-side business process.
