---
id: OD-022
type: open-decision
status: open
owner: platform/eventing
summary: Define versioned JetStream topology migration, compatibility, handoff, rollback, and destructive-diff policy.
related:
  - ADR-0004
  - ADR-0035
  - architecture.eventing
---

# OD-022: JetStream Topology Migration

## Decision required

Define how the JetStream adapter evolves streams, subjects, durable consumers,
filters, retention, and delivery limits without message loss, duplicate business
effects, or unreviewed destructive changes.

## Constraints

- feature-owned manifests declare semantic requirements; the adapter owns their
  broker representation;
- topology reconciliation must classify additive, mutable, destructive, and
  immutable diffs before mutation;
- NATS accepting an in-place update does not prove semantic compatibility;
- subject or filter removal can break new routing while preserving old messages;
- storage type and consumer acknowledgement policy cannot be updated in place;
- pending deliveries and durable inboxes must survive compatible consumer
  updates;
- broker-specific errors are mapped to stable typed adapter outcomes;
- rollback cannot assume an old consumer cursor or route still exists.

## Decisions to make

1. Canonical desired-topology manifest shape, ownership, and version identity.
2. Allowlist of safe in-place changes and mandatory approval for destructive
   diffs.
3. Versioned stream and consumer naming without leaking broker names into feature
   contracts.
4. Dual-publish or dual-consume handoff, cursor checkpoint, and completion proof.
5. Rollback policy when old and new topologies have both accepted traffic.
6. Recovery after a crash during topology migration.
7. Compatibility checks across local and hosted NATS versions.

## Acceptance criteria

- conformance fixtures for every diff class;
- pending-message, concurrent-publisher, crash, rollback, and reconnect tests;
- no destructive change executes from ordinary startup reconciliation;
- topology migration is observable and resumable;
- one failed context topology does not block unrelated contexts;
- public errors and domain code contain no subjects, stream names, or NATS error
  classes.

## Decision evidence

A three-node R3 JetStream spike passed 56/56 checks on NATS 2.14.0, followed by
the identical 28/28 matrix on the official stable NATS 2.14.3 image. It proved:

- quorum-side publication continues after hard leader loss and network
  isolation, with at-least-once redelivery;
- Core NATS readiness can precede JetStream metadata placement readiness;
- rolling one-node restart preserves quorum and acknowledged writes;
- additive subjects and old/new durable consumers can coexist;
- one JetStream message ID deduplicates across subjects in the same stream;
- global stream sequence is not cross-aggregate business ordering.

The compatible default is expand, deploy a parallel consumer, coexist, backfill
with a route-scoped transport deduplication ID while preserving domain `eventId`,
verify lag and business effects, then retire the old route in a later controlled
step. Inbox deduplication remains mandatory across both routes.

An additional isolated matrix passed 32/32 checks in two independent runs. It
proved the exact R3 server path `2.14.2 -> mixed -> 2.14.3`, one-node-at-a-time
downgrade to `2.14.2`, and repeat roll-forward while publishers and a durable
consumer remained active. Across 2,081 acknowledged events, the application
recorded exactly 2,081 effects.

The same matrix persisted and killed a topology coordinator after each stage:

```text
PREPARED -> EXPANDED -> PARALLEL_CONSUMER -> DUAL_ROUTE
-> BACKFILLED -> PROVED -> CUTOVER -> RETIRED
```

It reconciled actual JetStream state after restart, recovered an ambiguous
publish with the original route-scoped transport identity, preserved domain
`eventId`, and deduplicated the business effect. Rollback remained safe while the
old route and consumer existed. After `RETIRED`, rollback failed closed.
Incompatible or destructive diffs were rejected before a NATS mutation, and an
unrelated bounded context continued topology work and traffic.

The retained `Hosted JetStream R3 topology`,
`NATS 2.14.3 R3 topology follow-up`, and
`Mixed-version NATS and topology migration` fingerprints are in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

This proves only the exact adjacent patch pair and tested topology. Production
abort thresholds, maximum mixed-version dwell, backup and restore manifests,
arbitrary downgrade after new store/config features, corruption or disk pressure
during rollout, TLS rotation, multi-region deployment, and long soak remain open.

## Resolution

Open.
