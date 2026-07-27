---
id: ADR-0057
type: adr
status: accepted
owner: architecture/reliability
summary: Establish user-centric reliability indicators, strict invariants, and resource budgets before approving numerical SLO targets.
approved_by: product-owner
accepted_at: 2026-07-27
related:
  - ADR-0018
  - ADR-0043
  - ADR-0055
  - OD-014
  - OD-030
  - architecture.reliability
---

# ADR-0057: Measurement-First Reliability Objectives

## Context

The orchestrator must run locally and as a hosted service, continue durable work
through partial failure, and expose predictable progress to several client types.
Unstructured metrics would make reliability decisions subjective. Premature
numerical targets would be equally misleading because no production baseline,
critical-journey evidence, or error-budget policy exists yet.

Some requirements also cannot be treated as statistical objectives. Cross-tenant
access, lost accepted commands, and duplicate business effects are correctness
failures even if their measured percentage is small.

## Decision

Maintain one machine-readable reliability catalog with three separate concepts:

1. user-centric service-level indicator specifications;
2. strict system invariants verified by deterministic tests and fault injection;
3. resource budgets that protect local and hosted deployments from saturation.

The initial SLI specifications cover command acceptance, dispatch age, observation
freshness, and recovery duration. Their status is `candidate`; no numerical
objective or error budget is active.

Local and hosted deployments use separate objective profiles even when they share
an indicator specification. A numerical SLO becomes active only after baseline
measurement, named ownership, product approval, a review date, and an enforceable
error-budget policy. A target ratio must be lower than 100 percent.

Metric attributes come from a bounded registry. Tenant, project, team, run, agent,
user, runtime-session, operation, trace, span, raw URL, and workspace-path
dimensions are prohibited on SLO metrics. Operational telemetry is not the source
of truth for Usage Accounting, authorization, or business state.

OpenSLO is the preferred export shape once active objectives exist. The internal
catalog remains authoritative for candidates, invariants, and resource budgets,
which OpenSLO does not own.

## Consequences

- Reliability instrumentation can be designed before targets are guessed.
- Correctness and security guarantees cannot be weakened into acceptable error
  percentages.
- Local and hosted tradeoffs remain visible.
- Cardinality mistakes fail repository checks before telemetry is implemented.
- Actual thresholds, windows, burn-rate alerts, and error-budget actions remain
  blocked by OD-030.

## Rejected alternatives

- Declare 99.9 percent objectives without observed user journeys.
- Treat every operational metric as an SLI.
- Store invariants, resource limits, and SLOs in one undifferentiated dashboard.
- Use OpenTelemetry data as the only authoritative accounting or correctness
  record.
