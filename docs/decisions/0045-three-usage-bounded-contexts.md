---
id: ADR-0045
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/domain
summary: Separate usage measurement, accounting, and consumption governance into three bounded contexts.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - architecture.context-map
  - domain.contexts.usage-metering
  - domain.contexts.usage-accounting
  - domain.contexts.consumption-governance
  - OD-024
---

# ADR-0045: Three Usage Bounded Contexts

## Context

The initial product requires provider-neutral token and resource statistics,
attribution, cost calculation, user-configured budgets and alerts, and enforceable
limits. These capabilities share observations but do not share one lifecycle or
consistency model.

Measurement interprets immutable provider evidence. Accounting attributes and
rates measured usage under versioned commercial rules. Consumption governance
must make concurrent admission and reservation decisions before final usage may be
known. Combining them would create one broad model with incompatible reasons to
change and an unsafe boundary for hard limits.

## Decision

Create three supporting bounded contexts:

1. `Usage Metering` owns immutable usage observations, provider-neutral
   normalization, source deduplication, corrections, versioned meter definitions,
   and exact measured quantities.
2. `Usage Accounting` owns attribution, rate-card interpretation, rated usage,
   cost reconciliation, and usage/cost projections. It does not own invoicing,
   payment collection, or a general financial ledger.
3. `Consumption Governance` owns user budget definitions, alert thresholds, soft
   limits, hard quotas, reservations, capture/release, expiry, and consumption
   decisions.

Statistics are read projections over published metering and accounting facts, not
a fourth write model. Notification transports deliver alert facts but do not own
budgets or thresholds.

Run Orchestration consumes governance decisions when admitting or continuing
work. Policy and Risk may compose a governance result into broader product policy
but does not own balances or reservations. AR may enforce a provider capability or
cancellation command, but product budgets and quota authority remain in the
orchestrator.

Hard limits use an explicit reserve, authorize, capture or release protocol with
idempotency, revision, expiry, and fencing. Because providers may report usage
late, every hard-limit policy declares its reservation estimate and permitted
overshoot behavior.

OpenTelemetry platform signals and feature-owned usage adapters remain separate
roles. Sampled telemetry cannot be the sole authoritative usage source.

OD-024 remains open for exact commands, aggregates, observation identity, meter
semantics, attribution disputes, period closing, quota algorithms, and provider
fixtures.

## Consequences

- Each context can scale, retain data, and evolve independently while remaining in
  the modular monolith initially.
- Published Languages and idempotent consumers are required between all three
  contexts; no context reads another context's tables.
- Hard-limit correctness is not coupled to eventual accounting projections.
- Cross-context reports use Query Composition and read models rather than a shared
  aggregate or database schema.
- Initial implementation cost is higher than one broad Usage module, but ownership
  and future extraction remain clear.

## Rejected alternatives

- One `Usage and Entitlements` context for all observations, pricing, statistics,
  alerts, budgets, and quotas.
- Put hard quotas in Run Orchestration or Policy and Risk.
- Create a separate bounded context only for dashboards and statistics.
- Let provider adapters calculate authoritative product costs.
- Use OpenTelemetry metrics as the accounting ledger.
