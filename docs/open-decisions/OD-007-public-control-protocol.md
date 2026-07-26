---
id: OD-007
type: open-decision
status: resolved
owner: platform/control-api
summary: Select the public request-response and streaming protocol for orchestrator clients.
related:
  - architecture.sdk-transports
  - architecture.public-control-contracts
  - ADR-0016
  - OD-001
  - OD-016
---

# OD-007: Public Control Protocol

## Decision required

Compare HTTP, gRPC, and JSON-RPC for streaming, multi-language clients, browser
support, local desktop operation, and schema generation.

## Accepted constraints

Public contracts stay outside domain/application models. Control and integration
event contracts have separate owners, mappings, and compatibility policies.

## Resolution

Resolved by ADR-0016. Feature-owned Protobuf is canonical for the public control
API, Buf owns format/lint/generation/breaking checks, and Connect is the primary
remote protocol. Feature-owned JSON Schema remains canonical for integration
events.
