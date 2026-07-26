---
id: OD-024
type: open-decision
status: open
owner: usage-capability
summary: Define detailed usage observation, metering, accounting, budget, quota, and persistence semantics.
related:
  - ADR-0045
  - ADR-0046
  - ADR-0049
  - ADR-0050
  - architecture.context-map
  - architecture.persistence
  - architecture.extensions
  - OD-014
  - OD-025
---

# OD-024: Usage and Consumption Detailed Semantics

## Decision required

Within the ADR-0045 and ADR-0046 baseline, decide:

- identity and correction semantics for provider usage observations;
- meter definition, publication, aggregation, and event-time behavior;
- attribution evidence, disputes, rate tiers, FX, and period closing;
- budget, alert, soft-limit, hard-limit, reservation, and reconciliation rules;
- exact aggregate boundaries, commands, events, feeds, and retention policies;
- Drizzle codecs and projection strategies preserving SQLite/PostgreSQL semantic
  parity.

## Confirmed requirements

- Exact token/resource accounting, statistics, user-configured alerts, budgets,
  limits, and related settings are initial product capabilities.
- Authoritative counts, quantities, prices, and money never use JavaScript
  `number`, SQLite `REAL`, or other binary floating-point representations.
- Provider observations are immutable and deduplicated by stable source identity.
  Corrections append new evidence and never overwrite the original observation.
- Meter and rate definitions are versioned. Re-rating or replay records which
  versions and rounding policy produced the result.
- Consumed quantity, pricing quantity, attributed quantity, and monetary cost are
  distinct concepts and cannot be added without compatible units and basis.
- OpenTelemetry platform observability and feature-owned usage adapters are
  separate roles. Sampled telemetry is not the sole accounting source of truth.
- Raw provider evidence has independent privacy, redaction, and retention policy.
- Source receipts are separate from high-volume fact partitions so stable source
  identity remains globally unique across retention windows.
- Rollups are versioned rebuildable projections with a source cursor, watermark,
  and projector version. They are not quota or accounting authority.
- Hosted fact tables are partition-ready. Partition activation and interval are
  selected by representative workload and retention evidence.
- Every mutating usage capability owns the ADR-0050 hosted concurrency profile
  protecting its aggregate invariants.

## Accepted context split

ADR-0045 establishes:

1. `Usage Metering` owns immutable observations, deduplication, normalization,
   corrections, meter definitions, and exact metered quantities.
2. `Usage Accounting` owns attribution, rate-card interpretation, rated entries,
   cost reconciliation, and usage/cost projections.
3. `Consumption Governance` owns user budgets, alerts, soft limits, hard quotas,
   reservations, capture/release, expiry, and enforcement decisions.

Statistics are projections over published usage and accounting facts, not a fourth
write model. Notification transports deliver alert facts but do not own budget
state. Exact commands, events, and consistency traces remain open.

## Accepted exact-value baseline

- Whole counts and integer coefficients use BigInt-backed context-owned value
  objects and decimal-string wire formats.
- General quantities carry value, unit, scale, and semantic basis explicitly.
- Money carries an exact amount and currency; a unit price also carries its
  denominator quantity.
- `decimal.js@10.6.0` and the BigInt entry of `dinero.js@2.0.2` are hidden behind
  context-owned value objects.
- PostgreSQL maps exact quantities and money to `NUMERIC(P, 0)` coefficients plus
  explicit scale and maps bounded integers to `bigint`, preserving strings until
  domain mapping and casting exact JSON fields to text.
- SQLite maps range-proven whole values to `INTEGER`/BigInt and wider values to
  canonical coefficient text plus scale. `REAL` and `NUMERIC` affinity are
  prohibited for authoritative values.
- Exact time uses BigInt-backed epoch microseconds in the domain, SQLite signed
  integers, PostgreSQL `TIMESTAMPTZ(6)` text codecs, and fixed UTC RFC3339 wire
  strings. OD-025 owns only the internal calendar engine for Node 24.
- Every aggregate query has a declared overflow strategy.

## Required scenarios

- duplicate, reordered, cumulative, partial, final, and corrected provider usage;
- cached-input, reasoning-token, tool, image, audio, duration, and future metrics;
- one observation activating multiple versioned meters;
- attribution across team, agent, run, task, project, and organization scopes;
- rate changes, currency changes, tiered rates, rounding, and provider invoice
  reconciliation;
- late usage crossing a budget period or a meter/rate effective-time boundary;
- concurrent hard-limit reservations and provider outcomes that are uncertain;
- DST gaps and folds, negative epoch values, timezone-data changes, and exact
  budget-period boundaries;
- replay after parser, meter, attribution, or rate algorithm upgrades;
- overflow, malformed decimal input, and SQLite/PostgreSQL parity;
- telemetry sampling, outage, redaction, and high-cardinality protection.

## Acceptance criteria

- bounded contexts have distinct language, ownership, lifecycle, and consistency
  reasons rather than package symmetry;
- every authoritative quantity round-trips losslessly through domain, contracts,
  SQLite, PostgreSQL, JSON, and Protobuf;
- rounding occurs only at named business boundaries with a recorded policy;
- property-based tests cover arithmetic, scale conversion, allocation, and
  overflow;
- conformance suites cover provider semantics, corrections, rating, budgets,
  reservations, recovery, and persistence parity;
- Drizzle codec and representative workload spikes validate the accepted
  arithmetic baseline before production schema materialization.

## Resolution

Open.
