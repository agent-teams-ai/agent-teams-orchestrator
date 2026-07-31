---
id: ADR-0033
type: adr
status: superseded
owner: platform/local-host
summary: Use a shared local supervisor for zero-touch lifecycle of versioned local orchestrator components.
related:
  - ADR-0003
  - ADR-0030
  - architecture.local-host-lifecycle
  - OD-001
  - OD-021
supersedes:
  - ADR-0022
superseded_by:
  - ADR-0060
  - ADR-0064
---

# ADR-0033: Shared Local Supervisor and Versioned Host

## Context

Desktop, CLI, and other local applications need one durable orchestrator that
continues work when a client disconnects. Requiring each client to spawn its own
child process creates competing lifecycle owners, duplicate databases and
consumers, incompatible versions, and accidental termination of durable work.

Normal local use must remain zero-touch. Users must not manually install or start
managed local components. At the same time, process supervision, business
orchestration, provider execution, and event transport have different reasons to
change and must not be placed in one service.

## Decision

Use a shared per-user `Local Supervisor` as the technical deployment-control
process for local installations. It manages versioned local components but owns no
orchestration business behavior.

The local process topology is:

```text
CLI / Desktop / other local client
  -> narrow bootstrap control
  -> Local Supervisor
       -> ensures and discovers Orchestrator Host
       -> supervises managed local infrastructure

CLI / Desktop / other local client
  -> Orchestrator SDK
  -> Orchestrator Host public control API
```

The Local Supervisor owns:

- lifecycle serialization so concurrent clients cannot start competing hosts;
- component installation verification and staged version activation;
- stable discovery of the active local target;
- instance and boot identity, readiness, health, bounded restart, drain
  coordination, and process availability;
- availability of separately selected managed local infrastructure, with each
  component's lifecycle and recovery policy fixed by its own decision;
- availability of an Agent Runtime host only when the selected deployment packages
  it as a managed component.

The Local Supervisor does not:

- import bounded-context domain or application code;
- run orchestration commands, tasks, policies, workflows, or projections;
- proxy normal public control API traffic;
- own Agent Runtime sessions, attempts, provider processes, permissions, sandbox
  enforcement, credentials, or recovery;
- expose process installation and termination through the ordinary public SDK.

The versioned `Orchestrator Host` remains the application composition root. It
owns bounded-context use cases, process managers, Unit of Work boundaries,
inboxes, outboxes, projections, public control adapters, and startup
reconciliation. Normal SDK traffic goes directly to the Host after protected
discovery and an authenticated version and capability handshake.

The Local Supervisor may supervise only AR host availability. `ar` remains the
sole owner of provider-session and provider-process lifecycle. The orchestrator
communicates with AR only through its SDK, Runtime Published Language, and the
orchestrator-owned Runtime ACL. Neither the Local Supervisor nor Orchestrator Host
starts or kills OpenCode, Codex, Claude, or another provider process directly.

Local bootstrap control and the Host public control API are separate protected
surfaces. A stable locator identifies the Supervisor or local target; the active
Host uses a rotating per-instance endpoint and authenticated handshake. PID is
diagnostic metadata, never authority.

An idempotent platform bootstrapper in the local application composition may
register or start the Local Supervisor through the OS service manager when it is
absent. This capability is separate from the ordinary SDK and from Supervisor
control. Concurrent first-run clients must converge through an interprocess
lifecycle lock rather than launch competing Supervisors.

Client configuration separates three concepts:

- `Target` identifies one concrete orchestrator deployment and its trust boundary;
- `Client Profile` stores user defaults that select a target and default scope;
- `Workspace` is an orchestrator resource and never selects endpoint, credentials,
  installation channel, or trust policy.

The default local target is automatically ensured. Explicit foreground and
ephemeral modes remain available for development, CI, and diagnostics without
changing application semantics.

Client disconnect, SDK cleanup, terminal closure, and `Ctrl+C` detach only the
client. Durable work continues until an explicit business cancellation command is
accepted.

Updates use staged side-by-side component installation. An active Host binary is
never replaced in place. Before activation, the Host stops accepting new
mutations, completes in-flight Units of Work, commits outcomes and outbox records,
drains consumers and publishers, and publishes readiness for replacement. After
restart it reconciles durable state with AR and JetStream. Provider execution
continues where AR capabilities permit. Exact compatibility, rollback, and OS
service-manager policy remains in OD-021.

A compatible client reuses the active Host. An ordinary client invocation never
forces replacement merely because another component version is available. An
incompatible client receives a typed compatibility outcome and operator guidance;
replacement requires the explicit privileged drain and activation path selected
by OD-021.

Hosted deployments use their platform supervisor, such as systemd or a container
orchestrator, instead of the local process. They preserve the same separation
between deployment control, Orchestrator Host behavior, AR execution, and
JetStream transport.

## Consequences

- CLI, Desktop, and other local applications share one durable control plane
  without making any client its lifecycle owner.
- Normal local component startup remains automatic.
- Supervisor failure and Host failure are independently diagnosable and
  recoverable.
- Local packaging needs a small privileged control surface, platform-specific
  service-manager adapters, version compatibility tests, and update recovery
  tests.
- The Supervisor must remain deliberately smaller than the Host; adding product
  behavior to it is an architecture violation.
- Target discovery, Host control, AR integration, and JetStream transport retain
  separate conformance suites.

## Rejected alternatives

- Let Desktop own the only local sidecar lifecycle.
- Let every SDK or CLI process spawn and stop an orchestrator.
- Put install, update, orchestration, and public API behavior in one self-managing
  Host process.
- Proxy every SDK request through the Local Supervisor.
- Start one orchestrator per workspace or client profile.
- Let the orchestrator or Supervisor manage provider processes directly.
- Copy OpenCode or Codex daemon behavior without preserving these ownership
  boundaries.
