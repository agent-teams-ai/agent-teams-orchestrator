---
id: ADR-0035
type: adr
status: accepted
owner: platform/eventing
summary: Bundle and supervise local NATS JetStream while keeping event contracts and orchestration core broker-neutral.
approved_by: product-owner
accepted_at: 2026-07-25
related:
  - ADR-0004
  - ADR-0033
  - architecture.eventing
  - architecture.local-host-lifecycle
  - OD-002
  - OD-009
  - OD-021
  - OD-022
---

# ADR-0035: Managed Local NATS JetStream

## Context

Local and hosted deployments need the same durable event-delivery semantics.
Normal local use must require no broker installation or administration, while the
orchestration core must remain independent of NATS.

A decision spike on an isolated Linux host exercised authenticated startup,
outbox and inbox crash windows, repeated `SIGKILL`, store ownership, resource
limits, backup and restore, upgrade and rollback, physical corruption, and real
filesystem exhaustion. All ten scenarios completed, but the spike exposed
failure behavior that must shape the architecture.

## Decision

Use NATS JetStream as the first production event-bus adapter in both deployment
profiles:

- local composition bundles a pinned, checksummed `nats-server`;
- the Local Supervisor owns its binary, process, physical store, external
  lifetime lock, health, backup coordination, staged activation, and resource
  lifecycle;
- hosted composition connects the same JetStream adapter family to externally
  operated NATS;
- inbound and outbound JetStream adapters separately own topology
  reconciliation, publish, consume, acknowledgement, and broker failure mapping;
- feature-owned event contracts own semantic delivery, ordering, privacy,
  retention, replay, and payload requirements.

The Supervisor never interprets subjects, creates semantic consumers, publishes
events, or acknowledges deliveries. The JetStream adapters never install, start,
stop, or upgrade the broker. Domain and application code depend only on
broker-neutral ports and contracts. Agent Runtime v1 has no NATS dependency.

Local use remains zero-touch. Desktop, CLI, and other local clients discover the
Orchestrator Host through the Local Supervisor and never connect to NATS
directly.

JetStream is an at-least-once delivery mechanism, not the source of truth for
aggregate state. Every producer uses a context-owned transactional outbox. Every
consumer applies a context-owned durable inbox and idempotent handler before
acknowledging. `eventId` may be used for broker publication deduplication, but
JetStream's duplicate window is only an optimization.

The local profile applies these mandatory safeguards:

1. The Supervisor holds one OS-level exclusive lock for the complete lifetime of
   each physical JetStream store. PID files and NATS process identity are not
   sufficient.
2. The durability-first default uses `sync_interval: always` until a later
   measured decision proves another setting.
3. Server and stream limits remain below the filesystem budget. The Supervisor
   monitors disk headroom independently and reserves enough space for controlled
   recovery.
4. A configured storage limit and physical `ENOSPC` are different typed
   conditions. After physical exhaustion, publication cannot be considered
   recovered until storage pressure is removed and a controlled restart plus
   reconciliation succeeds.
5. Loopback or another protected local transport, owner-only configuration,
   rotating credentials, and rotating endpoints are required. Exact bootstrap
   authority remains in OD-001 and OD-021.
6. Risky upgrades require a verified pre-upgrade backup and staged binaries.
   Compatibility is guaranteed only for tested version pairs.
7. Backup restore is verified into a fresh store. Corruption, unexplained stream
   truncation, and replay gaps produce a typed degraded state and reconciliation;
   successful broker startup is not proof of complete data.
8. Exact event-journal retention and catastrophic store-rebuild policy remain in
   OD-009. R1 local JetStream is never the sole authoritative copy of
   irreplaceable business facts.
9. Broker disconnect leaves undispatched work in the durable outbox. A timed-out
   in-flight publication has an ambiguous outcome and is retried with the same
   stable `eventId` only after reconnect and topology readiness.
10. Adapter drain is bounded and best-effort. A disconnected client may reject
    drain immediately, and status iterators are not lifecycle authority.
11. Topology reconciliation classifies additive, mutable, destructive, and
    immutable diffs before applying them. Destructive and immutable changes
    require the explicit migration policy selected by OD-022.

Implementation pins exact supported server and client versions in the lockfile,
packaging manifest, and compatibility matrix rather than in this ADR. The
maintained modular `@nats-io` packages are preferred over deprecated client
packages.

## Evidence

The isolated Linux spike measured approximately 19.2 MB idle RSS, 70 ms cold
startup, and 397 to 682 sequential durable messages per second with
`sync_interval: always`.

Important observed behavior:

- two standalone NATS processes opened the same store concurrently, proving the
  need for the external Supervisor lock;
- twelve rapid broker crashes preserved all messages but caused 64 duplicate
  deliveries of previously confirmed acknowledgements;
- broker publication deduplication survived restart;
- configured storage exhaustion returned a typed JetStream error, while physical
  `ENOSPC` surfaced as a timeout and required controlled restart;
- a corrupted message block allowed startup with only five of ten messages;
  restoring a verified backup recovered all ten;
- the tested 2.12.12 to 2.14.3 upgrade and tested rollback paths succeeded, but
  this is not a general compatibility promise.
- a publication started while disconnected timed out and succeeded only after
  retry following reconnect; disconnected drain rejected immediately;
- `max_ack_pending` suspended delivery at the configured bound and resumed after
  acknowledgement;
- additive stream subjects and selected consumer limits updated in place, while
  storage type and acknowledgement policy changes were rejected;
- subject removal applied in place and preserved stored messages, but new
  publication failed with a misleading low-level error.

Platform packaging, signing, arm64, Windows lifecycle, real power-loss behavior,
long-duration soak, and future version compatibility remain release gates rather
than reasons to change this system boundary.

## Consequences

- Local and hosted profiles share one eventing model and adapter conformance
  suite.
- Local users receive automatic broker lifecycle with no manual setup.
- The Supervisor gains operational complexity but no orchestration semantics.
- Context-owned inbox, outbox, idempotency, and reconciliation remain mandatory.
- Broker replacement remains possible without changing domain or application
  behavior.

## Rejected alternatives

- Use a separate SQLite event dispatcher as the default local transport.
- Put NATS types or subjects in domain, application, SDK, or Agent Runtime.
- Make local users install and manage NATS.
- Trust NATS itself to prevent concurrent ownership of one store.
- Treat broker deduplication as exactly-once business processing.
- Treat a single-node JetStream store as authoritative aggregate history.
