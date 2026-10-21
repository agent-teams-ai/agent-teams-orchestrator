---
id: feature.execution-observation.sandbox-activity
type: feature
status: accepted
owner: execution-observation
summary: Admit bounded normalized sandbox Activity and expose authorized snapshot and feed reads.
related:
  - ADR-0103
  - domain.contexts.execution-observation
---

# Sandbox Activity

## Scope

[ADR-0103](../../../../../../docs/decisions/0103-first-sandbox-runtime-migration-slice-admission.md)
admits bounded Activity evidence for one sandbox Run/member. This owner projects
normalized evidence and authorized reads. Run owns execution authority, Work owns
Task lifecycle, and Runtime owns provider execution. Provider-native payloads and
product state do not become Activity authority.

## Public surface

`SandboxActivityApi` exposes `listActivity` and `readFeed`. The module entry point
exports `createSandboxActivityFeature`; its Host ingress exposes `bindRuntime` and
`append`. Application inputs and authenticated scope are copied before authorization
can suspend. Current authorization precedes every query, cursor replay and duplicate
receipt. The private Connect adapter maps the admitted
[Activity contract](contracts/control-api/agentteams/execution_observation/v1/activity.proto).

## Owned behavior and invariants

`execution-observation.runtime-binding-exact` binds one Run to the exact participant,
runtime session and optional Task. `execution-observation.source-receipt-unique`
protects source identity, monotonic source sequence and exactly one local sequence
per admitted event. Reusing an identity with different evidence conflicts. Late
source coordinates and completed-block reopening are rejected.

`execution-observation.block-projection-exact` preserves participant, block and
operation identity. A snapshot replaces cumulative text; a true delta appends and
projects as a snapshot; completion never appends cumulative text twice. Internal
visibility cannot change through provider output. ANSI and unsafe controls are
rejected. Per-block text and per-Run receipt/history growth are bounded explicitly.

## Application use cases and ports

The read API consumes only list/feed storage ports. Runtime admission consumes only
bind/append ports. `ActivityAuthorization` returns current epoch and internal
visibility. Pure domain admission controls binding, receipts and projection; the
PostgreSQL adapter supplies durable serialization and owner-clock metadata.

## Persistence and concurrency

This feature-owned consistency contract applies
[ADR-0050](../../../../../../docs/decisions/0050-capability-owned-hosted-concurrency.md)
and [ADR-0078](../../../../../../docs/decisions/0078-federated-consistency-evidence-gate.md).
It does not claim a global consistency gate or hosted adapter qualification.

| Capability | Protected invariant | Strategy and conflict scope | Durable write path |
|---|---|---|---|
| `execution-observation.bind-sandbox-runtime` | `execution-observation.runtime-binding-exact` | `unique-admission`, exact Run | Host `bindRuntime` -> admission -> `ActivityStore.bind` -> owner transaction |
| `execution-observation.append-sandbox-activity` | `execution-observation.source-receipt-unique`, `execution-observation.block-projection-exact` | `serialized-by-key`, exact Run | Host `append` -> admission -> `ActivityStore.append` -> owner transaction |

The feature borrows the Host pool and owns the `execution_observation` schema,
forced tenant RLS, READ COMMITTED mutations and row lock for each Run. Receipt,
projection, exact local sequence and `SandboxActivityRecorded` outbox intent commit
together. Migration affects both capabilities and remains separately governed.
The adapter uses the raw PostgreSQL contingency in
[ADR-0052](../../../../../../docs/decisions/0052-adapter-local-drizzle-and-bounded-dialect-duplication.md).

Queries run in REPEATABLE READ READ ONLY transactions. Bounded immutable evidence
history reconstructs each pinned snapshot. Private authenticated encrypted cursors
bind Run, principal, authorization epoch, visibility, watermark, offset and expiry;
they contain no Activity text and require a stable Host-provided key across restart.
Visibility filtering precedes pagination. Missing retained history, expired authority
or a newly observed source gap requires a fresh snapshot. Historical incompleteness
remains explicit; a fresh incomplete snapshot can resume without an infinite gap loop.

## Failure and recovery

Outbox failure rolls back every local state advance. Lost COMMIT acknowledgement
returns `UNAVAILABLE` without an automatic mutation replay; the same source identity
reconciles the outcome. Corrupt history binding or receipt coordinates fail closed.
Exhausted source budgets reject new evidence rather than silently dropping receipts.

The optional Task binding is immutable. Binding a Run before a Task exists does not
qualify later dynamic Task attribution; that requires an owner-approved per-operation
binding capability. Outbox publication, broad replay/retention, provider switching and
production deployment remain outside this slice.

## Verification

After building, run
`RUN_CONTEXT_OBSERVATION_PG=1 pnpm --filter @agent-teams/execution-observation test`.
The typed tests own an isolated PostgreSQL 14 cluster and actual restart. Without
that explicit flag the infrastructure suite is skipped.

| Evidence | Executable assertion |
|---|---|
| Admission | Concurrent duplicate receipt emits once; conflicting fingerprint, foreign runtime/Task and stale source reject |
| Projection | Snapshot/delta/completion, distinct equal-text blocks and completed-block fence |
| Reads | Pinned pagination, internal filtering, retained-feed gap, source gap, expiry/epoch invalidation and fresh snapshot resume |
| Authority | Current authorization, forced RLS and held authorization preserving original request/scope |
| Durability | Actual restart preserves projection and dedupe; corrupted foreign history and receipt coordinates reject |
| Faults | Applied COMMIT with lost acknowledgement reconciles once; outbox trigger failure leaves the head unchanged |

These tests establish this local adapter's scoped behavior. They do not qualify
hosted deployment, a multi-member Run or the broader deferred observation model.
