# ADR-0010: Broker-Neutral Partition Ordering

Status: **Accepted**

Supersedes ADR-0006.

## Context

ADR-0006 correctly made ordering contract-specific but used `subject` as a
broker-neutral ordering scope. Subject is NATS terminology and leaks one adapter's
topology into public semantics.

## Decision

Each event contract declares one of:

- no ordering;
- partition-key ordering;
- aggregate-key ordering;
- custom-key ordering.

The contract defines key semantics, sequence allocation, duplicate and gap
handling, and consumer reconciliation. A JetStream adapter maps the declared key to
subjects, streams, and consumers without exposing that topology to the core.

## Consequences

- Broker replacement does not rename business ordering semantics.
- Ordering remains opt-in and contract-specific.
- Aggregate revision remains separate from transport sequence.
- Adapter conformance tests verify every claimed ordering policy.

## Rejected alternatives

- NATS subject names in broker-neutral contracts.
- One globally ordered event log.
- Undocumented best-effort ordering.
