---
id: ADR-0018
type: adr
status: superseded
supersedes: []
owner: clients/sdk
summary: Represent accepted durable commands as recoverable operations with one public command identity.
related:
  - ADR-0015
  - ADR-0016
  - OD-016
  - OD-017
superseded_by:
  - ADR-0061
---

# ADR-0018: Durable Command Operations

## Context

Starting a run, provisioning a team, and similar commands may outlive one request,
SDK process, or network connection. A transport response cannot prove business
completion, and an SDK-generated retry key that is lost during a client crash
cannot support later reconciliation.

Exposing separate public `commandId`, `requestId`, and `idempotencyKey` values for
one logical command would create avoidable ambiguity.

## Decision

Every durable public command has one client-selected `commandId`. It is the
idempotency identity for that logical command. There is no second public
idempotency key.

The command ID is unique within one project across all durable control commands.
It is a lowercase RFC 9562 UUIDv4 and must be reusable across process restart.
The SDK:

- provides a command-ID generator;
- permits a caller-supplied ID on every durable command;
- preserves the same ID across transport retries;
- tells crash-safe callers to persist the ID before the first send;
- includes the ID and deterministic operation reference in an unknown-outcome
  error.

Automatic generation provides retry safety only within the current process.
Durable recovery across caller crash requires a caller-persisted command ID.

Durable acceptance creates an addressable operation resource. Its name is
deterministic from project scope and command ID, so a caller can retrieve it after
losing the initial response. The Protobuf wire boundary uses the standard
long-running-operation pattern; handwritten SDKs expose a typed, serializable
`OperationHandle<TResult, TMetadata>` without credentials or live connections.

The lifecycle distinguishes:

```text
pending
running
cancellation-requested
succeeded
failed
cancelled
```

Terminal outcomes are immutable. Polling, operation queries, and operation event
subscriptions must expose the same terminal outcome.

Three durability horizons are distinct:

1. active operation state;
2. full command receipt and result;
3. compact command-ID reuse-detection tombstone.

The same command ID and semantic command fingerprint returns the existing
operation or retained result. The same ID with another fingerprint is an
idempotency conflict. After full-result expiry but before tombstone expiry, the
result is explicitly expired while key reuse is still recognized. After tombstone
expiry, the service no longer claims historical reuse detection.

Fingerprints are computed from the normalized application command using versioned
canonicalization, never from Protobuf bytes. The canonicalization implementation
remains available for as long as matching tombstones remain.

The following are separate:

- transport request deadline;
- local poll or wait cancellation;
- command validity deadline;
- durable request to cancel the operation;
- privileged force termination.

An `AbortSignal`, timeout, disconnect, or SDK close stops only local I/O or
waiting. Cancellation acceptance is best effort and does not imply a cancelled
terminal state. A completion that wins the race remains succeeded or failed.

Automatic retry is limited to reads and commands whose stable command ID makes the
retry safe. Retries share one total budget and honor server retry guidance. An
ambiguous outcome is reconciled by command ID before any further policy decision.

The persistence adapter distinguishes a failure proven before commit from a lost
acknowledgement after commit dispatch. Only the former is automatically
retryable. The latter returns a typed unknown outcome and resolves through
operation or command-receipt lookup. Reconciliation or an exact same-ID replay may
return the retained result; a new logical command is never created.

## Consequences

- Durable work can be found after client or network failure.
- One public identity removes command-versus-idempotency ambiguity.
- Callers that require crash recovery must persist command IDs.
- Operation storage, lookup, result retention, and tombstones add explicit cost.
- Business cancellation remains visible instead of being hidden behind transport
  cancellation.

## Rejected alternatives

- Return only the final command result.
- Generate an invisible retry key inside the transport.
- Expose three independent public IDs for the same logical command.
- Treat disconnect, timeout, and durable cancellation as the same operation.

## Evidence

- [Google AIP-151: Long-running operations](https://google.aip.dev/151)
- [Google AIP-155: Request identification](https://google.aip.dev/155)
- [Google AIP-194: Automatic retry configuration](https://google.aip.dev/194)
- [Azure SDK long-running operations](https://azure.github.io/azure-sdk/general_design.html#long-running-operations)
- The isolated 2026-07-25 persistence-failure spike passed 16/16 SQLite and
  PostgreSQL scenarios, including loss before commit, loss of a durable commit
  response, reconciliation by command ID, disk full, corruption, deadlock,
  serialization conflict, restart, and safe error redaction. The retained
  `Persistence failure ambiguity` fingerprint is in the
  [foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
