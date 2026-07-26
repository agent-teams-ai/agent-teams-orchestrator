---
id: domain.contexts.consumption-governance
type: bounded-context
status: proposed
owner: consumption-governance
summary: Strategic model boundary for budgets, alerts, limits, quota reservations, and consumption decisions.
blocked_by:
  - OD-024
related:
  - ADR-0045
  - ADR-0046
  - ADR-0049
  - ADR-0050
  - architecture.context-map
  - OD-024
---

# Consumption Governance

## Domain vision

Let users govern consumption through explainable budgets, alerts, and enforceable
limits while keeping measurement, pricing, orchestration, and runtime enforcement
owned by their respective contexts.

## Scope

### Owns

- budget and threshold definitions, periods, scope, and lifecycle;
- alert evaluation facts and acknowledgement state owned by the product;
- soft-limit and hard-quota policy;
- reservation, authorization, capture, release, expiry, and reconciliation;
- exact consumption balance and governance decision evidence.

### Does not own

- usage observation normalization, pricing, task/run lifecycle, or provider
  execution;
- notification transport delivery;
- Access Control grants or general Policy and Risk rules.

## Initial invariants

- hard-limit admission uses a durable reservation with idempotency and expiry;
- capture and release cannot exceed the active reservation;
- stale reservation revisions or fences have no side effects;
- every policy declares scope, period, basis, thresholds, and overshoot behavior;
- alerts and soft limits never masquerade as guaranteed hard enforcement;
- late usage enters explicit reconciliation rather than rewriting prior decisions.

## DDD readiness

This context requires the deepest initial tactical model because hard admission
protects concurrent balances. Aggregate discovery must decide:

- whether Budget lifecycle and threshold configuration share one aggregate;
- whether a quota balance and its reservations form one bounded aggregate or use
  separate roots with an atomic admission capability;
- how organization, project, team, agent, and run scopes acquire locks in one
  deterministic order;
- which estimation and overshoot rules are domain policies;
- which expiry, period rollover, and late-usage behavior belongs to durable
  process managers;
- how reservation collections remain bounded under long-running usage.

Expected value objects include budget period, quota scope, exact allowance,
reservation identity, expiry, fence, and governance decision. ADR-0050 concurrency
traces and the OD-024 aggregate decision matrix are required before production
types or repositories are created.

## Open questions

OD-024 owns aggregate boundaries, period reset, reservation estimates, concurrent
limits, uncertain provider outcomes, alert delivery contracts, and recovery. The
dossier remains proposed until the Full DDD acceptance gate passes.
