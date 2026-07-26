---
id: OD-015
type: open-decision
status: open
owner: work-coordination
summary: Define external task-board mapping, reconciliation, and staged desktop migration.
related:
  - ADR-0029
  - architecture.extensions
  - architecture.migration-boundary
  - domain.contexts.work-coordination
  - OD-010
---

# OD-015: External Task-Board Migration

## Accepted constraints

ADR-0029 fixes the staged compatibility strategy. Work Coordination is the target
owner of task, assignment, dependency, and handoff
semantics. The current desktop board first connects through a compatibility
adapter. It is not deeply rewritten in the first orchestration phase, and no
specific board model becomes the canonical orchestrator domain.

## Decision required

Define external ID mapping, status translation, offline behavior, conflict policy,
reconciliation, staged cutover, and rollback for the desktop board adapter.

## Constraints

Cover external IDs, status translation, conflicts, offline behavior,
reconciliation, and staged migration. Do not require a deep board rewrite in the
first phase or make one board model canonical for the orchestrator.

## Resolution

Open.
