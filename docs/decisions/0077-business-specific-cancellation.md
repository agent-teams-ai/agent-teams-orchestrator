---
id: ADR-0077
type: adr
status: accepted
owner: clients/sdk
summary: Keep wait abortion local and expose business-specific cancellation instead of a generic Operation cancellation command.
approved_by: product-owner
accepted_at: 2026-08-01
related:
  - ADR-0066
  - ADR-0071
  - architecture.public-control-contracts
  - architecture.sdk-transports
  - OD-017
---

# ADR-0077: Business-Specific Cancellation

## Context

A public Operation is a durable result handle for an accepted command. It does
not own the business lifecycle that command may have started. A generic
`CancelOperation` cannot determine whether cancellation should stop a Run,
withdraw Work, preserve a committed Team, request AR cleanup, or return
`too_late` after a competing terminal commit.

The SDK also needs ordinary cancellation primitives for local waits and streams.
Using one method for both meanings would make disconnect or `AbortSignal` capable
of changing durable product state accidentally.

## Decision

The generic Operations API in v1 exposes `Get`, `Wait`, and refresh or feed
observation. It does not expose `CancelOperation`.

SDK cancellation tokens and `AbortSignal` cancel only the caller's current wait,
stream, or transport request. They never cancel accepted durable work.

Business cancellation is expressed by feature-owned idempotent commands such as
`CancelRun` and `CancelWorkExecution`. Each command has its own
`CommandDescriptor`, caller `requestId`, receipt, authorization, policy,
Operation, and typed outcome. The owning aggregate or process decides
`accepted`, `already_terminal`, `too_late`, or an uncertainty and reconciliation
result.

The first authoritative competing business commit wins. Cancellation may prevent
effects that were not durably admitted, but it cannot erase already committed
Team, Work, Run, provider, or cleanup facts. AR technical cancellation and force
termination remain behind runtime and privileged policy boundaries.

A product CLI may translate expiry of its explicit `CLIENT_BOUND` sponsorship
into `CancelRun` for Runs owned by that invocation. Closing a generic SDK client
or detached CLI never implies business cancellation.

## Consequences

- Operation handles remain transport- and domain-neutral observation resources.
- Each bounded context retains cancellation authority and can model races,
  compensation, cleanup, and `too_late` honestly.
- SDK users must call an explicit business capability to change durable state.
- A future generic cancellation convenience can exist only as SDK routing over an
  explicitly declared business capability, never as new Operation ownership.

## Rejected alternatives

- Add `CancelOperation` to every Operation kind.
- Treat `AbortSignal`, disconnect, or dropped subscription as product
  cancellation.
- Let the Operations facade infer and mutate feature-owned lifecycle state.
