---
id: ADR-0093
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/reliability
summary: Close deployment qualification over mandatory capabilities, separate optional commercial authority, and distinguish implementation materialization from release qualification.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0090
  - ADR-0091
  - architecture.deployment-profiles
  - architecture.reliability
  - OD-004
  - OD-037
  - OD-038
  - OD-039
  - OD-040
---

# ADR-0093: Closed Deployment Qualification and Materialization Gates

## Context

ADR-0091 requires evidence-derived qualification, but checking only that an
artifact file and accepted ADR exist is forgeable. The capability list can also
be weakened by deleting a mandatory entry. Managed SaaS should not require an
unfinished commercial entitlement contract for its baseline orchestration
capabilities.

ADR-0090 also defers local packages until a future accepted decision and Fully
Local evidence. Final production qualification cannot literally precede package
creation because the packages must exist to produce conformance evidence.

## Decision

### Qualification framework

The reliability catalog contains one global qualification framework. It remains
blocked by OD-039 until a signed artifact schema and blocking verifier are
accepted and executable. While the framework is not qualified, CI rejects every
profile or deployment capability marked `qualified` regardless of files placed
in an evidence directory.

A later verifier must bind evidence to the exact subject, adapter configuration,
required suite set, source revision, execution environment, passed result, and
trusted issuer. File existence is never sufficient.

### Closed mandatory capability registry

CI requires these capability IDs and exact profile applicability:

| Capability | Profiles | Purpose |
|---|---|---|
| `server-runtime-execution` | Managed, Standalone, Connected | Server Host reaches qualified server-side AR capacity. |
| `local-host-runtime-execution` | Fully Local | Local Host reaches qualified local AR capacity. |
| `local-device-execution` | Managed, Standalone, Connected | Server Host controls enrolled AR capacity on a customer device. |
| `managed-commercial-entitlements` | Managed, Connected | Optional managed commercial capability evidence. |

Each profile declares its mandatory capabilities. A profile cannot be qualified
unless every mandatory capability is qualified. Optional capabilities do not
block the baseline profile and cannot be advertised until independently
qualified.

Managed SaaS uses managed product authority and an optional managed commercial
adapter. Baseline Managed SaaS qualification does not depend on OD-037. The
separate `managed-commercial-entitlements` capability does.

### Package materialization is an implementation gate

Reserved Fully Local packages remain deferred under OD-021, OD-035, and OD-040.
Changing them to `allowed` requires all declared gates to be resolved and an
accepted materialization ADR recorded in the package catalog. This authorizes
implementation only; it does not qualify or ship the Fully Local profile.

Final profile qualification remains evidence-based after implementation. This
two-stage model is the non-circular interpretation of ADR-0090's requirement for
a future accepted decision and qualification evidence.

## Consequences

- A forged or empty evidence file cannot qualify any current subject.
- Mandatory runtime execution cannot disappear by deleting a capability row.
- Managed SaaS can ship baseline orchestration without enabling unfinished paid
  capability enforcement.
- Fully Local code can eventually be implemented before release qualification,
  but only after an explicit accepted implementation-start decision.

## Rejected Alternatives

- Trust arbitrary JSON or YAML merely because it exists in the repository.
- Let profiles qualify without at least one mandatory execution placement.
- Make commercial entitlements mandatory for baseline Managed SaaS.
- Require production qualification before creating the code that must prove it.
- Materialize reserved local packages when only historical owner ADRs exist.
