---
id: research.pre-code-expensive-decision-audit-2026-08-01
type: research
status: active
owner: architecture
summary: Parallel audit of architecture choices that become disproportionately expensive after production packages materialize.
related:
  - ADR-0071
  - ADR-0072
  - ADR-0073
  - ADR-0074
  - ADR-0075
  - ADR-0077
  - architecture.implementation-readiness-gates
  - OD-003
  - OD-004
  - OD-006
  - OD-010
  - OD-012
  - OD-013
  - OD-016
  - OD-019
  - OD-021
  - OD-029
  - OD-032
  - OD-033
  - OD-034
---

# Pre-Code Expensive Decision Audit, 2026-08-01

## Scope and method

This read-only audit compared the orchestrator at `a48fb35` with behavioral
evidence from the legacy Electron branch `refactor/hosted-web-feature-boundaries`.
Independent critics examined domain boundaries, runtime integration, public SDK,
side-effect uncertainty, migration, security, data lifecycle, and future
integrations. Legacy code was treated as a scenario oracle, never as target
architecture.

The audit asks which omissions create data, identity, authority, or compatibility
migrations that are much more expensive after packages and public contracts grow.

## Decisions confirmed during the audit

- ADR-0073 accepts Agent Context as a separate bounded context but does not
  authorize package materialization before Gate 2.
- ADR-0074 excludes Jira, Notion, Discord, and a general connector/plugin platform
  from v1 while OD-034 preserves the future installation boundary.
- ADR-0075 introduces an exact default-deny source dependency policy. Semantic
  LikeC4 edges do not grant imports.

## Required before the first production slice

### Run, Work, Team, and runtime identity

Use narrow aggregates and feature-owned durable process managers. Work
Coordination alone mutates Work lifecycle. Team Topology owns Team versions and
roster. Run Orchestration owns Run authority, plan promotion, participant
activation, placement coordination, and cleanup processes. AR identities remain
opaque runtime evidence.

The remaining specification must settle transition tables, generation and fence
keys, stale-result rejection, participant replacement, Work cancellation races,
and terminal authority without creating one cross-context transaction.

### Side-effect uncertainty and cancellation

Every external effect needs durable intent, dispatch identity, claim generation,
typed acceptance evidence, reconciliation, and cleanup state. Business
cancellation, external-effect status, and cleanup status are independent axes.

If dispatch commits before cancellation, cancellation cannot pretend the effect
never existed. An unknown effect without target fencing blocks automatic
replacement. Exactly-once applies only to authoritative internal transitions;
external effects require idempotent target support or explicit uncertainty.

### AR Published Language

Before the Runtime Gateway slice, define capability-scoped consumer ports,
capability negotiation, admission, receipts, control and output feeds, recovery,
permission decisions, and typed next actions. Orchestrator public Operation,
orchestrator child command, AR RuntimeOperation, provider invocation, and dispatch
identity remain distinct.

AR owns Protobuf, Buf, descriptor sets, capability catalog, and golden fixtures.
The orchestrator owns its consumer ports, ACL, and process-level conformance. No
repository copies the other's domain models.

### Public SDK and future ownership migration

ADR-0071 correctly separates caller request ID from server Operation identity.
For v1, the new orchestrator is the first and only authoritative owner of each
implemented capability. The Desktop compatibility adapter translates current IPC
and DTO behavior; it does not preserve old-orchestrator command ownership,
receipts, or domain state. Normal retry resolution therefore stays with the same
feature-owned command receipt and does not require a historical owner-affinity
index, admission route token, or central command directory.

Those mechanisms become relevant only if a live bounded context is later moved
between independently deployed owners while existing command receipts remain
valid. Such a move requires a separate ADR and migration protocol. An ordinary
version rollout against the same logical owner and persistence authority is a
schema and release-compatibility concern, not an owner-affinity migration.

The public contract also needs one machine-readable Operation catalog, typed
errors, business-specific cancellation, pagination and cursor authorization, and
TS/Go golden fixtures before SDK release.

### Security contract

Use distributed security authorities plus shared technical primitives, not a
Security bounded context. Before code, specify:

- trusted tenant/project scope on every aggregate, row, event, inbox/outbox,
  cursor, cache key, blob reference, and idempotency scope;
- immutable verified ActorContext, delegation, authority revision, and
  revocation behavior;
- opaque purpose-checked SecretRef resolution that never returns raw secrets to
  application code;
- confidentiality and content tags as separate axes with propagation rules;
- workspace binding generation, product trust decision, and AR-native
  enforcement as separate facts;
- redacted audit intent committed with state and outbox;
- signed release compatibility metadata for bundled sidecars.

OAuth provider, policy engine, KMS, service identity framework, and sandbox
implementation are adapter choices and can be deferred.

### Data lifecycle and disaster recovery

Define lifecycle semantics now and exact durations later. Every durable asset
needs a policy reference, retention and replay class, erasure disposition, backup
and restore class, and payload owner.

The pre-code contract must include:

- a validated horizon graph relating replay, redelivery, inbox dedupe,
  idempotency tombstones, migration, and disaster recovery;
- monotonic deletion epoch checked by replay, restore, delayed outbox, and blob
  recovery;
- a new deployment/restore epoch that stales old leases, tokens, cursors, and
  realtime cache positions;
- an outbox durability barrier classification for irreversible effects;
- owner-scoped blob references and PITR-aware garbage collection;
- disk-pressure states that preserve stop, cleanup, repair, and export capacity.

Orchestration Scope coordinates Project disposition under ADR-0080. Every bounded
context owns its local erase or anonymize behavior. Persistence and eventing
platforms own storage mechanics, never product deletion semantics.

### Release compatibility

Before Local Supervisor implementation, define a composed compatibility manifest
for Supervisor, Host, AR, NATS, Centrifugo, storage readers/writers, artifact
digest and signature, activation order, and rollback eligibility. A component
failure degrades only the capabilities it owns; for example, Centrifugo loss does
not invalidate durable commands.

## Legacy scenarios that must become fixtures

- primary runtime can start while another participant is still provisioning;
- a secondary lane can fail while the Run remains operational but degraded;
- bootstrap confirmation does not prove current liveness;
- timeout, output limit, and failed termination can leave outcome unknown;
- a spawn intent without ownership handshake becomes operator-required;
- late progress, cancellation before canonical Run identity, and short-lived
  in-memory progress must not define the new contract;
- delivery accepted, mailbox committed, runtime accepted, response pending, and
  acceptance unknown are distinct facts;
- best-effort deletion, attachment cleanup, fixed message caps, and hard-coded
  retention are negative fixtures, not target behavior.

## Safe to defer

- external vendor connectors and public plugin SPI;
- full RAG, vector storage, generalized memory, and Context branch graphs;
- Temporal deployment, multi-region orchestration, and service mesh;
- exact legal retention durations and production RPO/RTO numbers;
- specific IdP, KMS, object store, policy engine, and container or VM sandbox;
- rolling multi-region migration and automatic rollback across irreversible
  storage migrations.
- live capability ownership migration, historical owner-affinity indexes,
  admission route tokens, and a central command directory until a bounded
  context is actually extracted between independently deployed owners.

## Recommended specification order

1. Run/Work/Team aggregate and transition matrix.
2. AR capability contract and conformance bundle.
3. Side-effect, cancellation, unknown-outcome, and cleanup state machines.
4. Public Operation/error catalog, cancellation, and reconciliation contracts.
5. Tenant, ActorContext, SecretRef, trust, and data-classification contracts.
6. Data lifecycle, deletion/restore epochs, horizon graph, and disk-pressure
   contract.
7. Release compatibility manifest and first executable cross-boundary fixtures.

This report is evidence only. Accepted ADRs, owning dossiers, schemas, and open
decisions remain normative.
