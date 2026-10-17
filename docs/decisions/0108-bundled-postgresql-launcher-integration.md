---
id: ADR-0108
type: adr
status: accepted
owner: platform/local-host
summary: Select embedded-postgres behind the Local Supervisor component boundary while retaining platform, update, and recovery qualification.
approved_by: product-owner
accepted_at: 2026-10-17
related:
  - ADR-0106
  - architecture.local-host-lifecycle
  - architecture.persistence
  - architecture.testing
  - OD-003
  - OD-021
  - OD-040
---

# ADR-0108: Bundled PostgreSQL Launcher Integration

## Context

ADR-0106 selects native PostgreSQL for local and server profiles and leaves the
exact launcher integration for qualification. On 2026-10-17 the product owner
selected `embedded-postgres` behind the Supervisor adapter and explicitly
required Windows/macOS, packaging, update, and backup/restore checks.

The supplied comparison and the separate same-payload Linux experiment are
recorded in [OD-003](../open-decisions/OD-003-persistence-composition.md).
The guarded wrapper and direct-tool paths passed six common lifecycle checks
each, with no demonstrated overall reliability advantage for direct tools.
The separate raw-wrapper stop-after-exit diagnostic failed; the global exit-hook
path and other untested lifecycle cases remain release blockers. These results
justify retaining the wrapper approach, not accepting a research version as a
production dependency.

## Decision

Select `embedded-postgres` as the Node launcher approach behind a narrow
PostgreSQL component adapter owned by the Local Supervisor. Supervisor policy
uses component capabilities and typed outcomes; wrapper classes, process handles,
defaults, and global hooks remain inside that adapter. This is an implementation
boundary, not a universal database manager or a second process supervisor.

The Host retains asynchronous context-owned PostgreSQL persistence. Desktop and
SDK clients use the selected Host API and receive neither SQL credentials nor
database lifecycle authority. A server Target starts no unused local database.
The engine, state ownership, durability, and recovery rules of ADR-0106 remain
in force; this ADR completes its launcher approach without superseding them.

The exact wrapper version, actual engine, helper binaries, per-platform artifacts,
configuration, and supported OS/architecture matrix remain unselected until
OD-003 and OD-021 qualify them. In particular, accepting this approach does not
adopt the tested `18.4.0-beta.17` package as the production version.

The [packaged PostgreSQL qualification matrix](../architecture/local-host-lifecycle.md#packaged-postgresql-qualification)
is mandatory for the corresponding released platform and capability. Windows
and macOS require their own packaged evidence. Backup qualification includes
actual restore into a clean isolated data root and validation before activation.
Each shipped update path separately qualifies application/Host, schema, and
engine transitions; unsupported transitions are rejected. An initial
implementation need not implement automatic updates to start qualification.

Supported wrapper configuration and small maintained fixes must satisfy the
component contract, including already-exited children and the package's global
exit hook. The guarded Linux experiment is not a complete production fix. A
proven limitation may use qualified standard PostgreSQL tools within the same
adapter under ADR-0106; that is an explicit implementation decision, never an
automatic startup fallback, reset of existing data, or commitment to maintaining
two launcher implementations.

OD-003 and OD-021 remain open for the exact integration and operational evidence.
OD-040 and the existing readiness gates still govern production package
materialization. This decision neither changes the server-first V1 scope nor
qualifies Fully Local or selects a Desktop framework.

## Consequences

- The implementation starts with one selected maintained wrapper behind the
  existing lifecycle owner, avoiding a parallel custom launcher by default.
- Host persistence and consumers remain independent of the launch library and
  can retain their contracts if a demonstrated limitation requires a replacement.
- Packaging, updates, process custody, and verified recovery remain product
  responsibilities with explicit release evidence; a library choice cannot
  substitute for them.

## Rejected alternatives

- Start with a fully custom direct-tools launcher: the Linux comparison does
  not demonstrate enough advantage to displace the selected wrapper approach.
- Introduce Rust solely for a PostgreSQL wrapper: changes the lifecycle substrate
  without an independent product requirement.
- Approve an exact research package or all Desktop platforms from Linux results:
  exceeds the evidence and leaves known lifecycle paths unqualified.
- Move wrapper calls into Desktop, business features, or SQL repositories:
  creates competing ownership and couples persistence semantics to distribution.
