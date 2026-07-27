---
id: architecture.reliability
type: architecture
status: accepted
owner: architecture/reliability
summary: Measurement-first SLI, SLO, invariant, error-budget, and resource-budget rules for local and hosted profiles.
related:
  - ADR-0043
  - ADR-0057
  - OD-014
  - OD-030
  - architecture.eventing
  - architecture.security
  - architecture.testing
code_anchors:
  - pattern: architecture/reliability/**
    enforcement: required
  - pattern: scripts/reliability/**
    enforcement: required
---

# Reliability Objectives

## Terms and ownership

An SLI describes how user-visible reliability is measured. An SLO adds an approved
target and measurement window. The difference between the target and perfect
service is the error budget, whose policy defines what the organization changes
when reliability degrades.

A strict invariant is not an SLO. Losing an accepted command, duplicating a
business effect, or crossing a tenant boundary is always a defect. A resource
budget limits internal saturation such as event-loop delay, queue depth, disk
headroom, memory, or metric cardinality; it does not claim that a user journey
succeeded.

The machine-readable
[reliability catalog](../../architecture/reliability/reliability-catalog.yaml)
owns exact candidate IDs, profiles, attributes, and lifecycle status. Dashboards,
OpenTelemetry Views, alerts, and OpenSLO documents are derived adapters.

## Initial user journeys

The initial catalog deliberately contains four candidate indicators:

| Indicator | User-visible question |
|---|---|
| Command acceptance latency | Did the caller quickly receive a durable acceptance outcome? |
| Dispatch age | Did accepted work reach the responsible external capability? |
| Observation freshness | Can a subscriber see recent durable progress? |
| Recovery duration | Did orchestration return to a known state after continuity loss? |

Candidate means the instrumentation contract is being designed. It is not a
promise to users and has no error budget.

## Lifecycle

```text
candidate -> calibrating -> aspirational | active -> retired
```

Activation requires:

1. an implemented measurement close enough to the user journey;
2. coverage and failure-mode evidence from local and hosted profiles;
3. an owner empowered to trade feature velocity against reliability;
4. a target below 100 percent and an explicit window;
5. product-owner approval and a review date;
6. a documented error-budget and escalation policy;
7. alerts based on budget consumption rather than raw symptom noise.

An aspirational objective is measured but does not trigger the active
error-budget policy. Candidate and calibrating indicators cannot publish an
objective.

## Local and hosted profiles

Local and hosted deployments share indicator meaning but not assumed targets or
failure domains.

- Local measurements include Supervisor and Host availability, embedded
  persistence, machine sleep, disk pressure, and event-loop delay.
- Hosted measurements include network control traffic, PostgreSQL, broker and
  worker queues, deployment failover, and external infrastructure.
- A Desktop connected to a hosted orchestrator uses the hosted service profile
  for service reliability and separate client-experience telemetry where needed.

Aggregating both profiles into one objective is prohibited unless an approved SLO
explicitly defines the weighting and user population.

## Cardinality and privacy

SLO metrics use only registered low or bounded-cardinality attributes. The
repository validator rejects dimensions such as tenant, project, run, agent,
user, runtime session, operation, trace, span, raw URL, and workspace path.

Detailed diagnosis belongs in sampled traces, protected logs, or authorized
drill-down stores. It does not justify unbounded metric dimensions. Metric
overflow must be observable because dropping outcome dimensions can make an
error-rate alert lie.

## Separation from analytics and accounting

These are independent surfaces:

- reliability telemetry answers whether critical journeys work predictably;
- product analytics answers how features are used and requires a separate privacy
  and consent decision;
- Usage Metering and Usage Accounting own exact durable consumption and money
  facts;
- audit records own authority and security evidence.

Telemetry sampling, aggregation, or exporter failure can never change business
state, authorization, usage charges, or invariant verification.

## Standards boundary

OpenSLO is the preferred portable export for active SLOs and alert policies.
Generated OpenSLO documents will be validated with an exact pinned CLI release
when the first objective is approved. Installing that tool before an active
artifact exists would add no current protection.

The internal catalog remains a narrow architecture model rather than a competing
observability platform. It additionally owns candidate lifecycle, strict
invariants, deployment profiles, and resource budgets.

## Evidence

The approach follows the
[Google SRE guidance](https://sre.google/workbook/implementing-slos/) to start
from critical user journeys, keep the SLI set small, avoid 100 percent targets,
and attach an enforceable error-budget policy. Portable export follows the
[OpenSLO specification](https://openslo.com/). Attribute restrictions account
for [OpenTelemetry metric cardinality](https://opentelemetry.io/docs/concepts/signals/metrics/#cardinality-limits).
