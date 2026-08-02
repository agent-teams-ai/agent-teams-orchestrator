---
id: OD-004
type: open-decision
status: open
owner: integration/runtime
summary: Define exact consumer-owned runtime capability ports and AR contract mappings.
related:
  - ADR-0003
  - ADR-0079
  - ADR-0080
  - ADR-0028
  - architecture.runtime-boundary
  - research.legacy-electron-opencode-behavior-audit-2026-07-30
---

# OD-004: Exact Runtime Capability Ports

## Decision required

Complete a capability matrix against `ar`, OpenCode requirements, managed resume,
streaming, runtime permissions, snapshots, topology, and recovery. Define exact
consumer-owned port methods, application models, mappings, and conformance suites.

The matrix must cover at least:

- capability and execution-proof discovery with freshness and binding identity;
- runtime-session establishment without assuming provider process topology;
- context application that does not create a model turn;
- runtime input acceptance, processing, visible output, and ambiguous outcome as
  distinct evidence;
- technical permission requests and decision outcomes;
- control and output feeds with cursor, gap, and replay behavior;
- cancellation, stop, reattach, and recovery with unknown outcomes;
- contradictory provider observations normalized by AR rather than resolved by
  the Orchestrator.

## Accepted constraints

ADR-0028 fixes Runtime Published Language ownership, product-versus-runtime
semantics, the AR-internal execution fence, and separate inbound event and outbound
command adapters. This decision must select any external permission concurrency
guard without exposing or reconstructing `ExecutionFence`.

ADR-0079 fixes separate Orchestration Scope and Run Orchestration consumers,
target-specific cutoff, lifetime session-to-Run association, successor operation
semantics, and AR-owned pre-materialization prevention. Exact methods and wire
representations remain open but cannot collapse those boundaries.

AR owns exact provider-host adoption identity, cross-process startup
serialization, PID-reuse protection, provider-message ordering, and precedence
among provider-specific evidence sources. Orchestrator ports consume typed,
provider-neutral outcomes and never recreate those mechanisms.

## Resolution

Open.
