---
id: ADR-0060
type: adr
status: proposed
owner: platform/local-host
summary: Clarify that one shared Local Supervisor exclusively owns local orchestrator process lifecycle.
related:
  - ADR-0030
  - ADR-0033
  - architecture.local-host-lifecycle
  - architecture.overview
---

# ADR-0060: Single Local Supervisor Lifecycle Owner

## Context

ADR-0030 accepted separate local and hosted composition roots and included an
early statement that Desktop could supervise the local artifact as a sidecar.
ADR-0033 later superseded the sidecar ownership model from ADR-0022 and accepted
one shared per-user Local Supervisor so Desktop, CLI, and other local clients do
not become competing lifecycle owners.

Current architecture documents follow ADR-0033, but ADR-0030 still makes the
historical alternative appear valid. The deployment-profile decision and the
process-lifecycle decision need an explicit relationship without rewriting
accepted ADR history.

## Decision

When accepted, this ADR will partially supersede only the local lifecycle
ownership statements in ADR-0030. ADR-0030 will remain authoritative for the
separate local and hosted composition roots.

One shared per-user Local Supervisor is the sole owner of local Orchestrator Host
process availability, lifecycle serialization, discovery, health, drain, restart,
and version activation. Desktop, CLI, and other local applications may invoke the
idempotent OS bootstrap capability and connect to the discovered Host, but they
must not directly supervise an Orchestrator Host or treat it as a client-owned
child process.

The `orchestrator-local` application remains the local Host composition artifact,
not a second supervisor. It owns application composition and orchestration
behavior after startup. The Local Supervisor owns no product policy and is not on
the normal SDK request path.

Hosted deployments continue to use their platform supervisor. This does not give
the local Desktop or SDK another lifecycle role.

## Consequences

- Local process lifecycle has one authority across Desktop, CLI, and other
  clients.
- The local and hosted composition split remains unchanged.
- Desktop integration uses bootstrap, discovery, and SDK connection rather than
  child-process ownership.
- ADR-0030 remains historical evidence; its conflicting lifecycle sentence is not
  treated as current architecture.

## Rejected alternatives

- Rewrite ADR-0030 and erase the historical decision.
- Let Desktop and the Local Supervisor both own Host restart and shutdown.
- Merge application composition and deployment supervision into one process.
