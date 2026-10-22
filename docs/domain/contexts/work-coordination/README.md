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
  - ADR-0111
  - architecture.context-map
  - OD-006
  - OD-015
  - OD-026
  - OD-027
  - OD-032
  - OD-048
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

| Root and identity | Protected invariants | Commands | Domain events | Transaction | Concurrency | Growth bound | External facts | Rejected boundaries |
|---|---|---|---|---|---|---|---|---|
| WorkItem/Task | Invariants above | CreateTask; UpdateTask; GetTask; ListTasks | TaskCreated; TaskMetadataChanged | One owner-local Unit of Work including receipt, Operation and outbox | Opaque ETag CAS; atomic request receipt and Task update; current authorization before retained receipt exposure. | One member/Run in this slice; history and receipts stored separately with finite declared horizons | Authenticated Project, caller grant, expected ETag and exact clock input. | No provider-state mirror, cross-context aggregate or shared transaction |

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

The following retained material describes broader context discovery and accepted
product policy. Capabilities outside the accepted feature remain excluded from
implementation and must satisfy their owning tactical decisions and admission.

Proposed scope: project-scoped tasks, assignment, dependencies, blocking,
handoffs, subscriptions, and external task-board synchronization intent. Agent
execution remains observed evidence rather than owned runtime state.

### Human and AI work direction

[ADR-0111](../../../decisions/0111-human-collaboration-and-execution-directory-terminology.md)
accepts human manual Tasks alongside AI work, multiple human Team memberships,
and one unified authorized personal-work query. Manual work requires no Run,
Agent profile, AR session, or runtime occupancy. Personal work preserves each
Task's tenant/Project identity and deduplicates Tasks reached through several
Team memberships; it creates no second Task or assignment store.

A Task may have zero or more distinct, equal executor assignments. Every real
co-executor sees the same Task in their authorized personal work. Canonical
scope-qualified human or Agent identity defines uniqueness; the same person in
two Teams is one executor of a given Task. Zero executors means unassigned.
Reviewers, watchers, and approvers are separate relationships. Neither a mandatory
coordinator nor artificial subtasks are required for joint work; independent
deliverables may be split when useful.

Authorized assignment takes effect immediately. Self-claim adds the authenticated
subject while preserving other executors; it requires explicit self-assignment
authority, current project eligibility, and any declared Task or Team restriction.
Read access alone cannot authorize claiming. Authorized agents use the same
Work-owned commands to assign human work, with actor, target, and delegation
checked separately from Agent identity. Assignment neither grants access nor
starts an Agent or reserves occupancy.

Release removes the authenticated executor. Removing the last leaves the Task
unassigned without completing, cancelling, or reopening it. Reassignment
atomically replaces an explicitly named executor with an eligible target while
preserving other executors. Assignment changes use the expected Work revision,
command idempotency, and the Work-owned transaction and outbox. Only one
conflicting change commits against a revision; a stale claimant can reload and
retry to join the existing executors. This is not a one-executor invariant.
Duplicate commands or several membership paths cannot create duplicate
assignments. Revoked access blocks reads and commands even when assignment
history remains; it cannot silently transfer or complete Work.

Assignment does not grant completion permission. An authorized executor may
request completion, and Work applies its pinned plan and evidence. Multiple
executors imply no mandatory acceptance offer, individual completion lifecycle,
or all-executor quorum. A simple manual plan can accept one authorized executor
or separately authorized manager's request. An assignment change is not
automatically material rework; a future plan depending on the executor set must
pin its relevant identities and define candidate invalidation explicitly.

[OD-048](../../../open-decisions/OD-048-mixed-human-and-ai-team-participation.md)
remains open for exact identities and commands, assignment-set limits,
storage/aggregate boundaries, terminal-Task edits, eligibility policy,
deprovisioning/reassignment recovery, and qualification. Optional offers,
executor-dependent completion gates, and human Run participation require further
semantics. ADR-0111 does not widen ADR-0103's metadata-only Task admission or
implement assignment, review, or completion in that slice.

Dangerous-action approval is a separate unresolved design under
[OD-032](../../../open-decisions/OD-032-last-mile-side-effect-safety.md).
Assignment acceptance concerns taking work; it never approves a dangerous action.
Product approval policy, exact action/scope binding, approvers, expiry/revocation,
last-mile checks, retries, and audit evidence remain deferred. Technical runtime
permission and sandbox enforcement remain owned by `ar`.

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
transition rules, semantic traits, migration, and the generic TaskView candidate.

Task-scoped discussion remains a Work concern unless OD-026 proves a different
consistency boundary. A task comment never becomes a Conversation message
implicitly. Work publishes a typed fact; notification, attention, and runtime
delivery react through their owning boundaries without copying Task ownership.

The broader Work aggregate, configurable lifecycle, review boundary, and board
integration remain open. Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
