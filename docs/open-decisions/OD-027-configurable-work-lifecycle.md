---
id: OD-027
type: open-decision
status: open
owner: work-coordination
summary: Define configurable Work lifecycle, workflow versioning, migrations, and board projections.
related:
  - architecture.context-map
  - domain.contexts.work-coordination
  - OD-006
  - OD-015
---

# OD-027: Configurable Work Lifecycle

## Decision required

Define a user-configurable lifecycle model that supports custom Work states and
transitions without making Kanban columns, review overlays, Jira categories, or
runtime activity authoritative.

The decision must cover workflow definition and binding, published-version
identity, Task or Work pinning, transition guards and input validation,
post-commit actions, migration, board projections, external mappings, and
concurrent updates.

## Constraints

- Work Coordination remains the only authority that changes internal Work
  lifecycle.
- State names, colors, column positions, and external status names are not machine
  semantics.
- Runtime activity is an expiring evidence projection, not a Work status.
- Board, list, timeline, calendar, review queue, and external board views are
  projections or adapters.
- Transition execution uses expected Work revision and command idempotency.
- External effects run after commit through outbox/process-manager boundaries and
  cannot be rolled back as one distributed transaction.
- Published historical semantics cannot change silently for existing Work.
- Arbitrary user JavaScript cannot execute as an in-transaction domain guard.

## Options

1. Immutable published workflow revisions, deterministic bindings, declarative
   typed rules, explicit controlled migration, and CQRS board projections.
2. Mutable workflow definitions with stable state IDs and lazy reconciliation of
   active Work.
3. Event-source workflow definitions and every Work lifecycle.

The decision must also compare a fixed phase/category enum with orthogonal,
registered semantic traits. Fully arbitrary states without a small machine-readable
semantic kernel cannot safely drive scheduling, dependencies, terminal outcomes,
or automation.

## Current draft hypothesis

The strongest candidate separates authoring, publication, binding, lifecycle, and
migration:

```text
WorkflowDefinition          mutable draft
PublishedWorkflowRevision   immutable transition graph and rule set
WorkflowAlias               stable | preview | current
WorkflowBinding             scope and Work kind -> alias or exact revision
WorkLifecycle               exact revision, state ID, and Work revision
WorkflowMigrationPlan       source-to-target mappings and compatibility evidence
BoardView                   saved query, grouping, and layout projection
```

An alias resolves to an exact revision when new Work is created. Existing Work
keeps its exact revision until an explicit, dry-run migration succeeds. Migration
is not an ordinary transition and does not silently execute transition actions.
It is chunked, resumable, idempotent, conflict-aware, audited, and records an
explicit lifecycle-migrated fact.

Active orchestration execution cannot migrate implicitly with Work. It remains
pinned or first passes through quiesce, checkpoint, and replan. Exact rules for
migration while an active Run exists remain open.

Candidate binding precedence is deliberately small:

```text
workspace default <- project override <- Work-kind override
```

Ambiguous matches prevent publication. A team selector is not added until a real
case proves that it does not create overlapping workspace, project, team, and kind
precedence. Binding changes affect new Work; existing Work requires explicit
rebind or migration.

## State semantics under evaluation

Only intrinsic lifecycle semantics should live on a state definition. The current
candidate is display metadata, terminal behavior, and an optional stable analytics
classification. The exact minimal semantic kernel remains unresolved.

These concerns must not become state traits merely for scheduler convenience:

- whether Work can be claimed is derived from state, assignment, dependency,
  policy, and current execution evidence;
- dependency satisfaction depends on relation type and completion outcome;
- review belongs to a separate Review Cycle with artifact revision, reviewers,
  rounds, quorum, decisions, and evidence;
- actual agent activity is an expiring projection;
- successful, failed, cancelled, or other completion outcome is an explicit
  completion record, not inferred from a localized state label.

## Transition and automation draft

```text
authorize
  -> evaluate pure guards
  -> collect required input
  -> validate Work invariants and expected revision
  -> atomically change lifecycle, history, domain events, and outbox
  -> execute idempotent asynchronous actions after commit
```

Automations call the same application commands as people, agents, and SDKs. They
carry rule version, command identity, causation chain, recursion budget, and an
execution record. They never write status columns directly. Arbitrary user code
does not run in the transaction; extensions use a declarative condition language
or a capability-limited post-commit plugin boundary.

Dependencies are typed relations. Only hard blocker relations require acyclic
validation. Completing a blocker satisfies the relation instead of deleting it,
preserving history. Board drag-and-drop invokes an explicit transition; when more
than one transition can reach a column, the UI asks for the intended action.

## Product lessons to preserve and avoid

Useful mechanisms, without copying their full administrative models:

- Jira demonstrates explicit transitions and scope-to-workflow schemes, but shared
  configuration creates a large blast radius and status plus Resolution can become
  two sources of completion truth;
- GitHub Projects demonstrates multiple saved views over the same items, but a
  flexible board alone does not enforce lifecycle invariants;
- Linear demonstrates excellent simple defaults and typed relations, but fixed
  global status categories are too restrictive for the domain kernel;
- YouTrack demonstrates guarded state machines, but arbitrary server-side scripts
  and implicit resets make behavior difficult to audit and migrate;
- Asana demonstrates reusable templates, rules, approvals, and dependencies, but
  live bundle propagation and rule-triggered-rule cascades can cause surprising
  mass changes and loops.

## Acceptance criteria

- Users can define states and directed transitions independent of Kanban.
- One Work item can appear consistently in several board/list/review projections.
- Rename, add, remove, merge, and split state changes have explicit compatibility
  and migration behavior.
- Active Work can remain pinned or migrate through dry-run, resumable,
  idempotent, conflict-aware plans.
- Migration maps stable state identity, defines incompatible-item handling, and
  separates migration effects from ordinary transition actions.
- Guards, validators, deterministic same-transaction effects, and asynchronous
  actions have separate contracts.
- External Jira or other board mappings use provider IDs, mapping revisions, and
  explicit conflict/reconciliation policy.
- Concurrency scenarios cover two transitions, workflow publication during a
  transition, migration versus edit, external webhook races, and stale drag/drop.
- Legacy fixed statuses and review state can enter through a compatibility adapter
  without becoming the target model.
- Workflow bindings resolve deterministically and changing an alias or default
  never silently mutates existing Work.
- Automation recursion, mass-update blast radius, and stale external-board mapping
  have explicit limits, evidence, and recovery paths.

## Resolution

Open. When resolved, set `status: resolved` and link the deciding ADR.
