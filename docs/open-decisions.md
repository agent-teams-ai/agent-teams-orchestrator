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

ADR-0011 selects one SQLite file per bounded context for local/desktop and one
PostgreSQL schema per bounded context for hosted deployments.

Remaining decisions:

- runtime and driver choice for SQLite and PostgreSQL;
- Drizzle ORM versus another adapter-local query/migration tool;
- context transaction-port shape;
- migration manifests and dialect strategy;
- WAL, checkpoint, busy-timeout, and supported SQLite-version policy;
- PostgreSQL connection, schema qualification, relay leasing, and row security;
- desktop backup barrier and multi-context restore manifest;
- hosted backup, point-in-time recovery, and restore drills;
- persistence conformance-kit ownership.

## OD-004: Exact runtime capability ports

Complete a capability matrix against `ar`, OpenCode requirements, managed resume,
streaming, approvals, snapshots, topology, and recovery. Method names and schemas
must follow the matrix, Interface Segregation, and a conformance test kit.

## OD-005: Temporal workflow boundary

Define which run-orchestration responsibilities remain domain/application state
and which operations become Temporal workflows, activities, signals, queries, and
timers.

Run Orchestration business state remains authoritative in context persistence.
The design must now define scheduling ports, Activity Worker inbound adapters,
workflow contracts, deterministic execution constraints, and reconciliation
without exposing Temporal types to domain/application code.

## OD-006: Initial aggregate boundaries

Validate candidate aggregates with concrete invariants and concurrency scenarios:

- `Team` versus `TeamRoster`;
- `Project` versus `WorkspaceRegistration`;
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

## OD-011: Context-map validation

Validate Identity Registry, Access Control, Tenant and Project Registry, Workspace
Registry, Team Topology, Work Coordination, Run Orchestration, Agent
Communication, Policy and Risk, and Approval Management through event storming and
current-system analysis. Keep the accepted focused eight-to-ten-context
granularity, but merge or split a proposed boundary when language and invariants
prove it necessary.

## OD-012: Identity, authorization, and tenant isolation

Define principal types, tenant/project membership, service identities,
authorization checks, API authentication, secret references, and hosted isolation.
Identity Registry owns principal facts, Tenant and Project Registry owns tenant and
project lifecycle, Access Control owns grants, and every application use case
remains responsible for business-operation authorization. Decide which operations
use authoritative synchronous decisions and which may use local grant projections,
including revocation and fail-closed behavior.

## OD-013: Partial failure and compensation

Define orchestration behavior when one team member fails to start, one runtime lane
loses ownership, a message is accepted but not observed, or a task completes after
cancellation. One participant failure must not automatically stop unrelated
participants unless policy requires it.

## OD-014: Observability and OpenTelemetry

Choose semantic conventions, redaction, metrics, tracing, logs, sampling, exporters,
retention, and correlation propagation. Provider prompts, credentials, attachments,
and workspace content must be private by default.

## OD-015: External task-board migration

Define the compatibility adapter for the current desktop board and the canonical
Work Coordination mapping. Cover external IDs, status translation, conflicts,
offline behavior, reconciliation, and staged migration without a deep board
rewrite in the first phase.

## OD-016: Public error model

Define stable error codes, retryability, operator-action classification, validation
details, correlation IDs, and safe diagnostics shared by APIs and generated SDKs.
