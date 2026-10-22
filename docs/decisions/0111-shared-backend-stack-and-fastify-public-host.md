---
id: ADR-0111
type: adr
status: accepted
owner: architecture
summary: Adopt the shared backend reference and select Fastify with Connect for the public Node Host without changing private RPC or domain ownership.
approved_by: product-owner
accepted_at: 2026-10-22
related:
  - ADR-0016
  - ADR-0027
  - ADR-0105
  - ADR-0106
  - ADR-0107
  - ADR-0109
  - architecture.sdk-transports
  - architecture.overview
  - OD-001
  - OD-005
  - OD-012
---

# ADR-0111: Shared Backend Stack and Fastify Public Host

## Context

The product owner explicitly requests recording the agreed backend stack in a
shared organization source and keeping frontend choices separate. Public
Connect, private gRPC through Dapr, and direct JetStream delivery already have
different owners. The public Node HTTP hosting framework remained unspecified.

Confusing those layers would either remove the public application boundary or
introduce unnecessary internal calls through the public API. A shared reference
must preserve product-owned decisions and exact dependency pins rather than
silently upgrading or installing an entire infrastructure stack.

## Decision

### Shared reference and local adoption

Adopt the applicable backend responsibilities in the organization
[backend stack reference](https://github.com/agent-teams-ai/.github/blob/4dcf4ffe29279e479e089bc06f745dd1a62f12d1/docs/backend-stack.md).
That exact revision is the reviewed source for this adoption. The central
document owns the reusable technology catalog; Orchestrator keeps its semantic
owners, exact contracts, module adoption pins, deployment scope and evidence.
Later central changes require review through the applicable local decision
process. A navigation link to central `main` does not update this adoption.

The current [composition](../architecture/composition-and-dependency-injection.md),
[persistence](../architecture/persistence-boundary.md),
[eventing](../architecture/eventing-and-reliability.md), and
[deployment profiles](../architecture/deployment-profiles.md) remain the local
rules. Their existing decisions select the applicable mechanisms and their
boundaries. This reference adoption changes no existing version or release gate.
Node.js and TypeScript remain the primary backend runtime. A Go or Rust service
requires a concrete technical advantage and the same consumer contract evidence;
it does not require executing the TypeScript composition library.

### Public Node HTTP host

Select Fastify for the public Node HTTP Host. Register Connect handlers through
the official `@connectrpc/connect-fastify` plugin in the same server and process.
Fastify hosts HTTP lifecycle and routes; feature-owned Connect adapters map
validated public messages into framework-independent application input ports.
Composition constructs each capability once and passes its handles to the
inbound adapters. Fastify, Connect and generated wire types stay out of domain
and application code.

This plugin registration introduces no extra network hop between Fastify and
Connect. It is not a claim of zero framework overhead. Webhooks and other actual
HTTP routes can share that Host when their ownership and trust boundary permit.
Neither framework nor Dapr replaces application authorization or tenant scope.

### Internal calls and alternate public adapters

Within a declared role, ordinary calls remain typed local collaboration. An
outbound private RPC adapter uses the owning standard gRPC contract through Dapr
only for an actual process boundary. Internal code does not call its own public
HTTP API to reach that adapter. Dapr still forwards to a receiving service's
server and handlers; it does not implement the public product API.

Private gRPC services and durable workers do not acquire a mandatory Fastify
dependency. They use the appropriate server or consumer adapter for their
declared role. JetStream consumers invoke their owning application port directly.
Public and private RPC methods remain separate contract surfaces even where
their implementations reuse a protocol library or application capability.

The existing [additional API adapter boundary](../architecture/sdk-and-transports.md#additional-client-api-styles)
allows a future GraphQL adapter to invoke the same owned commands and queries.
It does not select GraphQL now or expose private context storage to resolvers.

### Qualification and remaining choices

This decision adds no runtime dependency or production scaffolding. The first
public Host implementation must qualify the chosen Fastify/Connect versions
against the existing public contract and deployment probes: authentication,
trusted scope, typed failures, payload bounds, cancellation, streaming and
admission before drain. Existing probes should cover those risks without a
second framework-specific copy of the same behavior tests.

The HTTP/1.1 local UDS contract and Windows transport choice remain under OD-001;
selecting a framework does not prove native local packaging or transport parity.
The accepted scale and service-role obligations remain under ADR-0109.

Temporal keeps the boundary fixed by ADR-0027. LangGraph remains an unselected
candidate whose possible execution-side ownership is recorded under OD-005.
The provisional IAM direction does not resolve OD-012 or qualify providers.
Frontend, mobile UI and desktop-shell technology choices are outside this ADR.

## Consequences

- Backend choices have one reusable reference, with explicit local adoption and
  no duplicated version catalog.
- Public RPC and ordinary HTTP routes share a maintained server integration.
  Its plugin and lifecycle compatibility become part of the Host's existing
  release qualification.
- Application behavior remains independent of Fastify, Connect and Dapr, while
  actual service boundaries retain their network and failure costs.
- This additive choice preserves earlier accepted ADRs and does not resolve the
  separate pending integration of the architecture branches with main.

## Rejected alternatives

- Dapr as a replacement for the public application API: invocation infrastructure
  does not supply product handlers, application authorization or public contracts.
- A separate Fastify proxy in front of a separate Connect server in each Host:
  the official plugin already hosts those handlers in one server.
- Fastify in every worker and every private service: roles that need no public
  HTTP host should not carry that dependency merely for uniformity.
- Only a built-in Node HTTP adapter for the public Host: valid for a narrow RPC
  service, but the selected Host also needs ordinary HTTP integration points.
- A copied stack table and moving package versions in every product: it creates
  conflicting sources and hides local adoption responsibility.
