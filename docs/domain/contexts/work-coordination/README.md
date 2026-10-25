---
id: domain.contexts.work-coordination
type: bounded-context
status: accepted
owner: work-coordination
summary: Scoped sandbox semantics and ownership for work coordination.
related:
  - ADR-0103
  - contract.migration.desktop-first-slice.v1
  - ADR-0072
  - ADR-0066
  - architecture.context-map
  - OD-006
  - OD-015
  - OD-026
  - OD-027
---

# Work Coordination

## Accepted implementation scope

ADR-0103 accepts only `src/features/task-model/` for the server sandbox
runtime migration. This status describes that bounded scope; it does not admit
other capabilities from the broader model below. Existing accepted ADR invariants
remain binding. The owning reserved package and LikeC4 identity do not change.

## Domain vision

Keep one authoritative Task state while enabling a bounded sandbox metadata workflow.

## Scope

Owns: Task creation and subject/description edits; immutable owner clock metadata; sole Work lifecycle authority.

Excluded from this admission: Assignment, dependencies, completion/review, external boards and configurable lifecycle implementation in this increment.

## Ubiquitous Language

Task is product Work identity; ETag is opaque concurrency evidence; metadata edit is distinct from status/assignment; runtime success is evidence, not completion.

## Invariants and business rules

Only Work changes Task lifecycle. The admitted lifecycle is open; UpdateTask cannot hide status, owner or dependency changes. Missing masked values differ from explicit empty description.

## Aggregates and consistency boundaries

| Root and identity | Protected invariants | Commands                                   | Domain events                    | Transaction                                                          | Concurrency                                                                                                      | Growth bound                                                                                       | External facts                                                            | Rejected boundaries                                                     |
| ----------------- | -------------------- | ------------------------------------------ | -------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| WorkItem/Task     | Invariants above     | CreateTask; UpdateTask; GetTask; ListTasks | TaskCreated; TaskMetadataChanged | One owner-local Unit of Work including receipt, Operation and outbox | Opaque ETag CAS; atomic request receipt and Task update; current authorization before retained receipt exposure. | One member/Run in this slice; history and receipts stored separately with finite declared horizons | Authenticated Project, caller grant, expected ETag and exact clock input. | No provider-state mirror, cross-context aggregate or shared transaction |

Repositories persist only the owning roots/state; read queries use authorized
projections. Transport schemas and persistence records map to separate domain and
application models. IDs and ExactInstant values enter through explicit ports;
no provider/transport/database type enters business policy.

## Commands, processes and errors

Create produces an open Task. Metadata edits preserve lifecycle. Placement failure leaves the Task and receipt intact.

Application processes persist stable child identities, checkpoints and external
intent before dispatch. Domain events above express local facts; integration
publication intent and wire events remain separate mapped surfaces. Typed errors
include forbidden scope, stale authority/ETag, conflicting request and explicit
unknown outcome. A timeout never authorizes an unkeyed effect or legacy replay.

## Concurrency and conflict model

Opaque ETag CAS; atomic request receipt and Task update; current authorization before retained receipt exposure.

Persistence owns one context schema, local transaction and forced RLS boundary.
The server borrows its low-level pool; it never borrows another context's Unit
of Work, repository or transaction. Rehydration validates invariants and exact
values rather than trusting a transport DTO.

## Context relationships

Run owns planned WorkPlacement and consumes authorized Work queries; Work does not inspect Run tables or copy runtime state.

## Security and authorization

Trusted scope and subject come from the selected authority adapter. The sandbox
authority is explicitly test-only, current grants apply on replay and reads, and
no prompt/provider payload can select trusted identity. Raw secrets and protected
payload remain in their owning adapters. This admission does not qualify a
deployment, authorize user-project testing or weaken accepted privacy rules.

## Verification scenarios

Duplicate/conflicting request, stale edit, masked field presence, explicit clear and foreign Project are rejecting fixtures; runtime text cannot establish completion.

The [accepted sandbox contract](../../../contracts/desktop-runtime-migration-admission-v1.md)
links deterministic fixtures and exact Protobuf sources. Actual domain,
rehydration, concurrent PostgreSQL transaction, response-loss and restart tests
are required with implementation; their names follow the scenarios above.
Synthetic admission models do not assert adapter or provider qualification.

## Implementation links

The package remains reserved until the canonical Plan/Apply scaffolder runs.
The accepted feature's colocated documentation, public entrypoints, source
boundaries and feature allowlist are materialized in the same implementation
change. No other feature is authorized by this dossier status.

## Excluded model and unresolved questions

OD-006, OD-015, OD-026 and OD-027 retain broader lifecycle, board, discussion and completion questions.

The following retained material describes broader context discovery and existing
ADR references. Proposed behavior outside the accepted feature remains excluded
and must use its owning decision process before implementation.

Proposed scope: project-scoped tasks, assignment, dependencies, blocking,
handoffs, subscriptions, and external task-board synchronization intent. Agent
execution remains observed evidence rather than owned runtime state.

Work Coordination is the only authority that changes Task or Work lifecycle. It
executes versioned work commands and publishes work facts. Run cancellation,
participant-failure, late-completion, and compensation policy remain owned by the
Run Orchestration process manager rather than being inferred here.

ADR-0072 defines completion authority inside this context. A simple
transaction-local completion plan may commit immediately. An asynchronous or
multi-step plan atomically creates one `CompletionEvaluation` for one immutable
candidate and links it from Work. The evaluation owns typed gate readiness while
a process manager owns only timers, delivery, retries, and reconciliation.
`WorkItem` remains the sole authority that applies the terminal transition and
records an immutable `WorkResolutionRecord`.

Completion consumes narrow typed evidence through consumer-owned ports. It does
not import review, approval, runtime, or artifact aggregates, and it does not
accept Review Management as a bounded context. Raw logs, agent text, LLM
confidence, telemetry, board columns, and runtime status cannot establish Work
completion by themselves.

A handoff is a durable Work-owned collaboration record, not free-form message
text or an AR operation. Its candidate contract carries source and target,
reason, bounded summary, priority, expected outcome, context and artifact
references, deadline, acceptance policy, provenance, and revision. Exact
aggregate boundaries and acceptance transitions remain open in OD-006.

Kanban columns, lists, timelines, calendars, review queues, and external boards are
views or adapters over Work state. They cannot become an additional lifecycle
authority. OD-027 decides the configurable workflow language, versioning,
transition rules, semantic traits, migration, and board projection model.

Task-scoped discussion remains a Work concern unless OD-026 proves a different
consistency boundary. A task comment never becomes a Conversation message
implicitly. Work publishes a typed fact; notification, attention, and runtime
delivery react through their owning boundaries without copying Task ownership.

The broader Work aggregate, configurable lifecycle, review boundary, and board
integration remain open. Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
