---
id: OD-029
type: open-decision
status: open
owner: architecture/security
summary: Decide product and legal retention sources, erasure semantics, legal holds, and backup interaction without embedding arbitrary durations in contracts.
related:
  - ADR-0055
  - ADR-0079
  - ADR-0080
  - architecture.security
  - OD-009
  - OD-012
---

# OD-029: Data Retention and Erasure Policy

## Decision required

Define who supplies product and jurisdiction-specific retention rules, how
tenant or deployment policy selects them, and how erase, anonymize, tombstone,
legal hold, backup expiry, and externally retained data are represented.

## Constraints

- Every bounded context owns deletion semantics for its data.
- No cross-context database transaction or shared-table cleanup service is
  allowed.
- Retention classes express intent and must not embed an invented legal period.
- Durable deletion must prevent restore, replay, projection rebuild, or delayed
  delivery from resurrecting erased payload.
- Audit and accounting retention may differ from user-content retention while
  minimizing linkable personal data.
- Local SQLite and hosted PostgreSQL must expose equivalent product outcomes even
  when physical backup mechanisms differ.

## Options

1. Product-owned policy profiles selected per tenant and jurisdiction.
2. Deployment-owned retention configuration constrained by product minima.
3. A future Data Governance bounded context, but only if legal holds, policy
   versioning, exports, and erasure coordination prove an independent domain.

## Acceptance criteria

- The policy source and authority are explicit.
- Every class maps to lifecycle semantics without hard-coding a vendor or region.
- Cross-context erasure uses an idempotent process with verification and durable
  tombstones.
- Backup, feed, blob, telemetry, and external-system behavior are covered.
- Local and hosted conformance scenarios are defined.

## Working draft: coordinated erasure

This section is a proposed model, not an accepted architecture decision.

A cross-context erasure process manager is justified only when one deletion
request affects two or more independently durable owners, or an external system
whose outcome can be delayed or unknown. Examples include deleting a hosted
Project whose tasks, runs, messages, usage records, blobs, public feeds, and AR
references are owned by different bounded contexts.

It is not used for:

- deleting an aggregate wholly owned by one bounded context;
- ordinary retention expiry that one owner can execute independently;
- wiping a local installation whose complete state can be removed atomically
  without remote or externally retained data;
- speculative future integrations that do not exist yet.

ADR-0080 assigns Orchestrator-side Project coordination to
`OrchestrationProjectDispositionProcess` inside Orchestration Scope because
OrchestrationProject lifecycle supplies the initiating local intent and deletion
epoch. External Platform or Standalone Authority still owns the product
retirement workflow. Every participant remains the sole disposition owner for
its data.

This decision does not assign product legal policy to Orchestration Scope. If
legal holds, subject exports, jurisdiction-specific policy versions, and
independent governance workflows become a coherent domain, a Data Governance
bounded context may take policy ownership through a new ADR and Published
Language.

The process is one durable instance per erasure request, not a global listener or
a shared cleanup service:

```text
Authorized erasure command
  -> establish deletion epoch and stop new writes
  -> pin a static versioned participant plan and dispatch intents
  -> each owner freezes Project writes in its local transaction
  -> each owning context erases, anonymizes, unlinks, retains, or proves absence
  -> collect idempotent acknowledgements and reconcile unknown outcomes
  -> verify required participants
  -> retain a minimal non-sensitive tombstone
```

The process manager stores coordination state only: erasure ID, scoped resource
reference, policy version, deletion epoch, participant statuses, deadlines, and
opaque evidence references. It never reads or mutates another context's tables.
Participants are selected from a versioned declared catalog rather than
discovered by subscribing to every event.

An immutable policy snapshot defines intended actions but cannot authorize every
later irreversible step indefinitely. Each owner performs a fresh typed policy
and hold check immediately before its irreversible action. A changed or unknown
hold fails closed as retention plus reconciliation without reopening access.

Each bounded context owns its local transaction, including projections, inbox or
outbox records, and blob references. External AR or integration effects use typed
idempotent commands and explicit `unknown` outcomes followed by reconciliation.
Delayed events and restored backups must check the deletion epoch or durable
erasure ledger so they cannot recreate erased payload.

Temporal may later execute timers, retries, and waiting, but it does not own the
business erasure state or participant semantics. The same process-manager
contract must be executable in the local profile without Temporal.

Materialization is deferred until the first real deletion flow crosses an
independent durability boundary. Before that point this draft defines constraints
only and does not justify creating a package, aggregate, or generic workflow
engine.

## Resolution

Open for policy source selection, concrete retention classes and durations,
legal-hold and export semantics, backup expiry, and jurisdiction behavior.
ADR-0080 resolves only the Orchestrator Project coordination owner and its
owner-local process constraints.
