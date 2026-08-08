---
id: ADR-0058
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Use Centrifugo as the default replaceable client realtime edge while context-owned durable feeds remain authoritative.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - ADR-0019
  - ADR-0030
  - ADR-0033
  - architecture.eventing
  - architecture.local-host-lifecycle
  - architecture.sdk-transports
  - architecture.security
  - OD-001
  - OD-021
---

# ADR-0058: Centrifugo Default Replaceable Client Realtime Edge

## Context

Desktop, browser, CLI, and third-party clients need low-latency updates,
reconnection, bounded recovery, authentication, and horizontal fanout. Building
and operating a custom WebSocket protocol would duplicate mature connection,
backpressure, recovery, and scaling behavior.

Realtime delivery is not the same responsibility as durable orchestration
eventing. JetStream delivers integration events between bounded contexts and
external integrations. Public client feeds are context-owned durable read
models. Connect carries commands, queries, snapshots, and reconciliation.
Centrifugo must not become another source of business truth.

An isolated macOS arm64 spike proved that Centrifugo can run as a zero-touch local
sidecar with acceptable startup, memory, authentication, reconnect, and fanout
behavior. The official downloaded binary was only ad-hoc signed, so a production
Desktop release must bundle it and apply nested signing and notarization rather
than downloading it on first launch.

## Decision

Centrifugo is the default client-facing realtime edge in local and hosted
compositions. It is replaceable infrastructure, never a domain, application, or
canonical public-contract dependency. A concrete SDK transport implementation
may import the Centrifugo client only behind its internal `RealtimeFeedBackend`;
that dependency and its protocol types never enter the public SDK surface.

The edge may carry any accepted bounded client feed projection, including
Conversation updates, recipient delivery projections, Work and Run changes,
notifications, alerts, control progress, and bounded operational output. It does
not merge those feeds, invent one global ordering, or own any of their semantics.
Large logs, attachments, and artifacts retain their dedicated feed or blob
contracts.

The authoritative flow is:

```text
owning bounded-context transaction
  -> state + durable client feed + realtime publication work
  -> commit
  -> realtime relay
  -> Centrifugo bounded history and live fanout
  -> SDK subscription backend
  -> checkpoint, gap detection, and authoritative resync
```

The context-owned durable application feed is the authoritative replay source,
independent of its SQLite or PostgreSQL persistence adapter. Centrifugo history is
a bounded reconnect cache. `recovered=false`, an expired position, a detected
gap, process restart, or unavailable history causes the SDK to resume from the
authoritative feed or repeat the documented snapshot-plus-cursor flow. Centrifugo
offsets and epochs never become public application cursors.

Commands, queries, durable command outcomes, initial snapshots, cursor
reconciliation, and mutations use the versioned Connect control API. Clients do
not publish product commands, messages, or domain events through Centrifugo.
Client publish and generic RPC are disabled in the default profile.

Each owning feature defines its public feed contract and classification. A
feature calls a narrow application port such as `ClientLivePublicationPort`; it
never imports Centrifugo types or channel names. The infrastructure adapter maps
an authorized feed publication into an opaque channel and a bounded client
projection. It may publish only a wake reference when the feature's data
classification prohibits inline content. Integration events and JetStream
envelopes are never forwarded directly to clients.

The handwritten SDK exposes capability-specific subscriptions. Its internal
`RealtimeFeedBackend` composes Centrifugo live delivery with Connect
snapshot/resume operations. Public SDK models expose application feed IDs,
events, cursors, and typed recovery outcomes, not Centrifugo clients, tokens,
channels, offsets, epochs, or errors. An alternative realtime adapter must pass
the same behavioral, security, recovery, and slow-consumer conformance suite.

Subscription establishment is Host-mediated. The SDK requests an opaque
subscription descriptor and short-lived token through Connect. The Host applies
the owning feature's scope validation and current Access Control decision before
the adapter encodes endpoint and channel details. Refresh repeats authorization;
neither the Supervisor nor the Local Connector mints product subscription tokens.

Authentication and authorization remain Host-owned:

- the Host issues short-lived, audience-bound, scope-limited subscription tokens;
- channel identifiers are opaque adapter details and do not grant access;
- tenant and resource scope come from authenticated context, never a requested
  channel name or publication payload;
- client publish, history, presence, and other capabilities are denied unless an
  accepted feature decision explicitly enables them;
- revocation uses bounded token lifetime, disconnect or unsubscribe control, and
  authoritative authorization checks during resync;
- presence and typing indicators, if later enabled, are non-authoritative hints.

Local composition uses a bundled, pinned, checksummed Centrifugo binary with the
memory engine. The Local Supervisor owns binary verification, nested code-signing
evidence, process availability, rotating endpoint, sidecar bootstrap credential,
health, bounded restart, staged activation, and cleanup. The owning feature
validates feed scope, Access Control provides the product authorization decision,
and the Host adapter encodes the resulting short-lived subscription token. The
Supervisor does not know channel names, feed semantics, subscription tokens,
subscriptions, or publication payloads.

Hosted composition uses the same adapter contract with platform-managed
Centrifugo. Redis-compatible engine configuration may provide horizontal
connection fanout and short recovery history, but SQL remains authoritative.
Cell, region, tenancy, capacity, and data-residency policy determine deployment;
the domain model does not.

Centrifugo failure degrades freshness, not command correctness. Connect commands,
queries, and snapshot/resume remain available. Durable realtime publication work
is retried, SDKs use bounded reconnect with jitter, and periodic or gap-triggered
authoritative reconciliation prevents a missed wake-up from becoming permanent
staleness.

The ownership matrix is:

| Concern | Authority | Centrifugo role |
|---|---|---|
| Domain state and business ordering | Owning bounded context | None |
| Durable client feed, snapshot, and application cursor | Owning feature | Bounded live projection only |
| Product grant, delegation, revocation, and authorization | Access Control plus owning use case | Enforce encoded subscription capability |
| Commands, queries, mutations, and reconciliation | Connect control adapter and owning use case | None |
| Integration events and cross-context delivery | Feature contracts and JetStream adapters | None |
| Realtime publication mapping and token encoding | Centrifugo adapter | Implement connection protocol and fanout |
| Public SDK subscription behavior | Handwritten capability SDK | Hidden internal backend |
| Local binary, endpoint, process health, and update | Local Supervisor | Managed sidecar |
| Hosted placement, Redis-compatible engine, and capacity | Hosted platform composition | Managed edge cluster |

Changing the default realtime product requires replacing the adapter and passing
the same conformance suite. It does not require changing domain, application,
feed, Connect, JetStream, or public SDK contracts.

## Consequences

- Desktop and hosted clients use one mature realtime protocol without a custom
  WebSocket server.
- Local users install and configure nothing manually.
- Durable replay, business ordering, authorization, and command handling remain
  outside Centrifugo.
- Local packaging gains a signed sidecar and Supervisor lifecycle gate.
- Hosted horizontal fanout may require Redis-compatible infrastructure, but that
  infrastructure remains replaceable and non-authoritative.
- The SDK and feature contracts need conformance fixtures for reconnect, gaps,
  duplicates, revocation, slow consumers, and authoritative resync.

## Rejected alternatives

- Build a custom WebSocket protocol as the default.
- Make Centrifugo history the durable mailbox or client event journal.
- Expose Centrifugo channel names, offsets, epochs, tokens, or errors as the
  public SDK contract.
- Send commands or direct client publications through Centrifugo.
- Reuse JetStream integration events as browser or Desktop feed payloads.
- Require local users to install or start Centrifugo manually.
- Make the Local Supervisor understand realtime business semantics.

## Evidence

- [Centrifugo stream history and recovery](https://centrifugal.dev/docs/server/history_and_recovery)
  explicitly treats history as a bounded cache and requires backend recovery
  when continuity cannot be proven.
- [Centrifugo engines and scalability](https://centrifugal.dev/docs/server/engines)
  documents the single-node memory profile and Redis-backed horizontal fanout.
- [Centrifugo channel permissions](https://centrifugal.dev/docs/server/channel_permissions)
  confirms that client capabilities are separately controlled.
- [Centrifugo Desktop spike, 2026-07-28](../research/centrifugo-desktop-spike-2026-07-28.md)
  records the measured local evidence and remaining release gates.
