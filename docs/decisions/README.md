# Architecture Decision Records

ADRs record significant architecture choices and their consequences.

## Accepted decisions

- [ADR-0001: Headless event-driven modular monolith](0001-headless-event-driven-modular-monolith.md)
- [ADR-0003: Runtime lifecycle belongs to ar](0003-ar-owns-runtime-lifecycle.md)
- [ADR-0004: Broker-neutral core with NATS JetStream adapter](0004-broker-neutral-events-with-jetstream.md)
- [ADR-0005: Public contracts are outside application and domain](0005-public-contracts-outside-application.md)
- [ADR-0007: Focused contexts and domain-capability slices](0007-focused-contexts-and-domain-capability-slices.md)
- [ADR-0008: Consumer-owned runtime ports and stateless ACL](0008-consumer-owned-runtime-ports.md)
- [ADR-0009: Commands and events have distinct contracts](0009-commands-and-events-are-distinct.md)
- [ADR-0010: Broker-neutral partition ordering](0010-broker-neutral-partition-ordering.md)
- [ADR-0011: Context-isolated SQLite and PostgreSQL topology](0011-context-isolated-sqlite-and-postgres-topology.md)

## Superseded decisions

- [ADR-0002: Bounded-context packages with feature-owned slices](0002-bounded-context-packages-and-feature-slices.md), superseded by ADR-0007
- [ADR-0006: Ordering is declared per contract](0006-contract-specific-event-ordering.md), superseded by ADR-0010

## ADR process

An ADR contains:

- status;
- context;
- decision;
- consequences;
- rejected or deferred alternatives.

Accepted ADRs are immutable except for typo or link fixes. A changed decision gets
a new ADR that supersedes the old one.

Use sequential filenames:

```text
0005-short-decision-title.md
```
