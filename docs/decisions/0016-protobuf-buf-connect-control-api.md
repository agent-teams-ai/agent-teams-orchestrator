---
id: ADR-0016
type: adr
status: accepted
owner: platform/control-api
summary: Use feature-owned Protobuf contracts, Buf checks, and Connect for the public control API.
related:
  - ADR-0005
  - ADR-0015
  - OD-001
  - OD-007
  - OD-008
---

# ADR-0016: Protobuf, Buf, and Connect Control API

## Context

The public control API must support browser, Node.js, Go, and future Rust clients,
including commands, queries, long-running operations, and resumable server
streams. JSON Schema describes data but does not define RPC services or streaming
methods. Treating JSON Schema and Protobuf as co-equal control sources would
create compatibility drift.

Integration events have a different audience and lifecycle from client control
operations. They must not be generated from control RPC messages merely to reuse
fields.

## Decision

Feature-owned `.proto` files are the only canonical wire source for the public
control API. Protobuf packages carry an explicit major API version. Inbound
Connect adapters map generated messages into transport-independent application
models; domain and application code never import generated Protobuf types.

Connect is the primary remote protocol for official SDKs. The same Protobuf
service definitions may be served through gRPC and gRPC-Web when a deployment
requires them. Public v1 uses:

- unary RPCs for commands and queries;
- server-streaming RPCs for subscriptions;
- no client-streaming or bidirectional RPC in the supported browser profile.

Large artifacts and uploads use bounded unary metadata plus artifact references or
dedicated transfer adapters. They are not forced through an unbounded RPC stream.

Official SDK transports use binary Protobuf by default. ProtoJSON remains useful
for diagnostics and explicitly supported HTTP clients, but it is not a second
contract source and cannot weaken compatibility requirements.

Buf runs locally and in CI:

- `buf format` and `buf lint` with the `STANDARD` rules;
- deterministic generation with pinned plugins;
- generated-code drift checks;
- `buf breaking` against the accepted baseline.

Before public v1, `FILE` breaking reports require explicit review but do not block
legitimate initial design changes. After public v1, `FILE` becomes a blocking
gate. Buf Schema Registry is optional; local and Git-based checks remain
sufficient.

The released v1 descriptor image is the compatibility baseline. Reserving a
removed field name or number prevents future reuse but does not make the removal
`FILE` compatible. Existing v1 fields remain present and deprecated until a new
breaking major.

Feature-owned integration events use JSON Schema Draft 2020-12 as their canonical
payload source. Control Protobuf messages and integration-event schemas always
have explicit mappers. Neither is generated from the other.

SDK SemVer, Protobuf API package version, Connect protocol version, and integration
event schema version are separate. Clients never silently downgrade a public API
major version. Capability discovery reports supported features and limits and is
refreshed after reconnect.

## Consequences

- Service methods, streams, and messages have one multi-language control IDL.
- Browser and server SDKs share unary and server-streaming semantics.
- Generated stubs remain useful without becoming the product SDK.
- Integration events can evolve for asynchronous consumers without coupling them
  to RPC request shapes.
- A REST-first API can be added later as another inbound adapter, but it cannot
  become a second canonical control contract.
- Initial contract tooling and mapping code add deliberate implementation cost.

## Rejected alternatives

- Use JSON Schema as the source for both control RPCs and integration events.
- Maintain hand-authored JSON Schema and Protobuf as co-canonical control IDLs.
- Make OpenAPI the initial control IDL; it is viable for a future REST-first
  adapter but provides less direct support for this RPC and feed model.
- Make NATS subjects the normal public SDK transport.

## Evidence

- [Connect protocol](https://connectrpc.com/docs/protocol/)
- [Connect multi-protocol support](https://connectrpc.com/docs/multi-protocol/)
- [Connect web clients](https://connectrpc.com/docs/web/using-clients/)
- [Buf breaking-change detection](https://buf.build/docs/breaking/)
- [Buf lint](https://buf.build/docs/lint/)
- The isolated 2026-07-25 protocol-evolution matrix passed 36/36 checks across
  previous/current TypeScript and Go clients and servers with exact-pinned
  Protobuf-ES 2.13.0, Connect 2.1.2, connect-go 1.20.0, and Buf 1.72.0.
