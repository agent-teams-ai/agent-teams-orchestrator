---
id: ADR-0061
type: adr
status: accepted
owner: clients/sdk
summary: Scope durable command identity by canonical resource scope and server-owned command family without a central operation write registry.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - ADR-0016
  - ADR-0025
  - OD-016
  - OD-019
  - architecture.public-control-contracts
supersedes:
  - ADR-0018
---

# ADR-0061: Command-Family-Scoped Durable Operations

## Context

ADR-0018 correctly selected one client-generated `commandId`, durable Operation
resources, typed unknown outcomes, semantic fingerprints, and separate result and
tombstone retention. It incorrectly required a command ID to be unique across all
durable commands in one project.

Enforcing that rule would require a central command registry to participate in
every bounded-context write. That would conflict with context-scoped Units of
Work, make the registry a second owner of feature Operations, and introduce a
cross-context serialization point. Leaving the rule unenforced would make the
public guarantee false.

The API still needs deterministic reconciliation after a lost response without
asking clients to manage a second idempotency key or understand internal package
topology.

## Decision

Every durable public command has one client-selected lowercase RFC 9562 UUIDv4
`commandId`. It remains the only caller-supplied idempotency identity. The SDK may
generate it, permits a caller-supplied value, preserves it across transport
retries, and tells crash-safe callers to persist it before the first send.

The complete command identity is:

```text
CanonicalCommandScope + CommandFamily + commandId
```

`CanonicalCommandScope` is the authenticated canonical parent scope of the
command. Current project commands use `TenantId + ProjectId`; future tenant-level
commands may use a tenant scope without inventing a fake project. A payload cannot
select a different scope.

`CommandFamily` is a stable, server-owned semantic identifier such as
`runs.create` or `messages.send`. It is derived from the invoked API capability
and is never accepted as caller authority. Transport routes, API aliases, or
compatible API versions may map to the same family only when they preserve the
same application-command semantics, result contract, authorization scope, and
fingerprint rules. A breaking semantic change uses a new family.

Each family has one feature owner. The owning feature atomically persists its
command receipt, Operation state, domain changes, and outbox records in one local
Unit of Work. Its uniqueness constraint is equivalent to:

```text
UNIQUE(canonical_command_scope, command_family, command_id)
```

There is no central durable command registry and no cross-context command
transaction. A static composition registry validates unique family ownership and
routes Operation queries and commands to the owning feature. It owns no Operation
state.

The same complete command identity and semantic fingerprint returns the existing
Operation or retained result. Reusing it with another fingerprint is a conflict.
The same UUID may be used in another command family because it identifies a
different logical command. Correlation and causation IDs connect related
commands; reusing one public command identity across families does not.

Fingerprinting uses the normalized application command and versioned
canonicalization, never serialized Protobuf bytes. The command family, semantic
command type, canonical scope, and all effect-relevant inputs participate in the
fingerprint. Canonicalization remains available while matching tombstones remain.

Durable acceptance creates an addressable Operation. Its resource identity is
deterministic from canonical scope, command family, and command ID. The exact
opaque resource-name encoding remains governed by OD-019. A client can reconcile
an unknown response by safely replaying the same API method and command ID or by
using the deterministic Operation reference exposed by the handwritten SDK.

The public Operations service is a federated routing facade:

- `Get`, `Wait`, and cancellation requests route to the feature owner encoded by
  the Operation identity;
- per-feature Operation state remains authoritative;
- cross-feature lists are query-composed projections and may be eventually
  consistent;
- the facade never becomes a second lifecycle owner or a write registry.

Composite product actions have one owning process manager and one public command
identity. Internal feature commands use deterministic internal identities scoped
to their owner and causation; they are not additional public idempotency keys.

The durable Operation lifecycle remains:

```text
pending
running
cancellation-requested
succeeded
failed
cancelled
```

Terminal outcomes are immutable. Polling, queries, and subscriptions expose the
same terminal outcome. The three durability horizons remain distinct:

1. active Operation state;
2. full command receipt and result;
3. compact reuse-detection tombstone.

After full-result expiry but before tombstone expiry, result expiry is explicit
while key reuse remains detectable. After tombstone expiry, the service no longer
claims historical reuse detection.

Transport deadline, local wait cancellation, command validity, durable business
cancellation, and privileged force termination remain separate. Disconnect,
`AbortSignal`, timeout, or SDK close stops only local I/O unless a separate
feature command or explicitly selected client-bound policy requests business
cancellation.

Automatic retry is limited to reads and commands made safe by the complete stable
command identity. A failure proven before commit may be retried. A lost
acknowledgement after possible commit returns a typed unknown outcome and is
reconciled through the same command identity; it never creates a new logical
command.

## Consequences

- Feature-owned Units of Work remain atomic and independent.
- The public API keeps one caller-supplied idempotency value.
- Different command capabilities may safely reuse the same random UUID.
- Operation lookup needs stable family routing and an opaque deterministic name.
- A project-wide Operation list is a projection, not a global transaction table.
- SDK handles must persist the complete Operation name, not reconstruct ownership
  from only a bare command ID.
- Renaming an API method does not silently change idempotency semantics.

## Rejected alternatives

- A project-wide central command registry participating in every feature write.
- Best-effort project-wide uniqueness with no enforcing consistency boundary.
- Caller-supplied `CommandFamily` or a second public idempotency key.
- One unrelated command ID reused as cross-feature correlation identity.
- A global Operations aggregate that owns feature command lifecycles.

## Evidence

- [Google AIP-151: Long-running operations](https://google.aip.dev/151)
- [Google AIP-155: Request identification](https://google.aip.dev/155)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- The isolated 2026-07-25 persistence-failure spike retained by ADR-0018 remains
  applicable to each feature-owned Operation implementation.
