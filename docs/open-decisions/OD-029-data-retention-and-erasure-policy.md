---
id: OD-029
type: open-decision
status: open
owner: architecture/security
summary: Decide product and legal retention sources, erasure semantics, legal holds, and backup interaction without embedding arbitrary durations in contracts.
related:
  - ADR-0055
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

## Resolution

Open. No legal duration, identity provider, or jurisdiction behavior is selected
by ADR-0055 or the security fixtures.
