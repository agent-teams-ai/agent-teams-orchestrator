---
id: ADR-0083
type: adr
status: proposed
owner: architecture/security
summary: Defines backend-neutral assurance intent while Agent Runtime owns containment compilation and enforcement.
related:
  - ADR-0003
  - ADR-0055
  - ADR-0062
  - ADR-0079
---

# ADR-0083: Assurance profiles and replaceable runtime containment

## Context

The Orchestrator must express how strongly an agent execution must be isolated
without turning Docker, Kubernetes, OpenSandbox, gVisor, Kata, Firecracker, or a
future runtime into product-domain vocabulary. Local Desktop, standalone Linux,
hosted shared, dedicated, customer-cloud, and air-gapped deployments cannot use one
identical mechanism, but they must preserve the same requested guarantees and
failure semantics.

`RuntimeIsolationRequirement` in ADR-0062 already separates runtime security
from workspace materialization. The remaining durable choice is how product
policy requests an assurance level, how AR proves it, and where admission and
resource placement may participate without creating a second sandbox authority.

## Decision

The Orchestrator records a normalized, backend-neutral
`RuntimeIsolationRequirement` selected by Policy and Risk. A user-facing
execution-assurance profile is a versioned preset that compiles to those
orthogonal requirements. It is not a runtime implementation name and not one
growing isolation enum.

At minimum, requirements may constrain:

- filesystem and mount authority;
- process and kernel isolation;
- ingress, egress, and internal-network reachability;
- credential exposure and injection mechanism;
- Linux capability, device, PID, CPU, memory, IO, and storage envelopes;
- writable-state sharing and persistence;
- attestation, cleanup, and residue evidence;
- minimum runtime capability and downgrade policy.

Profiles such as `standard`, `strong`, and `dedicated` are product-facing policy
presets. Their exact guarantees are versioned policy data, not hard-coded
provider or infrastructure branches. A Project or Team may select an allowed
default. A Run or participant may strengthen it, but cannot weaken a governing
minimum. Run planning stores an immutable resolved policy snapshot so a later
profile edit cannot silently change an active execution.

Ownership remains explicit:

| Responsibility | Owner |
| --- | --- |
| Trust classification and minimum isolation intent | Policy and Risk |
| Resolved requirement attached to Run activation | Run Orchestration |
| Workspace materialization and cleanup | Workspace Registry |
| Technical containment compilation, capability negotiation, sandbox lifecycle, enforcement, and attestation | AR |
| Resource admission, fairness, reservation, and placement when composed | Runtime-capacity implementation behind AR |
| Concrete sandbox, scheduler, container, VM, or Kubernetes mechanics | Replaceable AR or runtime-capacity outbound adapters |

The Orchestrator imports no WorkloadFunnel, OpenSandbox, Kubernetes Agent
Sandbox, Docker, gVisor, Kata, or Firecracker contract. Its runtime ACL maps the
resolved product requirement to the AR Published Language and maps AR evidence
back to provider-neutral observations.

AR may internally compose a workload-admission system and one or more sandbox
backends. That composition must preserve one mutation owner for each external
resource. Infrastructure lifecycle states are observations and receipts, never
copies of `Run`, `RuntimeSession`, or `RuntimeOperation` state.

The following invariants apply:

- a missing required capability blocks activation before provider execution;
- no adapter silently downgrades a requested guarantee;
- an implementation name, container ID, Pod name, process ID, or host path is
  never product authority;
- independent agents or Runs do not share writable sandbox authority in v1;
- one RuntimeSession may reuse one assigned sandbox across its operations;
- an unassigned warm sandbox contains no tenant data or credentials;
- a previously assigned sandbox cannot move to another Tenant unless qualified
  reset evidence satisfies the requested policy; destruction is the safe
  default;
- read-only images and verified caches may be shared without sharing writable
  process, credential, or workspace authority;
- idle pause, hibernation, or deletion never implies successful workspace,
  artifact, credential, or runtime cleanup without separate receipts.

Concrete backend selection remains evidence-driven. OpenSandbox, Kubernetes
Agent Sandbox, gVisor, Kata, Firecracker, Docker Sandboxes, native process
boundaries, and WorkloadFunnel are preferred candidates rather than normative
dependencies until conformance, density, recovery, and isolation qualification
passes for a supported deployment profile.

## Consequences

- Local and hosted profiles can provide different mechanisms behind one policy
  and AR boundary.
- Users select understandable assurance and accept its resource/cost tradeoff;
  ordinary product flows do not expose infrastructure implementation names.
- AR and runtime-capacity implementations need capability negotiation,
  conformance fixtures, attestation, and fail-closed composition validation.
- Stronger isolation can reduce density and increase startup latency. Admission
  and autoscaling policy must account for the resolved profile.
- Backend qualification and version matrices remain deployment-readiness work;
  this ADR does not declare any candidate production-ready.

## Rejected alternatives

- One `isolationMode` enum mixing Git worktree implementations, containers,
  VMs, schedulers, and
  security properties. It conflates independent guarantees and repeats the
  mistake rejected by ADR-0062.
- Make a concrete sandbox product part of Orchestrator domain or public SDK.
  This reverses the runtime boundary and makes local and hosted evolution
  incompatible.
- Let every caller select raw backend names. This bypasses governing policy and
  couples users to operator topology.
- Silently fall back to a weaker local implementation when the selected profile
  is unavailable. This turns an assurance claim into a false guarantee.
