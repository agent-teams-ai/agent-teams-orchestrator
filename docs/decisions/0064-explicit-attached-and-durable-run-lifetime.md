---
id: ADR-0064
type: adr
status: accepted
superseded_by: []
owner: run-orchestration
summary: Separate attached client-bound Run lifetime from explicitly durable work without transferring shared process ownership.
approved_by: product-owner
accepted_at: 2026-07-29
related:
  - ADR-0033
  - ADR-0060
  - architecture.local-host-lifecycle
  - architecture.sdk-transports
supersedes:
  - ADR-0033
---

# ADR-0064: Explicit Attached and Durable Run Lifetime

## Context

ADR-0033 correctly removed Host and infrastructure lifecycle from individual
Desktop and CLI processes. It also stated that every client exit or `Ctrl+C`
detaches from durable work.

That blanket rule is correct for an observer or explicitly detached Run, but it is
unsafe and surprising for an attached CLI invocation whose work should not be
orphaned. Shared process availability and product Run lifetime need different
owners and independently selected policies.

ADR-0060 now owns the single Local Supervisor decision. This ADR replaces the
remaining Run-lifetime semantics from ADR-0033.

## Decision

Every created Run has an explicit `RunLifetimePolicy`:

```text
CLIENT_BOUND
DURABLE
```

`CLIENT_BOUND` means that one explicit `RunSponsorship` owns the Run's attached
lifetime. The creating CLI maintains a fenced heartbeat. A clean `Ctrl+C` or
normal exit sends an explicit idempotent business cancellation and waits for a
bounded cleanup result. Process death, terminal loss, or network loss stops the
heartbeat; expiry plus a configured grace period causes the owning Run
Orchestration process manager to request the same cancellation. A stale sponsor
cannot renew or revive a superseded sponsorship.

`RunSponsorship` is separate feature-owned process state because frequent
heartbeats must not contend on the `OrchestrationRun` aggregate revision. It
records sponsor identity, Run authority generation, revision, expiry, and grace
deadline without using a socket or PID as authority. Host restart applies a
bounded recovery grace before expiry evaluation so Host downtime alone does not
cancel a still-sponsored Run.

`DURABLE` means that client exit never cancels the Run. An explicit detach option
selects this policy before Run creation. The client receives the Run and Operation
references needed for later status, attach, cancellation, and recovery.

The product CLI defaults commands that create attached work to `CLIENT_BOUND` and
offers `--detach` or `-d` for `DURABLE`. Read-only `watch`, `status`, and ordinary
SDK waits never become sponsors; `Ctrl+C` only closes their local wait. Other
clients, including Desktop, select Run lifetime explicitly instead of inheriting
behavior from process connection count.

An interactive promotion from `CLIENT_BOUND` to `DURABLE` may be added as an
explicit one-way, compare-and-set Run command. Closing the terminal is never an
implicit promotion.

The generic SDK treats `AbortSignal`, transport disconnect, iterator close, and
client cleanup as local I/O cancellation. A CLI controller implements sponsorship
through explicit Run commands. Connection reference counting, socket lifetime,
and Local Supervisor health are never Run-lifetime authority.

Run cancellation affects only work and participant activations owned by that Run.
Run Orchestration records desired cancellation and coordinates cleanup through
feature-owned process state. AR enforces runtime cancellation through its
Published Language. The CLI never kills provider processes, the shared AR Host,
Orchestrator Host, Local Supervisor, NATS, or Centrifugo directly.

Cancellation acknowledgement is not proof of completed cleanup. If the bounded
wait expires, the CLI returns a typed incomplete-cleanup outcome with durable
references while the Host continues reconciliation. Repeated `Ctrl+C` may stop
the local wait, but cannot bypass server-side cancellation and fencing.

## Consequences

- Attached CLI work is not silently orphaned, while detached Runs remain durable.
- Abrupt client loss needs a durable sponsorship heartbeat, grace period, fencing,
  and crash-recovery tests.
- Frequent sponsorship heartbeats do not contend on the Run aggregate.
- Shared infrastructure remains available after one Run is cancelled.
- Desktop close behavior must select product policy explicitly rather than inherit
  CLI or socket behavior.

## Rejected alternatives

- Infer Run lifetime from SDK connection counts or process parenthood.
- Make every client exit detach, including an attached one-shot CLI.
- Kill shared infrastructure to guarantee cleanup of one Run.
- Let `AbortSignal` or iterator cleanup become an implicit business command.
