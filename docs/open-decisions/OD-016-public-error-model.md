---
id: OD-016
type: open-decision
status: open
owner: platform/control-api
summary: Define stable public error codes, retryability, diagnostics, and SDK mapping.
related:
  - architecture.sdk-transports
  - architecture.public-control-contracts
  - ADR-0018
  - ADR-0019
  - ADR-0020
  - ADR-0023
  - OD-008
---

# OD-016: Public Error Model

## Decision required

Define stable error codes, retryability, operator-action classification,
validation details, correlation IDs, and safe diagnostics shared by APIs and
generated SDKs.

## Constraints

Public errors must not leak domain internals, provider secrets, filesystem paths,
prompts, or credentials. Transport status mapping must not become the canonical
error taxonomy.

The taxonomy must distinguish at least:

- validation and authorization failure;
- unsupported capability or incompatible API version;
- idempotency conflict, retained-result expiry, and unknown command outcome;
- stale ETag/concurrency conflict;
- operation result expiry;
- cursor expiry, unavailable history, gap, and slow consumer;
- invalid or expired page token;
- transient transport failure, deadline, and local cancellation.

Each error declares whether retry, reconciliation, user action, or operator action
is appropriate. Connect/gRPC codes are mappings, not canonical public codes.

## Resolution

Open.
