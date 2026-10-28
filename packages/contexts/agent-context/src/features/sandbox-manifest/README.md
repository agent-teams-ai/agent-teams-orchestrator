---
id: feature.agent-context.sandbox-manifest
type: feature
status: accepted
owner: agent-context
summary: Register and read immutable sandbox context source references with current scoped authority.
related:
  - ADR-0103
  - domain.contexts.agent-context
---

# Sandbox Manifest

## Scope

[ADR-0103](../../../../../../docs/decisions/0103-first-sandbox-runtime-migration-slice-admission.md)
admits immutable sandbox context manifests. The manifest records exact Workspace,
AgentProfileVersion and RunPolicySnapshot references with opaque instruction and
optional Work snapshot references. These facts do not grant filesystem or runtime
authority. General prompt compilation, memory and provider configuration are deferred.

## Public surface

The package exports `SandboxManifestApi.getManifest`. The module entry point
exposes `createSandboxManifestFeature`, which assembles that API and the Host-only
`seedManifest` bootstrap use case. No public mutation RPC is admitted. Inputs and
authenticated scope are copied before authorization can suspend; current authority
is checked before every read or seed, including repeated identities.

## Owned behavior and invariants

`agent-context.manifest-identity-immutable` protects one canonical manifest name
and its exact immutable facts. Foreign project references, raw paths, undeclared
payload fields and malformed exact times fail validation. Identical registration
reconciles without another outbox event; changed facts under the same name conflict.

## Application use cases and ports

`createManifestApi` depends only on authorized read access. The separate registration
use case owns validation and authorized seeding. `ManifestAuthorization` supplies
current scope authority; `ManifestStore` is feature-owned. Domain fingerprints
contain explicit immutable facts and no persistence or transport DTO.

## Adapters and composition

The Host lends a PostgreSQL pool and a separate migration pool. The feature owns
its schema, transactions, migration and forced tenant RLS. The adapter uses the
raw PostgreSQL contingency in
[ADR-0052](../../../../../../docs/decisions/0052-adapter-local-drizzle-and-bounded-dialect-duplication.md).
No provider SDK dependency enters this feature.

## Persistence and concurrency

The feature-owned consistency contract below applies
[ADR-0050](../../../../../../docs/decisions/0050-capability-owned-hosted-concurrency.md)
and [ADR-0078](../../../../../../docs/decisions/0078-federated-consistency-evidence-gate.md).
These stable identities do not claim installation of a global consistency gate.

| Capability                                | Invariant                                   | Strategy and conflict scope                    | Durable write path                                                               |
| ----------------------------------------- | ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `agent-context.register-sandbox-manifest` | `agent-context.manifest-identity-immutable` | `unique-admission`, exact scoped manifest name | Host `seedManifest` -> registration -> `ManifestStore.seed` -> owner transaction |

One READ COMMITTED transaction inserts the immutable row, verifies the authoritative
fingerprint after conflicting insertion, and records `SandboxManifestCreated`
outbox intent only for a new row. PostgreSQL uniqueness arbitrates concurrent
instances. Exact microsecond time survives SQL conversion, including before 1970.
Queries use REPEATABLE READ READ ONLY transactions. Migration affects this
capability's `agent_context` schema and remains a separately governed operation.

## Failure and recovery

Outbox failure rolls back the manifest. A lost COMMIT response returns safe
`UNAVAILABLE`, discards that connection, and requires reconciliation with the same
manifest identity and facts. The adapter does not replay an unkeyed mutation.
Invalid stored facts fail closed. Outbox publication and production deployment
qualification are outside this bounded implementation.

## Verification

Run `RUN_CONTEXT_OBSERVATION_PG=1 pnpm --filter @agent-teams/agent-context test`
after building the package. The typed tests own an isolated PostgreSQL 14 cluster,
restart it, and remove only their own state. Default tests skip the explicit
infrastructure suite when that environment flag is absent.

| Evidence         | Executable assertion                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Unique admission | Concurrent identical seeds produce one row and one outbox intent; changed facts conflict                                  |
| Authority        | Raw-path and undeclared payload rejection; current authorization and forced RLS; held authorization preserves entry scope |
| Durability       | Actual PostgreSQL restart retains exact facts and timestamp                                                               |
| Faults           | Outbox trigger failure rolls back; applied COMMIT with lost acknowledgement reconciles without another event              |

These assertions establish the local PostgreSQL adapter behavior. Hosted deployment,
public mutation Operations and broader context features remain unqualified.
