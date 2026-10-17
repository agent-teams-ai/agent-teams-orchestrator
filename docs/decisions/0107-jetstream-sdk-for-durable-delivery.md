---
id: ADR-0107
type: adr
status: accepted
owner: platform/eventing
summary: Use the official modular NATS SDK for shared durable pull consumers and keep service RPC separate from durable delivery.
approved_by: product-owner
accepted_at: 2026-10-17
supersedes: []
superseded_by: []
related:
  - ADR-0004
  - ADR-0010
  - ADR-0035
  - ADR-0105
  - architecture.eventing
  - architecture.local-host-lifecycle
  - architecture.sdk-transports
  - architecture.testing
---

# ADR-0107: JetStream SDK for Durable Delivery

## Context

The accepted eventing profile already requires the modular NATS SDK, shared
durable pull consumers, and context-owned outbox and inbox semantics. The
Moleculer placement discussion reopened whether `@moleculer/channels` should
replace that adapter or receive a product-maintained pull implementation. The
product owner delegated the final delivery choice on 2026-10-17.

The [reviewed Channels 0.3.1 adapter](https://github.com/moleculerjs/moleculer-channels/blob/16d6aec31c04b127b0c818d24f324e0235a82517/src/adapters/nats.js)
uses push subscriptions and the monolithic `nats` client. Push delivery is a
valid broker model, but it does not implement this product's selected consumer
profile. Source inspection also found paths that swallow a failed dead-letter
publication before the caller acknowledges the original message, and shutdown
paths requiring separate bounded-lifecycle qualification. These are static
observations, not reproduced production incidents.

The [official JetStream SDK](https://github.com/nats-io/nats.js/blob/95e76e79d9feaa0a0bf3b0e8da526ec5a3460979/jetstream/README.md#consuming-messages)
already provides buffered pull consumption and shared-consumer replication. The
product needs an adapter for its declared delivery semantics, not a second
framework event bus or a new broker protocol implementation.

## Decision

### Adapter and responsibility

Use `@nats-io/transport-node` and `@nats-io/jetstream` behind the existing
broker-neutral delivery ports. Local and hosted compositions use the same
adapter family. The SDK supplies connection and consumer protocol mechanics;
the adapter supplies topology mapping, bounded admission, publication outcomes,
and acknowledgement according to the owning contract.

The SDK's `consume()` replenishes its buffer as messages are yielded. Buffer
size does not limit concurrently running application handlers; the adapter also
enforces bounded handler admission and the declared acknowledgement policy.

`@moleculer/channels`, a Channels fork, and the deprecated monolithic `nats`
package are not part of this durable-delivery profile. No production dependency
or runtime implementation is introduced before its existing readiness gates.

Each logical subscription has one durable pull-consumer identity shared by its
handler replicas. Different semantic subscribers have distinct consumers and
inboxes. Consumers are not created per agent, user, or replica. Each semantic
publication has one configured durable publisher and a stable event identity.

### Commit, acknowledgement, and failure

The inbound adapter validates the transport envelope and feature-owned schema,
applies the consumer-owned ACL, and invokes the owned application port through
the existing inbox and Unit of Work boundary. Acknowledgement follows durable
commit of owned state and required next intents. Calling that port does not
require another Moleculer RPC hop.

Failed or ambiguous outbox publication remains recoverable under the original
event identity. A lost commit response or broker acknowledgement does not prove
the operation failed. Inbox deduplication, command receipts, and owner reconciliation remain
required. External effects follow their durable intent and retain separate
idempotency and unknown-outcome handling.

`MaxDeliver` is not a dead-letter store. The selected terminal-handling policy
records its durable quarantine evidence and any required dead-letter publication
before acknowledgement. A failure of either required step must not acknowledge
the original message. Redelivery and operator recovery use the same semantic
identity and recorded terminal decision.

Application policy classifies retryable work; JetStream performs redelivery.
RPC uses one retry budget per logical operation across its hops, with an
end-to-end deadline and stable identity for mutating commands. This does not
require command receipts for ordinary read queries or create a global retry
coordinator. Optional Moleculer automatic retries remain disabled unless
the capability explicitly qualifies them; no retry setting removes inbox or
external-effect idempotency obligations.

### Lifecycle and service RPC

Get Modular composition owns process-wide connections and adapter resources.
The Local Supervisor owns a bundled `nats-server` process in the future Fully
Local profile; server profiles connect to externally operated NATS. The broker
process owner does not interpret business events or acknowledge them.

Shutdown stops new admission and pulling, drains admitted work within a bounded
deadline, and leaves unacknowledged work recoverable. Broker and adapter startup
must reconcile their existing topology and integrity requirements before
claiming readiness.

ADR-0105 remains a proposal for portable private RPC and an optional justified
Node.js Moleculer group. Neither a registry nor a second RPC transport is added
to work already served by Connect or JetStream. Disposable core events are
allowed only when their loss is explicitly permitted by the owner.

### Qualification

Before production use, the concrete SDK version and adapter must prove replica
sharing, bounded consumption, acknowledgement after commit, duplicate handling,
lost commit acknowledgement, failed and ambiguous publication, failed quarantine,
and interrupted shutdown recovery. Existing per-tenant admission, ordering,
retention, and local or clustered readiness requirements remain authoritative.
Documentation and source inspection do not substitute for those executable
checks or establish a workload capacity claim.

## Consequences

- One durable delivery adapter preserves the existing event contracts and
  deployment model without a Channels compatibility layer.
- The product still implements its own narrow semantic mapping and conformance
  fixtures; a broker SDK cannot supply business idempotency or recovery policy.
- Moleculer selection and dependency qualification remain separate from durable
  delivery and cannot silently add another publisher or consumer owner.

## Rejected alternatives

- Adapt or fork Channels solely to obtain pull consumption: adds a maintained
  framework integration while the official SDK already supports the mechanism.
- Change the selected consumer profile merely to reuse Channels: reverses the
  responsibility between product delivery requirements and library defaults.
- Use core Moleculer events for required durable work: does not preserve the
  accepted persistence, acknowledgement, replay, and reconciliation contracts.
- Route every JetStream message through Moleculer RPC: adds a timeout, retry,
  and failure boundary without a demonstrated application requirement.
