---
id: decisions.index
type: index
status: active
owner: architecture
summary: Stable index and lifecycle rules for Architecture Decision Records.
---

# Architecture Decision Records

ADRs record significant architecture choices and their consequences.

## Accepted decisions

- [ADR-0001: Headless event-driven modular monolith](0001-headless-event-driven-modular-monolith.md)
- [ADR-0003: Runtime lifecycle belongs to ar](0003-ar-owns-runtime-lifecycle.md)
- [ADR-0004: Broker-neutral core with NATS JetStream adapter](0004-broker-neutral-events-with-jetstream.md)
- [ADR-0005: Public contracts are outside application and domain](0005-public-contracts-outside-application.md)
- [ADR-0007: Focused contexts and domain-capability slices](0007-focused-contexts-and-domain-capability-slices.md)
- [ADR-0008: Consumer-owned runtime ports and stateless ACL](0008-consumer-owned-runtime-ports.md)
- [ADR-0009: Commands and events have distinct contracts](0009-commands-and-events-are-distinct.md)
- [ADR-0010: Broker-neutral partition ordering](0010-broker-neutral-partition-ordering.md)
- [ADR-0011: Context-isolated SQLite and PostgreSQL topology](0011-context-isolated-sqlite-and-postgres-topology.md)
- [ADR-0012: Feature-owned inbound and outbound adapters](0012-feature-owned-inbound-and-outbound-adapters.md)
- [ADR-0014: Feature-owned migrations with context-level assembly](0014-feature-owned-migrations-with-context-assembly.md)
- [ADR-0015: Handwritten capability SDK over internal transports](0015-handwritten-capability-sdk-over-internal-transports.md)
- [ADR-0016: Protobuf, Buf, and Connect control API](0016-protobuf-buf-connect-control-api.md)
- [ADR-0017: Cross-language Protobuf contract profile](0017-cross-language-protobuf-profile.md)
- [ADR-0018: Durable command operations](0018-durable-command-operations.md)
- [ADR-0019: Resumable feed contracts](0019-resumable-feed-contracts.md)
- [ADR-0020: Typed updates and ETags](0020-typed-updates-and-etags.md)
- [ADR-0021: Immutable SDK scope and credentials](0021-immutable-sdk-scope-and-credentials.md)
- [ADR-0023: Pagination contracts from v1](0023-pagination-contracts-from-v1.md)
- [ADR-0024: SDK package roles and names](0024-sdk-package-roles-and-names.md)
- [ADR-0025: Context-scoped Unit of Work and local command lanes](0025-context-scoped-unit-of-work-and-local-command-lanes.md)
- [ADR-0026: Opaque runtime execution observations](0026-opaque-runtime-execution-observations.md)
- [ADR-0027: Temporal as Run Orchestration adapter](0027-temporal-as-run-orchestration-adapter.md)
- [ADR-0028: Runtime Published Language and internal fence](0028-runtime-published-language-and-internal-fence.md)
- [ADR-0029: Compatibility facade and strangler migration](0029-compatibility-facade-and-strangler-migration.md)
- [ADR-0030: Shared core with local and server compositions](0030-shared-core-with-local-and-server-compositions.md)
- [ADR-0031: Native TypeScript 7 primary toolchain](0031-native-typescript-7-primary-toolchain.md)
- [ADR-0032: Staged architecture conformance tooling](0032-staged-architecture-conformance-tooling.md)
- [ADR-0033: Shared local supervisor and versioned host](0033-shared-local-supervisor-and-versioned-host.md)
- [ADR-0034: Explicit product-owner approval for accepted ADRs](0034-explicit-product-owner-approval.md)
- [ADR-0035: Managed local NATS JetStream](0035-managed-local-nats-jetstream.md)
- [ADR-0036: TypeScript SDK publication format](0036-typescript-sdk-publication-format.md)

## Superseded decisions

- [ADR-0002: Bounded-context packages with feature-owned slices](0002-bounded-context-packages-and-feature-slices.md), superseded by ADR-0007
- [ADR-0006: Ordering is declared per contract](0006-contract-specific-event-ordering.md), superseded by ADR-0010
- [ADR-0013: Runtime Published Language and permission boundary](0013-runtime-published-language-and-permission-boundary.md), superseded by ADR-0028
- [ADR-0022: Host-owned sidecar supervision](0022-host-owned-sidecar-supervision.md), superseded by ADR-0033

## ADR process

An ADR uses [the ADR template](../templates/adr.md) and contains:

- machine-validated frontmatter;
- context;
- decision;
- consequences;
- rejected or deferred alternatives.

New ADRs start as `proposed`. ADR-0034 and later cannot become `accepted` or
`superseded` without `approved_by` and `accepted_at` metadata recorded after
explicit product-owner confirmation. Earlier ADRs are grandfathered rather than
assigned invented approval history.

Accepted ADRs are immutable except for typo or link fixes. A changed decision gets
a new ADR that supersedes the old one.

Use a permanent sequential ID and filename:

```text
0005-short-decision-title.md
```
