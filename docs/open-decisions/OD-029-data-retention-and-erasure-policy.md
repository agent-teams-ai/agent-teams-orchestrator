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

ADR-0080 fixes Orchestration Scope as the coordinator for whole-Project
Orchestrator disposition because it owns Project lifecycle and terminal
retirement. Each bounded context and AR still owns its local disposition rules
and evidence. If legal holds, subject exports, jurisdiction-specific policy
versions, and independent governance workflows become a coherent domain, a Data
Governance bounded context may own policy and case management through a new ADR
and Published Language without taking over Project lifecycle coordination.

The process is one durable instance per erasure request, not a global listener or
a shared cleanup service:

```text
Authorized erasure command
  -> establish deletion epoch and stop new writes
  -> persist participant plan and dispatch intents
  -> each owning context erases or anonymizes its own data
  -> collect idempotent acknowledgements and reconcile unknown outcomes
  -> verify required participants
  -> retain a minimal non-sensitive tombstone
```

The process manager stores coordination state only: erasure ID, scoped resource
reference, policy version, deletion epoch, participant statuses, deadlines, and
opaque evidence references. It never reads or mutates another context's tables.
Participants are selected from a versioned declared catalog rather than
discovered by subscribing to every event.

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

Open. No legal duration, identity provider, or jurisdiction behavior is selected
by ADR-0055 or the security fixtures.
