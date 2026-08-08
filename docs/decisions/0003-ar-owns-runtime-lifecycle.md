---
id: ADR-0003
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: integration/runtime
summary: Assign technical agent execution and provider lifecycle ownership to ar.
related:
  - ADR-0008
  - ADR-0028
---

# ADR-0003: ar Owns Runtime Lifecycle

## Context

The legacy orchestrator and desktop application contain overlapping process,
session, recovery, and provider-specific behavior. Reimplementing those
responsibilities in the new orchestrator would create duplicate ownership and
couple product coordination to providers.

## Decision

The orchestrator owns product coordination and desired runtime state. `ar` owns
agent execution, session custody, process lifecycle, resume, cancellation,
recovery, leases, fencing, sandboxing, and provider drivers.

The orchestrator integrates through a provider-neutral runtime port. OpenCode is
implemented as an `ar` provider adapter, not an orchestrator-domain adapter.

## Consequences

- The orchestrator remains provider-neutral.
- Runtime failures and snapshots require a strict anti-corruption boundary.
- Legacy behavior migrates through contract tests and a temporary compatibility
  adapter.
- Desktop hosts may supervise sidecars but do not own individual agent processes.
- Dual writes and dual process ownership are forbidden during migration.

## Rejected alternatives

- Copy provider adapters into the new orchestrator.
- Let Electron own provider processes permanently.
- Run old and new lifecycle owners simultaneously during migration.
