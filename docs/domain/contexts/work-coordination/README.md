---
id: domain.contexts.work-coordination
type: bounded-context
status: proposed
owner: work-coordination
summary: Proposed model boundary for tasks, assignments, dependencies, and handoffs.
blocked_by:
  - OD-006
  - OD-015
  - OD-026
  - OD-027
related:
  - ADR-0066
  - architecture.context-map
  - OD-006
  - OD-015
  - OD-026
  - OD-027
---

# Work Coordination

Proposed scope: project-scoped tasks, assignment, dependencies, blocking,
handoffs, subscriptions, and external task-board synchronization intent. Agent
execution remains observed evidence rather than owned runtime state.

Work Coordination is the only authority that changes Task or Work lifecycle. It
executes versioned work commands and publishes work facts. Run cancellation,
participant-failure, late-completion, and compensation policy remain owned by the
Run Orchestration process manager rather than being inferred here.

Kanban columns, lists, timelines, calendars, review queues, and external boards are
views or adapters over Work state. They cannot become an additional lifecycle
authority. OD-027 decides the configurable workflow language, versioning,
transition rules, semantic traits, migration, and board projection model.

Task-scoped discussion remains a Work concern unless OD-026 proves a different
consistency boundary. A task comment never becomes a Conversation message
implicitly. Work publishes a typed fact; notification, attention, and runtime
delivery react through their owning boundaries without copying Task ownership.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
