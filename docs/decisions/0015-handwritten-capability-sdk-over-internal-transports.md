---
id: ADR-0015
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Use handwritten capability-oriented SDK facades over generated contracts and internal official transports.
related:
  - OD-001
  - OD-007
  - OD-008
  - OD-016
  - OD-017
  - OD-018
  - OD-019
---

# ADR-0015: Handwritten Capability SDK over Internal Transports

## Context

The orchestrator must support Desktop, web, CLI, hosted services, and future
clients in more than one language. Generated protocol clients provide useful
wire types and RPC mechanics, but exposing them as the product SDK would couple
applications to one transport and make normal workflows awkward.

A single broad client or a public transport plugin interface would also freeze
unrelated capabilities, connection lifecycle, retries, streaming, and errors
before those contracts have been validated.

## Decision

Each supported language provides a handwritten, idiomatic SDK facade organized
by narrow product capabilities or resources. The facade contains transport and
contract behavior only; orchestration policy and domain state stay in the
orchestrator.

Generated schema bindings, protocol DTOs, and stubs remain lower-level artifacts
behind feature-owned mappers. They are not the root SDK surface. Public SDK
models do not reuse domain entities, application models, provider models, or
frontend DTOs.

Any accepted in-process, local-sidecar, and hosted transports are parallel
adapters behind one internal transport boundary. They implement the same
behavioral contract and conformance suite. Capability facades may share a
connection and lifecycle owner through composition. This ADR does not select the
production transports that remain open in OD-001 and OD-007.

The internal transport boundary is not a public third-party SPI in the first
version. Publishing an extension SPI requires a later ADR and a dedicated
compatibility suite.

The public behavioral contract includes:

- SDK SemVer independent from control-protocol schema versions;
- explicit capability and protocol negotiation;
- explicit client cleanup;
- local wait cancellation distinct from business cancellation;
- no implicit cancellation of durable work on disconnect;
- safe retries, stable idempotency keys, typed unknown outcomes, and
  reconciliation;
- opaque pagination and subscription cursors;
- language-idiomatic asynchronous streaming with declared ordering, buffering,
  retention, and recovery semantics;
- stable errors independent from transport-native status and exception types.

NATS configuration is not part of the normal public SDK programming model.
Generated clients may be published as a separate advanced surface only with an
explicit support and compatibility policy.

## Consequences

- Applications remain independent from the selected local or hosted protocol.
- Every supported language needs a small handwritten facade and mapping layer.
- Generated-code changes do not automatically become root SDK breaking changes.
- Accepted in-process and remote adapters require shared conformance tests.
- Package publication, exact control protocol, local-sidecar trust, and public
  error taxonomy remain separate open decisions.
- A future third-party transport ecosystem is possible, but its SPI is not
  accidentally frozen by the first release.

## Rejected alternatives

- Use generated RPC clients as the primary product SDK.
- Expose one broad client or runtime gateway containing every operation.
- Publish the first internal transport interface as a stable plugin SPI.
- Make NATS subjects, consumers, and broker lifecycle the normal SDK interface.
- Reuse domain entities, application commands, or frontend DTOs as SDK contracts.
