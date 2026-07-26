---
id: OD-004
type: open-decision
status: open
owner: integration/runtime
summary: Define exact consumer-owned runtime capability ports and AR contract mappings.
related:
  - ADR-0003
  - ADR-0008
  - ADR-0028
  - architecture.runtime-boundary
---

# OD-004: Exact Runtime Capability Ports

## Decision required

Complete a capability matrix against `ar`, OpenCode requirements, managed resume,
streaming, runtime permissions, snapshots, topology, and recovery. Define exact
consumer-owned port methods, application models, mappings, and conformance suites.

## Accepted constraints

ADR-0028 fixes Runtime Published Language ownership, product-versus-runtime
semantics, the AR-internal execution fence, and separate inbound event and outbound
command adapters. This decision must select any external permission concurrency
guard without exposing or reconstructing `ExecutionFence`.

## Resolution

Open.
