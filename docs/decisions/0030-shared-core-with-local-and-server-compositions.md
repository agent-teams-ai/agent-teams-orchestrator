---
id: ADR-0030
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: apps
summary: Build one orchestrator core with separate local and server composition roots.
related:
  - ADR-0001
  - ADR-0022
  - OD-001
  - OD-002
  - OD-003
---

# ADR-0030: Shared Core with Local and Server Compositions

## Context

The orchestrator must run automatically beside Desktop, as a local process for
other applications, and as a hosted control plane. These environments share
business behavior and public contracts but differ in process supervision,
persistence, authentication, tenancy, event transport, packaging, and operations.

One universal executable selected by environment flags would make unsupported
combinations easy to construct and would pull hosted dependencies into local
packaging. Separate product implementations would duplicate behavior and allow
local and hosted semantics to drift.

## Decision

Build one logical orchestrator application core and two thin deployable
composition roots:

```text
apps/
  orchestrator-local/
  orchestrator-server/
```

`orchestrator-local` composes the protected local control transport, SQLite
persistence, local runtime integration, and local lifecycle adapters. Desktop may
automatically supervise this artifact as its sidecar. CLI tools and other local
applications may connect to the same supported local API without making Desktop
the orchestrator owner.

`orchestrator-server` composes hosted authentication and tenant isolation,
PostgreSQL persistence, network control transports, JetStream adapters, and hosted
operations.

Both artifacts:

- use the same domain and application packages;
- implement the same public control behavior and applicable conformance suites;
- select adapters only in their composition roots;
- contain no product policy or domain invariants;
- expose capabilities explicitly rather than silently changing semantics by
  environment.

The terms `local`, `desktop`, `server`, and `hosted` cannot drive branches in domain
or application code. Deployment-specific behavior is represented by narrow ports,
adapter capabilities, and composition validation.

`sidecar` remains the lifecycle relationship described by ADR-0022, not the name
or ownership boundary of the local deployable artifact. Future Temporal workers,
maintenance tools, or CLIs are separate composition roots only when their process
topology requires it; they do not create another application core.

## Consequences

- Desktop startup can remain automatic and simple for users.
- Other applications can use the orchestrator locally or remotely through stable
  contracts.
- Local and hosted packaging remain independently secure and operable.
- Every public capability needs cross-profile behavioral conformance.
- Composition validation must reject incomplete or contradictory adapter sets.

## Rejected alternatives

- One executable containing every local and hosted dependency and selected only by
  runtime flags.
- Separate local and hosted business implementations.
- Put process supervision in the general SDK.
- Make Electron Main the owner of orchestration behavior.
