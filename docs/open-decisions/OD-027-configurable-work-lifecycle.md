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

1. Immutable published workflow versions, pinned Work lifecycle, declarative typed
   rules, explicit migration plans, and CQRS board projections.
2. Mutable workflow definitions with stable state IDs and lazy reconciliation of
   active Work.
3. Event-source workflow definitions and every Work lifecycle.

The decision must also compare a fixed phase/category enum with orthogonal,
registered semantic traits. Fully arbitrary states without a small machine-readable
semantic kernel cannot safely drive scheduling, dependencies, terminal outcomes,
or automation.

## Acceptance criteria

- Users can define states and directed transitions independent of Kanban.
- One Work item can appear consistently in several board/list/review projections.
- Rename, add, remove, merge, and split state changes have explicit compatibility
  and migration behavior.
- Active Work can remain pinned or migrate through dry-run, resumable,
  idempotent, conflict-aware plans.
- Guards, validators, deterministic same-transaction effects, and asynchronous
  actions have separate contracts.
- External Jira or other board mappings use provider IDs, mapping revisions, and
  explicit conflict/reconciliation policy.
- Concurrency scenarios cover two transitions, workflow publication during a
  transition, migration versus edit, external webhook races, and stale drag/drop.
- Legacy fixed statuses and review state can enter through a compatibility adapter
  without becoming the target model.

## Resolution

Open. When resolved, set `status: resolved` and link the deciding ADR.
