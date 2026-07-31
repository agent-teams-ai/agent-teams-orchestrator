---
id: OD-017
type: open-decision
status: resolved
owner: clients/sdk
summary: Define public lifecycle, receipts, reconciliation, and cancellation for long-running commands.
resolved_by: ADR-0061
related:
  - ADR-0015
  - ADR-0018
  - ADR-0061
  - architecture.sdk-transports
  - architecture.eventing
---

# OD-017: Long-Running Command Lifecycle

## Decision required

Define which commands return an immediate result, durable receipt, or operation
handle; how clients observe `accepted`, `in-progress`, `completed`, `failed`, and
unknown outcomes; and how polling, subscriptions, cancellation, deadlines,
disconnects, full-result retention, and compact idempotency tombstones interact.

## Constraints

- transport delivery success is not business completion;
- one logical retry preserves its idempotency key;
- request fingerprints use versioned semantic canonicalization rather than raw
  wire bytes;
- receipts and tombstones retain idempotency scope, key, and canonicalization
  version for their declared horizons;
- supported canonicalization logic remains available while corresponding
  tombstones can be compared;
- an expired-window outcome can be promised only while a compact tombstone
  remains;
- every command declares its full-receipt and reuse-detection horizons;
- local wait cancellation is not orchestration-run cancellation;
- disconnecting a client does not terminate durable work;
- ambiguous delivery requires reconciliation rather than blind retry;
- SDKs expose mechanism, while orchestration policy remains server-side.

## Resolution

Originally resolved by ADR-0018; the current contract is ADR-0061. Canonical
resource scope, server-owned command family, and caller-supplied `commandId`
together identify one durable command. Durable acceptance creates a recoverable
feature-owned Operation, receipt and reuse-detection horizons remain separate,
and local wait cancellation is distinct from business cancellation.
