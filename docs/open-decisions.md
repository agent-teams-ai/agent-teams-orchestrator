# Open Architecture Decisions

These questions are intentionally unresolved. Agents must not choose an option in
implementation without an accepted ADR.

## OD-001: Local desktop control transport

Decide how Electron communicates with the automatically managed local orchestrator
sidecar:

- local gRPC;
- local HTTP;
- JSON-RPC over stdio or a local socket.

The decision must cover authentication, startup readiness, reconnect, streaming,
backpressure, version negotiation, and crash recovery.

## OD-002: Local NATS lifecycle

Decide whether desktop deployments:

- bundle and auto-manage a local `nats-server`;
- use a lighter local durable adapter and reserve NATS for hosted deployments;
- run an embedded-compatible transport with the same event semantics.

Users must not perform manual infrastructure setup for normal desktop use.

## OD-003: Persistence composition

Choose the first aggregate, outbox, inbox, and projection stores. The likely local
and hosted choices are SQLite and PostgreSQL, but transaction boundaries,
migrations, concurrency, and repository contracts need a dedicated decision.

## OD-004: Exact AgentRuntimePort

Complete a capability matrix against `ar`, OpenCode requirements, managed resume,
streaming, approvals, snapshots, topology, and recovery. Method names and schemas
must follow the matrix and a conformance test kit.

## OD-005: Temporal workflow boundary

Define which run-orchestration responsibilities remain domain/application state
and which operations become Temporal workflows, activities, signals, queries, and
timers.

The design must preserve deterministic workflow constraints without exposing
Temporal types to the core.

## OD-006: Initial aggregate boundaries

Validate candidate aggregates with concrete invariants and concurrency scenarios:

- `Team` versus `TeamRoster`;
- `Task` versus dependency graph ownership;
- `OrchestrationRun` versus `RunPlan`;
- `Inbox`, `Conversation`, and `Delivery`.

Avoid aggregates that require global locks or unbounded collections.

## OD-007: Public control protocol

JSON Schema is the contract source, but the public request-response protocol still
needs selection. Compare HTTP, gRPC, and JSON-RPC for streaming, multi-language
clients, browser support, local desktop operation, and schema generation.

## OD-008: SDK publication

Decide package names, private registry, release versioning, generated-client
strategy, and compatibility support. SDK implementation is intentionally deferred
until the first stable control contract exists.

## OD-009: Event-journal retention and replay

Define retention, compaction, privacy, redaction, replay authorization, and the
relationship between operational events and integration events.

Event sourcing remains out of scope unless accepted separately.

## OD-010: Legacy desktop migration boundary

Define the compatibility facade that preserves current IPC/shared DTO behavior
while the desktop switches from legacy provisioning to the new orchestrator.
Migration must avoid overlapping with active hosted-web refactoring where possible.
