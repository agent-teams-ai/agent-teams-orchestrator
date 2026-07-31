---
id: architecture.migration-boundary
type: architecture
status: accepted
owner: migration/desktop
summary: Normative compatibility, ownership, cutover, rollback, and legacy-code rules for desktop migration.
related:
  - ADR-0029
  - ADR-0065
  - OD-010
  - OD-015
---

# Migration Boundary

## Compatibility boundary

Desktop integration moves through a compatibility facade around the existing IPC
and shared DTO surface. Frontend DTOs remain client compatibility contracts; they
do not become orchestrator domain, application, Runtime Published Language, or
public SDK models.

Every mapped capability declares:

- current IPC methods, DTO variants, progress events, errors, and cancellation;
- legacy owner and target bounded context or integration owner;
- synchronous and asynchronous observable behavior;
- idempotency, ordering, retry, timeout, and recovery semantics;
- target SDK/API mapping;
- cutover and rollback control;
- deletion criteria for the legacy path.

The compatibility facade owns migration-only reliability state that the legacy
DTO never modeled. Before its first durable SDK command, it allocates and
persists a stable `requestId` plus the command descriptor needed to resolve the
outcome after a client or Host crash. After acceptance it persists the complete
opaque Operation name. A timeout never causes the facade to allocate a new
identity and try the other owner.

Legacy progress callbacks are convenience notifications, not a durable feed. The
facade checkpoints the SDK cursor separately, deduplicates by SDK event identity,
and reconciles through operation lookup after reconnect before emitting the
cursor-less `TeamProvisioningProgress` DTO. The renderer does not become
responsible for SDK cursor semantics merely to preserve the old callback shape.

Provider CLI switches, raw arguments, process IDs, pane details, and similar
legacy fields remain migration-private mappings or Desktop projections until an
owning context accepts their product semantics. Preserving a legacy field does
not make it a public SDK field.

## Single-owner cutover

One capability has one authoritative writer and one process owner at any moment.
Routing selects either the legacy implementation or the new implementation before
a mutation begins. It cannot retry the same mutation through the other owner after
an ambiguous outcome.

Shadow reads may compare projections. Shadow commands may validate serialization
only when they cannot produce a side effect. Runtime start, input, approval,
cancel, resume, task mutation, and message delivery are never dual-written.

## Legacy code disposition

Every legacy module is classified before reuse:

```text
behavioral oracle
contract fixture source
re-derived algorithm
temporary compatibility adapter
obsolete
```

Classification never authorizes copying legacy domain/application structure into
the new core. New behavior follows accepted Ubiquitous Language, invariants,
ownership, ports, and transaction boundaries.

The read-only legacy Electron and OpenCode audit is recorded in the
[research report](../research/legacy-electron-opencode-behavior-audit-2026-07-30.md).
Its provider-specific code remains evidence, not a target package layout.

In particular:

- process hosts, provider sessions, execution proof, credentials, private
  fencing, technical cancellation, and recovery move behind the AR boundary;
- partial participant failure, product readiness, Run policy, and Work placement
  remain Orchestrator behavior;
- IPC and shared Team DTOs remain compatibility contracts mapped by the Desktop
  facade;
- the broad legacy `TeamsAPI` remains a compatibility facade and is decomposed
  into narrow SDK and application capabilities;
- the broad legacy runtime adapter is replaced by narrow consumer-owned
  capability ports and separate inbound and outbound ACL modules;
- provider-specific diagnostic strings remain migration projections rather than
  public SDK or domain enums.

Legacy runtime snapshots are reconstructed from canonical Run and runtime
projections. The target projection exposes source revision, cursor, observation
time, freshness, and typed evidence. Renderer anti-flicker windows, snapshot
equality shortcuts, and stale-response smoothing remain client policies and do
not enter domain or application state.

Electron IPC, hosted HTTP, Connect, and direct SDK entry points invoke the same
application capabilities through separate inbound adapters. Migration does not
preserve provider-specific HTTP endpoints as public Orchestrator contracts.
Transport parity is proven by conformance rather than by sharing controller
classes.

Legacy message DTOs that combine team communication, system notification, and
runtime diagnostics are split by the compatibility ACL before dispatch to their
owning capabilities. Similar display shape never creates shared domain ownership.

The curated migration conformance matrix includes partial lane failure, pending
permission, stale owner, late reconcile, context application without a model
turn, ambiguous delivery, uncertain stop, and restart recovery.

## Verification and rollback

A capability can switch only after:

- legacy compatibility fixtures pass;
- new domain and application tests pass;
- adapter conformance passes;
- crash, duplicate, stale, cancellation, and restart behavior is verified;
- runtime capabilities use isolated sandbox projects;
- the rollback route is known and does not create dual ownership.

Rollback changes routing for new commands. It does not blindly replay operations
whose outcome is unknown. Existing durable operations continue under their
recorded owner or enter explicit reconciliation.

## Task board

The current desktop board remains a compatibility integration during the first
orchestration migration. Work Coordination owns canonical task semantics. OD-015
still decides field authority, identifier mapping, offline conflicts,
reconciliation, staged cutover, and deletion of legacy board ownership.
