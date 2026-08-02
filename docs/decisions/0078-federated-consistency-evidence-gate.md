---
id: ADR-0078
type: adr
status: accepted
owner: engineering/tooling
summary: Enforce capability-owned concurrency through a federated build-time evidence gate without creating a custom runtime or global registry.
approved_by: product-owner
accepted_at: 2026-08-01
related:
  - ADR-0025
  - ADR-0041
  - ADR-0050
  - ADR-0059
  - architecture.persistence
  - architecture.repository-tooling
  - architecture.testing
---

# ADR-0078: Federated Consistency Evidence Gate

## Context

ADR-0050 requires every mutating capability to own and prove its concurrency
strategy. Documentation alone cannot detect a mutation that an implementer forgot
to document, and local SQLite serialization cannot prove hosted PostgreSQL or
multi-instance correctness. Agents need deterministic discovery, remediation,
and evidence rather than IDE-specific assistance or a large manual manifest.

Existing infrastructure already provides the runtime mechanisms: SQLite and
PostgreSQL transactions, constraints and conditional updates, Temporal workflow
execution, NATS delivery, and external coordination adapters where justified. A
custom lock manager, transaction engine, consensus protocol, or universal runtime
DSL would duplicate mature infrastructure and create a new correctness risk.

## Decision

Adopt the generic Federated Consistency Evidence Gate defined by the public
[engineering foundation](https://github.com/agent-teams-ai/engineering-foundation/blob/main/docs/architecture/consistency-evidence-gate.md).
The gate is a development-only, build-time capability. It operationalizes
ADR-0050 but does not replace the owning aggregate, capability, Unit of Work,
adapter, or semantic tests.

The gate is federated:

```text
Closed World inside one bounded context or service
Published Language between bounded contexts or services
```

Every bounded context owns its capability identities, contracts, bindings,
evidence, migrations, inbox, outbox, and generated indexes. There is no global
runtime handler registry, global mutex, cross-context transaction, or shared
inbox/outbox table. A repository or organization catalog may index bundles for
discovery but never becomes a runtime authority.

### Coverage obligations

The gate enforces these relationships:

1. every discovered durable write entry point belongs to exactly one mutation;
2. every mutation has exactly one consistency contract;
3. every enabled deployment profile resolves a compatible binding;
4. every selected strategy defines required evidence scenarios;
5. every required scenario has independent executable evidence at the required
   level.

Write-path discovery includes command handlers, process-manager transitions,
timers, schedules, Temporal signals and updates, repair or administrative
commands, inbox consumers, and post-commit effect dispatchers. Migrations remain
separate governed operations and declare affected capabilities.

Only mutation composition may provide a write-capable Unit of Work. Queries use
a physically read-only context. Raw database clients remain inside persistence
adapters, inbound adapters cannot import mutation handlers directly, dynamic
write registration is prohibited, and an unknown write path fails the complete
fast repository gate. Affected execution may optimize expensive conformance but
never replaces complete discovery.

### Capability identity and strategies

Each capability has a stable explicit identity independent from source path,
package location, deployment shape, or implementation language. Retired
identities are reserved and never reused. A contract references stable invariant
identities and does not copy invariant prose or domain implementation.

The initial strategy vocabulary is:

- `optimistic-revision`;
- `unique-admission`;
- `serialized-by-key`;
- `serializable-transaction`;
- `lease-with-fence`;
- `process-managed-reservation`;
- `custom`, only with an accepted ADR and independent conformance pack.

The strategy states required semantics rather than a storage vendor API. Each
bounded-context adapter or deployment profile maps a standard strategy once to
its default local and hosted mechanism. A capability-specific override is used
only when the default cannot prove its invariant. This avoids duplicating
SQLite/PostgreSQL details in every mutation contract.

Process-local mutexes do not satisfy hosted or multi-instance obligations. A
lease that protects a write or external effect requires a monotonic fence checked
by the resource owner. Cross-context invariants have one authoritative owner;
other contexts coordinate through commands, reservations, idempotent messages,
and process managers rather than a distributed mutex.

### Evidence is independent

A valid contract is not proof. Expected results generated from the same contract
are not independent evidence. The gate records declaration, coverage, semantic,
local-adapter, hosted-adapter, fault, and workflow-history evidence separately.
Semantic assertions remain feature-owned. Real infrastructure tests prove
serialization retries, deadlocks, fences, redelivery, lost acknowledgement,
unknown outcomes, and multi-instance behavior where fakes are insufficient.

### Agent-first workflow

JSON Schema remains an internal validation mechanism. The primary interface is a
non-interactive command surface that emits text, Markdown, or JSON:

```text
foundation context --changed
foundation create:mutation <context>/<feature>/<mutation>
foundation consistency:list
foundation consistency:check --changed --explain
foundation consistency:explain <capability-id>
```

The generated dossier names the owning context and feature, aggregate and
invariant identities, conflicting mutations, allowed write ports, resolved local
and hosted strategies, required evidence, exact files, missing obligations, and
a remediation command. Diagnostics report one root cause with a stable rule ID
instead of cascading generated-file errors.

### Bundles and service extraction

Internal evidence bundles contain invariants, conflict scopes, bindings, and
evidence status. Published Language bundles contain only public schemas,
fixtures, capabilities, and compatibility metadata. SQL, lock details, and
private fences never enter public bundles.

Compatibility tracks implementation build, storage schema, wire contract, and
workflow history independently. Rolling changes use additive evolution followed
by expand, migrate, contract sequencing. Compatibility covers message retention,
supported workflow history, supported clients, and rolling deployment duration.

The intermediate representation is language-neutral. TypeScript discovery is the
first adapter. A future Go or Rust service must provide its own discovery adapter
and prove equivalent closed-world coverage. Extracting a bounded context changes
composition, transport, and physical persistence, while stable capability
identities, domain/application behavior, and consistency contracts remain.

### Staged rollout

Phase 1 implements the minimal agent-first gate: one local contract, TypeScript
write-path discovery, standard strategies, profile default bindings, generators,
explain commands, deterministic diagnostics, and fail-closed coverage. Estimated
size is 4k-8k lines including fixtures and tests.

Phase 2 adds independent executable evidence for SQLite, PostgreSQL, retries,
idempotency, inbox/outbox, leases and fencing, unknown outcomes, and fault
injection. Estimated additional size is 5k-10k lines.

Phase 3 adds separate internal and public bundles, mixed-version compatibility,
and polyglot discovery contracts for independently deployed services. Estimated
additional size is 4k-8k lines.

The first phase does not generate a production handler registry. BC-local runtime
registry generation requires observed recurring registration drift and a new ADR
showing that generation reduces risk without introducing runtime coupling.

## Consequences

- A mutation cannot be released merely because its author remembered a mutex;
  the repository requires an owned strategy, resolved implementation, and
  independent evidence.
- Agents receive bounded, deterministic context and remediation without relying
  on an IDE or searching broad documentation.
- Runtime correctness remains with mature persistence, workflow, messaging, and
  coordination mechanisms behind replaceable adapters.
- Bounded contexts remain independently extractable and may become polyglot
  services without adopting a global registry or compiler runtime.
- The gate reduces forgotten obligations but does not claim mathematical proof of
  a correct invariant or adapter implementation.

## Rejected alternatives

- Build a custom lock manager, distributed mutex, transaction engine, consensus
  protocol, test runner, or universal runtime concurrency DSL.
- Treat manifests or tests generated from the same manifest as sufficient proof.
- Adopt Restate, Temporal, Dapr, Redis, etcd, or one database as mandatory core
  architecture instead of optional deployment bindings.
- Generate a global production handler registry in the first implementation.
- Rely on IDE autocomplete, review memory, local command-lane tests, or Nx
  affected selection as the only protection.
