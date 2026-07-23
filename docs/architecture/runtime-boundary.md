# Runtime Boundary

Status: **Accepted ownership model; contract details remain open**

## Principle

The orchestrator is the control plane. `ar` is the execution and safety runtime.
Provider implementations belong behind `ar`.

```mermaid
flowchart LR
    Orchestrator["Orchestrator Contexts"]
    Port["AgentRuntimePort"]
    Adapter["ar Client Adapter"]
    AR["ar Runtime"]
    Driver["Provider Driver"]
    Provider["Claude / Codex / OpenCode"]

    Orchestrator --> Port
    Adapter -. "implements" .-> Port
    Adapter --> AR
    AR --> Driver
    Driver --> Provider
```

## Authority matrix

| Responsibility | Owner |
|---|---|
| Team, task, and message intent | Orchestrator |
| Assignment and completion policy | Orchestrator |
| Desired runtime state | Orchestrator |
| Provider capability selection policy | Orchestrator using runtime facts |
| Runtime process and worker lifecycle | `ar` |
| Provider session custody and resume | `ar` |
| Cancellation, timeout, and recovery execution | `ar` |
| Leases, fencing, sandbox, workspace isolation | `ar` |
| Provider API, CLI, SSE, and protocol translation | `ar` provider driver |
| User-facing projections | Orchestrator projections and client applications |
| Sidecar process supervision | Host composition, not agent-run ownership |

There must never be two writers for one runtime mutation or two supervisors for
one agent process.

## Contract capability families

Exact method names are not accepted yet. The runtime contract must cover:

- capability discovery;
- preflight and admission;
- start;
- observe and snapshot;
- event subscription with a resumable cursor;
- input or message delivery;
- managed resume;
- approval listing and answering;
- cancellation and stop;
- recovery after host or runtime restart.

The contract must support different topology models:

- one process per agent;
- one provider host with multiple sessions;
- remote managed execution;
- providers with or without interactive approvals;
- providers with or without native resume.

The orchestrator must not infer process topology from provider identity.

## Identity and fencing

Commands must carry enough identity to reject stale ownership:

- orchestration run ID;
- runtime run reference;
- aggregate generation or expected revision;
- idempotency key;
- correlation and causation IDs;
- optional lease or fencing token.

Opaque runtime references must not be reconstructed from process IDs, paths, or
provider session names.

## Snapshots and events

Runtime events are facts emitted by `ar`. Orchestration projections combine those
facts with product state. Runtime snapshots are replaceable read models, not
orchestration aggregates.

Every snapshot needs:

- runtime reference and provider kind;
- observation timestamp;
- lifecycle and liveness state;
- progress evidence;
- pending interaction state;
- outcome or failure classification;
- warning and diagnostic codes;
- monotonic revision or cursor where supported.

## OpenCode target placement

OpenCode integration belongs in an `ar` provider adapter. Candidate legacy donor
modules include host/profile/session management, event streaming, permission
normalization, MCP handling, execution probes, and provider inventory.

The desktop and legacy orchestrator code are behavioral oracles, not code that can
be copied into the new core without classification.

## Migration rule

Use an anti-corruption adapter during migration:

1. freeze legacy behavior with contract tests;
2. implement the orchestrator runtime port against the legacy bridge;
3. implement the same conformance suite for the new `ar` provider adapter;
4. permit shadow reads where useful;
5. never permit dual writes or dual process ownership;
6. switch one capability at a time;
7. remove the legacy bridge only after parity and recovery verification.

## Host-level supervision

Desktop or server hosts may supervise the orchestrator and `ar` sidecar processes.
That does not make them owners of individual agent processes or sessions. The host
may restart a failed sidecar; `ar` recovers runtime ownership using durable state
and fencing.
