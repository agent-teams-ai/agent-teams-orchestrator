---
id: domain.contexts.usage-accounting
type: bounded-context
status: proposed
owner: usage-accounting
summary: Strategic model boundary for usage attribution, rating, exact cost, reconciliation, and accounting projections.
related:
  - ADR-0045
  - ADR-0046
  - ADR-0049
  - ADR-0050
  - architecture.context-map
  - OD-024
---

# Usage Accounting

## Domain vision

Explain who consumed measured resources, how versioned rates interpreted that
usage, and which exact cost resulted, without becoming a billing or payment system.

## Scope

### Owns

- attribution decisions and allocations with evidence and confidence;
- versioned RateCard and pricing-quantity interpretation;
- immutable RatedUsageEntry and correction/re-rating relationships;
- provider invoice reconciliation evidence;
- exact usage and cost projections for statistics and Query Composition.

### Does not own

- raw provider observation normalization;
- budget authority, hard-limit reservations, invoices, payments, or general
  financial accounting;
- agent, team, task, run, project, or organization identity.

## Initial invariants

- consumed, pricing, attributed, and estimated quantities remain distinct;
- rates are effective-dated and published versions are immutable;
- every rated entry records meter, attribution, rate, rounding, and algorithm
  versions;
- allocation preserves the original exact quantity and amount;
- currency conversion never occurs without an explicit versioned rate and policy.

## DDD readiness

This context will use tactical DDD, but aggregate candidates remain hypotheses.
Discovery must distinguish:

- `RateCard` publication and immutable effective versions;
- append-only `RatedUsageEntry` facts from aggregates that own mutable lifecycle;
- attribution allocation as value-object behavior, domain policy, or a separate
  decision aggregate;
- provider reconciliation cases and their independent lifecycle;
- re-rating and period-closing process managers from ordinary aggregate methods.

Expected value objects include attributed quantity, unit price, exact money,
currency, rate reference, allocation, and effective instant. OD-024 must prove
transaction, concurrency, correction, and growth boundaries before repositories
or aggregate implementations materialize.

## Open questions

OD-024 owns attribution disputes, rate tiers, FX, period closing, re-rating,
late-data handling, provider reconciliation, and projection dimensions. The dossier
remains proposed until the Full DDD acceptance gate passes.
