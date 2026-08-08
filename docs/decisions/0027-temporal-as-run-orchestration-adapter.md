---
id: ADR-0027
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: run-orchestration
summary: Keep Temporal behind Run Orchestration ports as a durable workflow execution adapter.
related:
  - ADR-0001
  - OD-005
  - architecture.extensions
---

# ADR-0027: Temporal as Run Orchestration Adapter

## Context

The orchestrator needs durable long-running coordination, timers, retries, and
recovery. Temporal is a strong future execution engine for those mechanics, but
allowing Temporal histories and SDK types to become the domain model would couple
business behavior to one workflow implementation.

Writing a general-purpose in-process workflow engine before Temporal would create
another durable state machine, migration surface, and recovery protocol to
maintain.

## Decision

Run Orchestration owns business run state, retry and escalation policy,
compensation, approval consequences, checkpoints, completion, and reconciliation.
Its context persistence remains authoritative for that business state.

Temporal is a replaceable workflow execution adapter:

- a Temporal client adapter implements narrow scheduling ports owned by Run
  Orchestration application features;
- Temporal Activity Workers are inbound adapters that invoke idempotent
  application use cases;
- workflow definitions coordinate deterministic steps, timers, signals, and
  activity calls without duplicating aggregates or business invariants;
- Temporal history is authoritative only for workflow execution progress;
- activity retries cannot bypass application authorization, idempotency,
  optimistic concurrency, or domain invariants;
- workflow and activity contracts are versioned at the adapter boundary.

Feature-specific durable process managers may provide the first in-process
implementation of a business process. They use deterministic transitions,
explicit commands, durable timers, and idempotent effects so that scheduling can
later move to Temporal without moving domain ownership.

The platform does not implement a generic workflow language or expose Temporal
types to domain and application code.

This decision governs Run Orchestration as the first consumer. It does not route
Work Coordination, Agent Communication, Approval Management, or another context's
process managers through Run Orchestration. A later context may use shared
Temporal infrastructure through its own consumer-owned ports without moving
business ownership.

## Consequences

- Temporal can be introduced one workflow at a time.
- Business state remains queryable and recoverable without interpreting Temporal
  history as an aggregate event store.
- Local tests can use deterministic in-process schedulers and fake clocks.
- Temporal workflow versioning, worker deployment, and reconciliation require
  explicit operational design.
- Some execution progress is intentionally represented in both business state and
  workflow history with clear authority and reconciliation rules.

## Rejected alternatives

- Make Temporal workflow state the Run Orchestration aggregate.
- Import Temporal SDK types into domain or application packages.
- Build a generic workflow engine in the orchestrator core.
- Put business retry and compensation policy only in activity retry settings.
