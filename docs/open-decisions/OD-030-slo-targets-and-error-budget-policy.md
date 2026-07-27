---
id: OD-030
type: open-decision
status: open
owner: architecture/reliability
summary: Choose evidence-backed SLO targets, windows, alerts, and error-budget actions for local and hosted profiles.
related:
  - ADR-0057
  - OD-014
  - architecture.reliability
---

# OD-030: SLO Targets and Error-Budget Policy

## Decision required

After representative instrumentation and load evidence exists, choose for each
active local or hosted SLI:

- the good-event threshold and target ratio;
- rolling or calendar measurement window;
- missing-data and maintenance treatment;
- burn-rate alert windows and escalation;
- error-budget exhaustion actions;
- approval, review, and retirement cadence.

## Constraints

- No target may be 100 percent.
- Local and hosted objectives are separate by default.
- Targets must correspond to user-visible journeys, not convenient internal
  component metrics.
- Strict invariants remain outside the error budget.
- Metric labels follow the bounded cardinality registry.
- An active objective requires a product owner and an operational owner who can
  act on budget exhaustion.

## Options

1. Activate one objective at a time after each indicator reaches calibration.
2. Activate a small coordinated set after one complete end-to-end journey exists.
3. Keep objectives aspirational until hosted and local production baselines both
   exist.

## Acceptance criteria

- Baseline distributions include normal operation, overload, recovery, and
  dependency failure.
- Known incidents or controlled failures visibly consume the proposed budget.
- False-positive and false-negative analysis is documented.
- The responsible owners approve the tradeoff and error-budget actions.
- Generated OpenSLO output validates and matches the canonical catalog.

## Resolution

Open. No numerical SLO is currently active.
