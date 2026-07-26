---
id: domain.contexts.usage-metering
type: bounded-context
status: proposed
owner: usage-metering
summary: Strategic model boundary for immutable usage observations, normalization, corrections, meters, and exact quantities.
related:
  - ADR-0045
  - ADR-0046
  - ADR-0049
  - ADR-0050
  - architecture.context-map
  - OD-024
---

# Usage Metering

## Domain vision

Turn heterogeneous provider evidence into exact, provider-neutral, replayable
usage facts without deciding price, budget authority, or runtime policy.

## Scope

### Owns

- source identity, immutable UsageObservation evidence, and deduplication;
- provider-neutral normalization and correction relationships;
- versioned MeterDefinition lifecycle;
- exact MeteredQuantity facts and metering algorithm version;
- ingestion cursors, quarantine outcomes, and evidence provenance.

### Does not own

- attribution, pricing, cost, budgets, quotas, or provider execution;
- OpenTelemetry platform observability;
- agent, team, task, run, project, or organization identity.

## Initial invariants

- the same source identity and payload is an idempotent no-op;
- the same source identity with a different payload is a conflict;
- corrections append and link evidence instead of overwriting it;
- a published MeterDefinition version is immutable;
- every quantity is exact and includes unit and semantic basis;
- one observation may activate several versioned meters.

## DDD readiness

This context will use tactical DDD, but its aggregate boundaries are not accepted
yet. Event-stormed traces must decide:

- whether `MeterDefinition` publication and versioning form one aggregate;
- whether `UsageObservation` is an aggregate root or an immutable fact created by
  an ingestion capability whose uniqueness is enforced by a source receipt;
- which correction-chain invariants require one transaction;
- which normalization and meter-evaluation behavior belongs in value objects,
  domain policies, or pure domain services;
- how observation volume bounds aggregate collections and repositories.

Expected value objects include source identity, exact quantity, unit, basis, and
exact instant. They remain context-owned even when another context has a similarly
shaped value. No production aggregate or repository is created until OD-024
contains the full aggregate decision matrix and concurrency traces.

## Open questions

OD-024 owns provider fixtures, observation grain, cumulative/delta semantics,
event-time windows, late data, meter publication, retention, and replay details.
The dossier remains proposed until the Full DDD acceptance gate passes.
