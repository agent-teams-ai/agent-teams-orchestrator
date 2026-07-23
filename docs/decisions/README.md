# Architecture Decision Records

ADRs record significant architecture choices and their consequences.

## Accepted decisions

- [ADR-0001: Headless event-driven modular monolith](0001-headless-event-driven-modular-monolith.md)
- [ADR-0002: Bounded-context packages with feature-owned slices](0002-bounded-context-packages-and-feature-slices.md)
- [ADR-0003: Runtime lifecycle belongs to ar](0003-ar-owns-runtime-lifecycle.md)
- [ADR-0004: Broker-neutral core with NATS JetStream adapter](0004-broker-neutral-events-with-jetstream.md)

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
