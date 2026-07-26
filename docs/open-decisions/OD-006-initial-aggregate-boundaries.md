---
id: OD-006
type: open-decision
status: open
owner: architecture/domain
summary: Validate initial aggregate and consistency boundaries using concrete invariants and concurrency.
related:
  - domain.modeling-standard
  - OD-011
---

# OD-006: Initial Aggregate Boundaries

## Decision required

Validate candidate boundaries:

- `Team` versus `TeamRoster`;
- `Project` versus `WorkspaceRegistration`;
- `Task` versus dependency-graph ownership;
- `TaskSubscription` and work-execution process ownership;
- Task-scoped discussion and comment growth/concurrency boundaries;
- Task-to-OrchestrationRun cardinality, retry authority, and late completion;
- `OrchestrationRun` versus `RunPlan`;
- `RuntimeBinding` lifecycle and consistency boundary;
- active Run behavior when the referenced Team topology version changes;
- `Conversation`, append-only message records, audience snapshots, membership,
  subscriptions, per-recipient delivery, and inbox projections;
- `ApprovalRequest` versus reusable approval or grant state;
- feature-specific durable process-manager state.

## Constraints

Boundaries must follow invariants, consistency, lifecycle, and concurrency rather
than nouns or folders. Avoid aggregates requiring global locks or unbounded
collections.

OD-026 owns the strategic distinction among conversations, notifications, alerts,
and runtime delivery. This decision validates tactical aggregates only after that
ownership boundary is resolved.

## Resolution

Open.
