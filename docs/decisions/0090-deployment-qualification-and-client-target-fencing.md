---
id: ADR-0090
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/composition
summary: Gate deployment qualification, fence client target generations, and defer local-runtime connectivity until its security contract is accepted.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0038
  - ADR-0058
  - ADR-0087
  - ADR-0088
  - architecture.deployment-profiles
  - architecture.implementation-readiness-gates
  - architecture.security
  - OD-012
  - OD-037
  - OD-038
---

# ADR-0090: Deployment Qualification and Client Target Fencing

## Context

ADR-0087 selects Managed SaaS and Standalone Self-Hosted Server as V1 targets;
it does not prove either target production-qualified. Identity, revocation, and
hosted-to-local runtime connectivity remain open. The first profile model also
needs a hard client fence so late responses from one Target cannot appear after
the user switches to another.

Reserved local package paths would otherwise be materializable merely because
their historical owner documents are accepted, contradicting the V1 deferral of
Fully Local.

## Decision

### Qualification is evidence-based

`V1 target` and `qualified` are separate machine-readable states. Managed SaaS
and Standalone Self-Hosted are V1 targets but remain blocked until their listed
authority, tenant-isolation, runtime-connectivity, recovery, and conformance
gates pass. Connected Self-Hosted and Fully Local remain future deferred
profiles.

The reliability catalog is the machine-readable profile registry. CI rejects an
unknown profile and validates its release scope, qualification state, and
blocking decisions.

### Client target generation

Every client-side resource identity is composite:

```text
ClientResourceRef = TargetIdentity + PublicResourceRef
ClientTargetGeneration = ProfileId + TargetIdentity + local generation
```

`TargetIdentity` and the client generation are not fields in a server-side
Project Aggregate. Activating another profile atomically retires the old client
generation. Requests, subscriptions, cursors, caches, optimistic updates,
operation handles, and late responses carry the generation and are discarded or
closed when stale. A command is never retried against another Target.

### Hosted control of local execution

Managed or Self-Hosted orchestration may advertise local-device execution only
after OD-038 accepts and qualifies enrollment, device identity, outbound channel,
revocation, reconnect, custody, and Desktop-exit behavior. Desktop is a client
and bootstrap surface; it does not become owner of a durable Run or runtime
session merely because the runtime process is local.

### Authority and realtime

Managed qualification is blocked by OD-012. A client obtains Host-issued,
short-lived subscription authority before connecting to the realtime edge. The
edge never derives scope from client fields and never replaces authoritative
feed resynchronization.

Commercial capability evidence is Host-custodied and follows OD-037. Commercial
failure cannot block cancellation, containment, recovery, deletion, or baseline
access and export of customer-owned data.

### Deferred package materialization

The package catalog marks Local Supervisor, Local Orchestrator application, and
Local Host SDK materialization as `deferred`. Topology validation and the
scaffolder fail closed while that marker remains. Removing it requires a future
accepted decision and the Fully Local qualification evidence.

## Consequences

- Server-first code can begin only after the V1 readiness gates pass; wording in
  a profile table is not qualification evidence.
- Profile switching is deterministic across Web, Desktop, CLI, and SDK clients.
- Local agent execution behind a hosted Host remains an explicit capability, not
  an accidental Desktop tunnel.
- Fully Local package names remain reserved without allowing premature code.

## Rejected Alternatives

- Treat a selected V1 target as already production-qualified.
- Key client caches and subscriptions only by Project ID.
- Let Desktop own durable runtime lifecycle for a hosted Run.
- Materialize deferred local packages because their historical owner ADR exists.
- Connect a client to realtime before the Host issues scoped subscription
  authority.
