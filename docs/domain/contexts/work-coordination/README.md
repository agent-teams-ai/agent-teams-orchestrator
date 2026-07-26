---
id: domain.contexts.work-coordination
type: bounded-context
status: proposed
owner: work-coordination
summary: Proposed model boundary for tasks, assignments, dependencies, and handoffs.
related:
  - architecture.context-map
  - OD-006
  - OD-015
---

# Work Coordination

Proposed scope: project-scoped tasks, assignment, dependencies, blocking,
handoffs, subscriptions, and external task-board synchronization intent. Agent
execution remains observed evidence rather than owned runtime state.

Work Coordination is the only authority that changes Task or Work lifecycle. It
executes versioned work commands and publishes work facts. Run cancellation,
participant-failure, late-completion, and compensation policy remain owned by the
Run Orchestration process manager rather than being inferred here.

Discovery artifacts are not yet complete. Use the
[bounded-context template](../../../templates/bounded-context.md) before changing
this dossier to accepted.
