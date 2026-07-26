---
id: architecture.public-control-contracts
type: architecture
status: accepted
owner: platform/control-api
summary: Canonical control IDL, resource, operation, mutation, pagination, and feed contract rules.
related:
  - ADR-0016
  - ADR-0017
  - ADR-0018
  - ADR-0019
  - ADR-0020
  - ADR-0021
  - ADR-0023
  - ADR-0046
  - OD-016
  - OD-019
---

# Public Control Contracts

## Surface ownership

The repository has separate external contract surfaces:

| Surface | Canonical source | Normal transport |
|---|---|---|
| Public control API | Feature-owned Protobuf | Connect; compatible gRPC where required |
| Integration events | Feature-owned JSON Schema Draft 2020-12 | Broker-neutral publisher; JetStream adapter first |
| `ar` Runtime Published Language | `ar`-owned Protobuf | Runtime SDK/transport owned by `ar` |
| Handwritten SDK API | Language source plus API report | Internal SDK backend |

Control messages, integration events, runtime messages, application models, and
domain models never become aliases of one another. Feature-owned mappers cross
each boundary.

## Control service profile

Public v1 supports unary command/query RPCs and server-streaming subscriptions.
Client-streaming and bidirectional RPCs are outside the browser-compatible v1
profile. Artifact transfer uses dedicated bounded adapters.

Official transports prefer binary Protobuf. ProtoJSON is an interoperability and
diagnostic representation, not a second schema. Connect durability is not assumed;
durable state, operation receipts, and feed replay live in orchestrator
persistence.

API major version is encoded in the Protobuf package and service path. SDK SemVer,
Connect protocol version, and event schema versions remain independent. A
capability query returns supported API versions, operations, feed behavior, and
limits. There is no silent major-version downgrade.

## Cross-language profile

Contracts follow ADR-0017. In particular:

- identities and cursors are opaque strings;
- semantically meaningful presence is explicit and permanent;
- `null` is not an implicit clear operation;
- unions use `oneof`;
- enums preserve unknown values;
- exact 64-bit values never pass through JavaScript `number`;
- time and durations use Protobuf common types;
- dynamic `Struct` or unbounded payloads are prohibited;
- artifacts replace large inline data.

Machine linting enforces the profile. Generated code is never hand-edited.

## Exact-value profile

Authoritative counts, quantities, rates, and money follow ADR-0046:

- exact integers and decimals use canonical string fields at JSON boundaries;
- quantity contracts carry explicit unit and semantic basis;
- decimal contracts carry scale when representation or rounding depends on it;
- money carries exact amount and currency;
- unit prices additionally carry denominator quantity and rate-card version;
- rounding results identify mode, target scale, and algorithm version when they
  become durable business facts;
- generated language numeric types, JavaScript `number`, ProtoJSON numbers, and
  database numeric types never become the canonical exact-value representation.

Contract conformance round-trips values above `Number.MAX_SAFE_INTEGER`, trailing
scale, negative values, zero, maximum accepted precision, and malformed or
non-canonical inputs across binary Protobuf and ProtoJSON.

## Resource and scope model

Public resources have stable relative names containing their ownership hierarchy,
for example:

```text
tenants/{tenant}/projects/{project}/teams/{team}
tenants/{tenant}/projects/{project}/runs/{run}
tenants/{tenant}/projects/{project}/operations/{commandId}
```

Exact collection names remain feature-owned, but every name is globally
unambiguous within one API. IDs are not reconstructed from display names, paths,
provider sessions, or database keys.

Tenant and project scope in resource names, immutable SDK scope, and authenticated
authority must agree. Payload fields cannot select a different trusted scope.
OD-019 completes exact resource patterns.

## Commands and operations

Immediate validation failure before durable acceptance is an RPC error. Durable
acceptance returns an operation.

`commandId` is the one public idempotency identity. A crash-safe caller persists
it before sending. Operation lookup by deterministic project-scoped name supports
reconciliation after an unknown response.

Operation handles are serializable and connection-free. They expose:

- operation name and command ID;
- accepted and last-update times;
- current non-terminal phase;
- immutable terminal result or error;
- result-retention and reuse-detection expiry when disclosed;
- explicit poll, wait, refresh, and cancellation-request methods.

Waiting cancellation affects only the wait. Business cancellation and privileged
force termination are explicit commands.

## Mutations and concurrency

Domain transitions use feature-specific commands. Editable metadata/configuration
uses a field mask and opaque ETag. Omitted fields remain unchanged; a masked field
is updated intentionally. Stale ETags are typed conflicts and are not
automatically retried.

JSON Patch, generic merge patch, full replacement, and public numeric aggregate
revisions are prohibited in v1.

## Queries and pagination

Every unbounded list is paginated from v1 with an opaque, integrity-protected
keyset token. The token binds scope, authorization subject, query, sort,
tie-breaker, consistency mode, watermark where applicable, and expiry.

Ordinary UI lists use declared live-keyset consistency. Bootstrap and
reconciliation lists use snapshot consistency. SDKs expose item and page
iterators, never an unbounded `toArray`.

## Feeds and recovery

Every subscription identifies one feed, ordering scope, retention policy, maximum
event size, cursor, and gap behavior. Delivery is at least once and duplicates are
identified by event ID.

The caller owns durable checkpoints. SDK buffers are bounded; slow consumers
receive a typed terminal outcome instead of silent loss.

Snapshots used for bootstrap carry the applied projection watermark and a cursor
that resumes strictly after it. Composite snapshots use a resume vector. Cursor
expiry requires a new snapshot or explicit reconciliation.

## Authentication boundary

SDK clients are immutable and scope through tenant/project subclients. A
concurrency-safe credential provider obtains credentials for exact audience,
scope, tenant, and delegation context. The provider owns refresh credentials and
single-flight refresh; the SDK transport applies short-lived access credentials.

Authenticated actor, subject, client, tenant, and delegation facts come from
verified transport context. They are not trusted from business payloads.

## Compatibility and tooling

Before public v1:

- Buf format and lint are blocking;
- deterministic generation and drift checks are blocking;
- `FILE` breaking reports require explicit approval.

After public v1, `FILE` compatibility is blocking. Incompatible semantics create a
new API package version. Official language SDKs run the same binary, ProtoJSON,
operation, pagination, error, and feed golden fixtures.
