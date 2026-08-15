---
id: ADR-0083
type: adr
status: accepted
owner: architecture/security
summary: Limit Orchestrator to product assurance intent while Agent Runtime owns all technical containment.
approved_by: product-owner
accepted_at: 2026-08-13
supersedes: []
superseded_by: []
related:
  - ADR-0003
  - ADR-0028
  - ADR-0055
  - ADR-0062
  - ADR-0079
  - architecture.runtime-boundary
  - architecture.security
---

# ADR-0083: Orchestrator Assurance Intent and AR Containment Ownership

## Context

The Orchestrator needs to express product assurance intent without specifying
sandbox assignment, reuse, warm-pool, reset, resource, cleanup, or
backend-qualification behavior. Those are technical execution concerns already
owned by Agent Runtime under ADR-0003 and the Runtime Published Language
boundary.

Keeping those rules in both repositories would create two policy compilers and
two lifecycle authorities. It would also prevent AR from evolving containment
without changing product-domain decisions.

## Decision

The Orchestrator owns only the product meaning of required execution assurance.
The `RuntimeIsolationRequirement` term in ADR-0062 is interpreted as a
consumer-owned product assurance intent, not an AR technical policy model or a
shared domain type.

Ownership is explicit:

| Responsibility | Owner |
| --- | --- |
| Product trust classification and minimum assurance intent | Policy and Risk |
| Immutable resolved assurance intent for a Run or participant | Run Orchestration |
| Narrow consumer-owned port used by the governing use case | Owning Orchestrator feature |
| Representation mapping to and from the Runtime Published Language | Stateless Runtime ACL |
| Technical containment policy, capability negotiation, backend selection, admission, lifecycle, enforcement, evidence, and recovery | Agent Runtime |
| Sandbox scheduling, warm pools, reuse, reset, pause, destruction, resource accounting, and technical cleanup | Agent Runtime and its outbound adapters |
| Workspace registration, materialization, release, and workspace cleanup | Workspace Registry |
| Concrete deployment topology and enabled AR adapters | Composition and deployment operations |

Product-facing assurance profiles may remain versioned presets. They express
user and policy outcomes, not mounts, kernel primitives, container settings,
scheduler topology, or vendor names. Run Orchestration records an immutable
profile version or resolved semantic snapshot so an active Run cannot change
when policy configuration changes.

The Orchestrator may require a guarantee and prohibit downgrade. It then:

1. sends the requirement through a feature-owned consumer port;
2. receives typed AR capability, admission, and evidence outcomes through the
   Runtime ACL;
3. blocks activation or risky dispatch when required assurance is unsupported,
   unavailable, stale, or not proven according to product policy;
4. stores only product policy identity, immutable resolution evidence, opaque
   AR references, and provider-neutral observations needed by its own process.

The Orchestrator does not infer assurance from a container ID, process ID,
sandbox ID, Pod, host path, backend name, or generic success receipt. It never
selects a concrete sandbox product through domain state or its public SDK.

The Runtime ACL translates representation only. It does not compile technical
containment, choose a backend, own lifecycle state, or persist a shadow sandbox
registry. AR Published Language owns the technical capability and evidence
vocabulary; Orchestrator consumer ports own only the semantic questions their
use cases ask.

No Orchestrator decision may prescribe:

- one sandbox per session, operation, agent, or Run;
- writable-sandbox sharing or non-sharing mechanics;
- warm-pool, hibernation, reset, reuse, cache, or destruction algorithms;
- container, VM, Kubernetes, native-process, or microVM selection;
- capacity, placement, resource-accounting, or backend-fencing algorithms;
- technical conformance matrices for a sandbox backend.

Those choices require AR-owned architecture and qualification evidence. They may
be visible to Orchestrator only as negotiated capabilities, opaque evidence, and
typed outcomes.

Backend density, recovery, residue, network, credential, and destructive-cleanup
spikes belong in the Agent Runtime repository. Orchestrator tests only its side
of the boundary: policy resolution, no backend leakage, ACL mapping, typed
unsupported or uncertain outcomes, immutable Run snapshots, and fail-closed
activation. Managed cross-repository E2E may verify the composed contract without
making Orchestrator the sandbox implementation owner.

## Consequences

- Agent Runtime can evolve local, hosted, and future containment backends without
  changing Orchestrator domain models.
- Orchestrator remains able to offer understandable assurance choices and enforce
  stronger product policy without claiming technical mechanisms it does not own.
- Workspace materialization and runtime containment remain independent owner-local
  lifecycles joined only by explicit references and evidence.
- Concrete candidates remain non-normative until AR qualifies and publishes the
  applicable capability.

## Rejected Alternatives

- Keep lifecycle rules in both repositories. This creates duplicate authority
  and incompatible evolution.
- Move product trust policy into AR. AR enforces technical containment but does
  not decide business risk or Run policy.
- Expose backend names as product profiles. This couples users and public
  contracts to deployment internals.
- Treat the Runtime ACL as a policy compiler or durable registry. This would make
  an adapter a second application owner.
