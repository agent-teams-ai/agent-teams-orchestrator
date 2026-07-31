---
id: ADR-0071
type: adr
status: accepted
owner: clients/sdk
summary: Separate caller request idempotency from server-owned Operation identity and route Operations without a central write registry.
approved_by: product-owner
accepted_at: 2026-07-31
related:
  - ADR-0016
  - ADR-0025
  - OD-016
  - OD-019
  - architecture.public-control-contracts
supersedes:
  - ADR-0061
---

# ADR-0071: Separate Request ID and Routed Operation Identity

## Context

ADR-0061 correctly removed project-global command-ID uniqueness and kept
feature-owned command receipts and Operations. It still derived durable
Operation identity from the caller idempotency value.

That couples resources with different lifetimes. Request deduplication has a
bounded reuse-detection horizon, while an Operation name must never be reused or
silently change when ownership moves. Deterministic names also make an expired
request key unsafe to reuse and cannot route old Operations after a capability is
extracted without fan-out, a permanent compatibility hop, or a central registry.

## Decision

Every durable public command carries one caller-generated lowercase RFC 9562
UUIDv4 `requestId`. It is the only caller-supplied idempotency value. Internal
application code may represent it with a `CommandId` value object, but public wire
contracts and generated SDKs call it `request_id` or `requestId` to avoid
presenting it as durable resource identity.

The complete idempotency scope is:

```text
CanonicalCommandScope + CommandDescriptor + requestId
```

`CommandDescriptor` is a stable server-owned semantic identifier such as
`run.start.v1`. The same scope, descriptor, request ID, canonicalization version,
and semantic fingerprint returns the retained command outcome. Another
fingerprint is an idempotency conflict. A request ID may occur under another
descriptor without collision.

Durable acceptance atomically persists, within the owning bounded context:

```text
command receipt
+ server-generated Operation
+ domain changes or process state
+ first outbox or dispatch intent
```

The server generates a distinct immutable Operation resource name:

```text
tenants/{tenant}/projects/{project}/operations/{kind}-{routeKey}-{serverId}
```

- `kind` is a broad stable public routing family such as `run`, `team`, or
  `work`. It is not a package, bounded-context, service, database, or region name.
- `routeKey` is an opaque immutable routing bucket such as `r01`. It identifies
  one serving generation without exposing deployment topology.
- `serverId` is a server-generated RFC 9562 UUID treated as opaque. Its concrete
  version is an adapter-local generation choice and not client semantics.
- Clients persist and compare the complete name. They never parse, construct, or
  authorize from its components.

A machine-readable Published Operation Catalog owns immutable `kind`, descriptor,
resource grammar, response type, metadata type, and cursor contract declarations.
A deployment-specific routing manifest maps `kind + routeKey` to one logical
compatibility owner. Neither artifact stores Operation lifecycle or domain state.

Extraction or ownership migration uses expand, switch, and drain:

```text
publish new route support
-> prove target compatibility
-> mint new Operations under a new routeKey
-> keep the old routeKey served by its current owner
-> drain active state and retention horizons
-> retire only after proof
```

Routing entries are append-only while any matching Operation, result, cursor,
receipt, or tombstone may remain valid. Moving one active Operation independently
is prohibited unless a future ADR introduces a per-Operation directory or a
verified transfer protocol.

Unknown command outcomes resolve through exact replay or
`ResolveCommandOutcome(scope, commandDescriptor, requestId)`. Resolution returns
one typed result:

```text
accepted -> Operation name
rejected -> retained rejection
expired  -> outcome no longer available
not_seen -> no durable receipt is known
```

The reuse-detection tombstone horizon cannot end before command validity plus
clock-skew and recovery grace. SDKs never intentionally reuse request IDs and
persist a serializable pending-command handle before first send. After acceptance
they persist a separate serializable Operation handle.

The public Operations facade remains stateless. `Get`, `Wait`, and cancellation
requests route by the opaque Operation name. `ListOperations` and client-driven
`DeleteOperation` are not provided in v1. Cross-context lists, when introduced,
are query-composed projections.

## Consequences

- Idempotency and durable resource identity have independent, honest lifetimes.
- Feature-owned Units of Work remain atomic without a central write registry.
- Capability extraction can drain old routing buckets without changing public
  Operation names.
- Public handles contain both request recovery and Operation resource identity;
  SDK types must make their different purposes explicit.
- Routing catalogs, activation barriers, retention proofs, and migration
  conformance add infrastructure complexity before service extraction.
- ADR-0061 is superseded; its fingerprinting, exact replay, cancellation, and
  separate retention-horizon decisions remain in force where not replaced here.

## Rejected alternatives

- Derive Operation identity from a bounded-lifetime request ID.
- Enforce project-global request-ID uniqueness through a central registry.
- Use an opaque server ID with a global per-Operation routing directory.
- Encode a bounded-context, service, region, or database name in public identity.
- Switch all old and new Operations to a new owner without fencing and draining.

## Evidence

- [Google AIP-122: Resource names](https://google.aip.dev/122)
- [Google AIP-151: Long-running operations](https://google.aip.dev/151)
- [Google AIP-155: Request identification](https://google.aip.dev/155)
- [Google AIP-180: Backwards compatibility](https://google.aip.dev/180)
- [RFC 9562: Universally Unique IDentifiers](https://www.rfc-editor.org/rfc/rfc9562.html)
