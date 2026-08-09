---
id: decisions.index
type: index
status: active
owner: architecture
summary: Stable index and lifecycle rules for Architecture Decision Records.
---

# Architecture Decision Records

ADRs record significant architecture choices and their consequences.

## Landmark decisions by concern

This map is a short reading aid, not another complete catalog. Use
`pnpm docs:query -- --owner|--status|--related <value>` for metadata-backed
discovery. The lifecycle lists below remain the complete status ledger.

| Concern | Current decisions | Current architecture |
|---|---|---|
| System shape and long-term evolution | `ADR-0001`, `ADR-0042`, `ADR-0051`, `ADR-0054`, `ADR-0062`, `ADR-0065`, `ADR-0076` | [Overview](../architecture/overview.md), [context map](../architecture/context-map.md), [architecture model](../architecture/architecture-model.md) |
| Feature and dependency boundaries | `ADR-0012`, `ADR-0038`, `ADR-0040`, `ADR-0075` | [Feature standard](../architecture/feature-module-standard.md), [dependency rules](../architecture/dependency-rules.md) |
| Runtime ownership and AR integration | `ADR-0003`, `ADR-0028`, `ADR-0069`, `ADR-0079`, `ADR-0080` | [Runtime boundary](../architecture/runtime-boundary.md) |
| Eventing, delivery, and replay | `ADR-0004`, `ADR-0010`, `ADR-0019`, `ADR-0035` | [Eventing and reliability](../architecture/eventing-and-reliability.md) |
| Persistence, migrations, and exact values | `ADR-0011`, `ADR-0025`, `ADR-0046`, `ADR-0050`, `ADR-0052`, `ADR-0078` | [Persistence boundary](../architecture/persistence-boundary.md), [testing](../architecture/testing-strategy.md) |
| Public contracts and SDK | `ADR-0016`, `ADR-0019`, `ADR-0036`, `ADR-0037`, `ADR-0058`, `ADR-0067`, `ADR-0071`, `ADR-0077` | [SDK and transports](../architecture/sdk-and-transports.md), [public contracts](../architecture/public-control-contracts.md) |
| Local and hosted composition | `ADR-0030`, `ADR-0058`, `ADR-0060`, `ADR-0064` | [Local Host lifecycle](../architecture/local-host-lifecycle.md), [composition](../architecture/composition-and-dependency-injection.md) |
| Workflow and migration | `ADR-0027`, `ADR-0029`, `ADR-0063`, `ADR-0065` | [Extension points](../architecture/extension-points.md), [migration boundary](../architecture/migration-boundary.md) |
| Repository publication and enforcement | `ADR-0031`, `ADR-0032`, `ADR-0039`, `ADR-0053`, `ADR-0056`, `ADR-0059`, `ADR-0070`, `ADR-0081` | [Repository tooling](../architecture/repository-tooling.md), [documentation standard](../standards/documentation.md), [testing](../architecture/testing-strategy.md) |
| Domain capability boundaries | `ADR-0044`, `ADR-0045`, `ADR-0046`, `ADR-0068`, `ADR-0072`, `ADR-0073`, `ADR-0074`, `ADR-0080` | [Context map](../architecture/context-map.md), [context dossiers](../domain/contexts/README.md) |
| Security boundaries and data handling | `ADR-0021`, `ADR-0028`, `ADR-0055` | [Security architecture](../architecture/security-architecture.md), [runtime boundary](../architecture/runtime-boundary.md) |
| Reliability objectives | `ADR-0057` | [Reliability objectives](../architecture/reliability-objectives.md), [testing](../architecture/testing-strategy.md) |

## Proposed decisions

- [ADR-0082: Break-glass reduces Orchestrator authority](0082-break-glass-reduces-orchestrator-authority.md)

## Accepted decisions

- [ADR-0001: Headless event-driven modular monolith](0001-headless-event-driven-modular-monolith.md)
- [ADR-0003: Runtime lifecycle belongs to ar](0003-ar-owns-runtime-lifecycle.md)
- [ADR-0004: Broker-neutral core with NATS JetStream adapter](0004-broker-neutral-events-with-jetstream.md)
- [ADR-0005: Public contracts are outside application and domain](0005-public-contracts-outside-application.md)
- [ADR-0009: Commands and events have distinct contracts](0009-commands-and-events-are-distinct.md)
- [ADR-0010: Broker-neutral partition ordering](0010-broker-neutral-partition-ordering.md)
- [ADR-0011: Context-isolated SQLite and PostgreSQL topology](0011-context-isolated-sqlite-and-postgres-topology.md)
- [ADR-0012: Feature-owned inbound and outbound adapters](0012-feature-owned-inbound-and-outbound-adapters.md)
- [ADR-0015: Handwritten capability SDK over internal transports](0015-handwritten-capability-sdk-over-internal-transports.md)
- [ADR-0016: Protobuf, Buf, and Connect control API](0016-protobuf-buf-connect-control-api.md)
- [ADR-0017: Cross-language Protobuf contract profile](0017-cross-language-protobuf-profile.md)
- [ADR-0019: Resumable feed contracts](0019-resumable-feed-contracts.md)
- [ADR-0020: Typed updates and ETags](0020-typed-updates-and-etags.md)
- [ADR-0021: Immutable SDK scope and credentials](0021-immutable-sdk-scope-and-credentials.md)
- [ADR-0023: Pagination contracts from v1](0023-pagination-contracts-from-v1.md)
- [ADR-0024: SDK package roles and names](0024-sdk-package-roles-and-names.md)
- [ADR-0025: Context-scoped Unit of Work and local command lanes](0025-context-scoped-unit-of-work-and-local-command-lanes.md)
- [ADR-0027: Temporal as Run Orchestration adapter](0027-temporal-as-run-orchestration-adapter.md)
- [ADR-0028: Runtime Published Language and internal fence](0028-runtime-published-language-and-internal-fence.md)
- [ADR-0029: Compatibility facade and strangler migration](0029-compatibility-facade-and-strangler-migration.md)
- [ADR-0030: Shared core with local and server compositions](0030-shared-core-with-local-and-server-compositions.md)
- [ADR-0031: Native TypeScript 7 primary toolchain](0031-native-typescript-7-primary-toolchain.md)
- [ADR-0032: Staged architecture conformance tooling](0032-staged-architecture-conformance-tooling.md)
- [ADR-0034: Explicit product-owner approval for accepted ADRs](0034-explicit-product-owner-approval.md)
- [ADR-0035: Managed local NATS JetStream](0035-managed-local-nats-jetstream.md)
- [ADR-0036: TypeScript SDK publication format](0036-typescript-sdk-publication-format.md)
- [ADR-0037: Single initial contract version](0037-single-initial-contract-version.md)
- [ADR-0038: Machine-enforced package catalog](0038-machine-enforced-package-catalog.md)
- [ADR-0039: Staged Nx foundation](0039-staged-nx-foundation.md)
- [ADR-0040: Context-private Awilix containers](0040-context-private-awilix-containers.md)
- [ADR-0041: Deterministic repository guardrails](0041-deterministic-repository-guardrails.md)
- [ADR-0042: Evidence-driven bounded-context topology](0042-evidence-driven-bounded-context-topology.md)
- [ADR-0043: Long-horizon evolutionary architecture](0043-long-horizon-evolutionary-architecture.md)
- [ADR-0044: Tenant-scoped Agent Organization](0044-tenant-scoped-agent-organization.md)
- [ADR-0045: Three usage bounded contexts](0045-three-usage-bounded-contexts.md)
- [ADR-0046: Exact usage and money values](0046-exact-usage-and-money-values.md)
- [ADR-0047: Resumable context migration plans](0047-resumable-context-migration-plans.md)
- [ADR-0048: Single persistence authority and logical transfer](0048-single-persistence-authority-and-logical-transfer.md)
- [ADR-0049: Exact persistence and instant profile](0049-exact-persistence-and-instant-profile.md)
- [ADR-0050: Capability-owned hosted concurrency](0050-capability-owned-hosted-concurrency.md)
- [ADR-0051: Full DDD operating model](0051-full-ddd-operating-model.md)
- [ADR-0052: Adapter-local Drizzle and bounded dialect duplication](0052-adapter-local-drizzle-and-bounded-dialect-duplication.md)
- [ADR-0053: Repository-local documentation workflow](0053-repository-local-documentation-workflow.md)
- [ADR-0054: LikeC4 strategic relationship model](0054-likec4-strategic-relationship-model.md)
- [ADR-0055: Security boundaries and data classification](0055-security-boundaries-and-data-classification.md)
- [ADR-0056: Oxlint-first quality gates](0056-oxlint-first-quality-gates.md)
- [ADR-0057: Measurement-first reliability objectives](0057-measurement-first-reliability-objectives.md)
- [ADR-0058: Centrifugo default replaceable client realtime edge](0058-centrifugo-default-replaceable-client-realtime-edge.md)
- [ADR-0059: Versioned engineering foundation](0059-versioned-engineering-foundation.md)
- [ADR-0060: Single Local Supervisor lifecycle owner](0060-single-local-supervisor-lifecycle-owner.md)
- [ADR-0062: Workspace materialization and runtime isolation](0062-workspace-materialization-and-runtime-isolation.md)
- [ADR-0063: Typed Run resilience policy snapshot](0063-typed-run-resilience-policy-snapshot.md)
- [ADR-0064: Explicit attached and durable Run lifetime](0064-explicit-attached-and-durable-run-lifetime.md)
- [ADR-0065: Immutable Run plan and Work placement](0065-immutable-run-plan-and-work-placement.md)
- [ADR-0066: First authoritative Work terminal commit wins](0066-first-authoritative-work-terminal-commit-wins.md)
- [ADR-0067: Separate Run creation from readiness observation](0067-separate-run-creation-from-readiness-observation.md)
- [ADR-0068: Separate Human Notification and Agent Attention contexts](0068-separate-human-notification-and-agent-attention-contexts.md)
- [ADR-0069: Opaque runtime execution identity](0069-opaque-runtime-execution-identity.md)
- [ADR-0070: Public canonical repositories](0070-public-canonical-repositories.md)
- [ADR-0071: Separate request ID and routed Operation identity](0071-separate-request-id-and-routed-operation-identity.md)
- [ADR-0072: Atomic Work completion evaluation](0072-atomic-work-completion-evaluation.md)
- [ADR-0073: Separate Agent Context bounded context](0073-separate-agent-context-bounded-context.md)
- [ADR-0074: Defer external connector platform](0074-defer-external-connector-platform.md)
- [ADR-0075: Default-deny source dependency policy](0075-default-deny-source-dependency-policy.md)
- [ADR-0076: Team activation owned by Run Orchestration](0076-team-activation-owned-by-run-orchestration.md)
- [ADR-0077: Business-specific cancellation](0077-business-specific-cancellation.md)
- [ADR-0078: Federated Consistency Evidence Gate](0078-federated-consistency-evidence-gate.md)
- [ADR-0079: Runtime authority, binding, cutoff, and disposition](0079-runtime-authority-binding-cutoff-and-disposition.md)
- [ADR-0080: Orchestration Scope Project authority and disposition](0080-orchestration-scope-project-authority-and-disposition.md)
- [ADR-0081: Foundation-owned package scaffolding protocol](0081-foundation-owned-package-scaffolding-protocol.md)

## Superseded decisions

- [ADR-0002: Bounded-context packages with feature-owned slices](0002-bounded-context-packages-and-feature-slices.md)
- [ADR-0006: Ordering is declared per contract](0006-contract-specific-event-ordering.md)
- [ADR-0007: Focused contexts and domain-capability slices](0007-focused-contexts-and-domain-capability-slices.md)
- [ADR-0008: Consumer-owned runtime ports and stateless ACL](0008-consumer-owned-runtime-ports.md)
- [ADR-0013: Runtime Published Language and permission boundary](0013-runtime-published-language-and-permission-boundary.md)
- [ADR-0014: Feature-owned migrations with context-level assembly](0014-feature-owned-migrations-with-context-assembly.md)
- [ADR-0018: Durable command operations](0018-durable-command-operations.md)
- [ADR-0022: Host-owned sidecar supervision](0022-host-owned-sidecar-supervision.md)
- [ADR-0026: Opaque runtime execution observations](0026-opaque-runtime-execution-observations.md)
- [ADR-0033: Shared local supervisor and versioned host](0033-shared-local-supervisor-and-versioned-host.md)
- [ADR-0061: Command-family-scoped durable operations](0061-command-family-scoped-durable-operations.md)

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

Keep the lifecycle section synchronized with frontmatter. A proposed decision goes
under `Proposed decisions`; after approval it moves to `Accepted decisions`.
Superseded history remains in `Superseded decisions`. CI verifies this placement.

Use a permanent sequential ID and filename:

```text
0005-short-decision-title.md
```
