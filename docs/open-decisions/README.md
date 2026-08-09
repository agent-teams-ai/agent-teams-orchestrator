---
id: open-decisions.index
type: index
status: active
owner: architecture
summary: Index of unresolved architecture decisions that implementation may not choose implicitly.
---

# Open Architecture Decisions

Each unresolved question has one stable ID and file. Implementation must not
silently choose an option. Resolution changes the document status to `resolved`
and links the deciding ADR; the historical record is retained.

Use the owner column to find the decision that gates a change. `Open` blocks an
implicit implementation choice. `Deferred` records a consciously postponed
question. `Resolved` is historical and must relate to at least one deciding ADR.

| ID | Decision | Owner | Status |
|---|---|---|---|
| OD-001 | [Local control transport](OD-001-local-control-transport.md) | platform/control-api | Open |
| OD-002 | [Local NATS lifecycle](OD-002-local-nats-lifecycle.md) | platform/eventing | Resolved by ADR-0035 |
| OD-003 | [Persistence composition](OD-003-persistence-composition.md) | platform/persistence | Open |
| OD-004 | [Exact runtime capability ports](OD-004-runtime-capability-ports.md) | integration/runtime | Open |
| OD-005 | [Temporal workflow boundary](OD-005-temporal-workflow-boundary.md) | run-orchestration | Open |
| OD-006 | [Initial aggregate boundaries](OD-006-initial-aggregate-boundaries.md) | architecture/domain | Open |
| OD-007 | [Public control protocol](OD-007-public-control-protocol.md) | platform/control-api | Resolved by ADR-0016 |
| OD-008 | [SDK publication](OD-008-sdk-publication.md) | clients/sdk | Open |
| OD-009 | [Event-journal retention and replay](OD-009-event-journal-retention-and-replay.md) | platform/eventing | Open |
| OD-010 | [Legacy desktop migration boundary](OD-010-legacy-desktop-migration-boundary.md) | migration/desktop | Open |
| OD-011 | [Context-map validation](OD-011-context-map-validation.md) | architecture/domain | Open |
| OD-012 | [Identity, authorization, and tenant isolation](OD-012-identity-authorization-tenant-isolation.md) | architecture/security | Open |
| OD-013 | [Partial failure and compensation](OD-013-partial-failure-and-compensation.md) | run-orchestration | Open |
| OD-014 | [Observability and OpenTelemetry](OD-014-observability-and-opentelemetry.md) | platform/observability | Open |
| OD-015 | [External task-board migration](OD-015-external-task-board-migration.md) | work-coordination | Open |
| OD-016 | [Public error model](OD-016-public-error-model.md) | platform/control-api | Open |
| OD-017 | [Long-running command lifecycle](OD-017-long-running-command-lifecycle.md) | clients/sdk | Resolved by ADR-0071 |
| OD-018 | [SDK subscriptions and recovery](OD-018-sdk-subscriptions-and-recovery.md) | clients/sdk | Resolved by ADR-0019 |
| OD-019 | [Public resource identity and scope](OD-019-public-resource-identity-and-scope.md) | platform/control-api | Open |
| OD-020 | [Architecture conformance tooling](OD-020-architecture-conformance-tooling.md) | engineering/tooling | Resolved by ADR-0032 |
| OD-021 | [Local Supervisor lifecycle and distribution](OD-021-local-supervisor-lifecycle-and-distribution.md) | platform/local-host | Open |
| OD-022 | [JetStream topology migration](OD-022-jetstream-topology-migration.md) | platform/eventing | Open |
| OD-023 | [Agent Organization detailed model](OD-023-agent-organization-model.md) | agent-organization | Open |
| OD-024 | [Usage and consumption detailed semantics](OD-024-usage-accounting-boundaries-and-exact-quantities.md) | usage-capability | Open |
| OD-025 | [ECMAScript Temporal calendar engine](OD-025-ecmascript-temporal-calendar-engine.md) | architecture/domain | Open |
| OD-026 | [Communication, notification, and attention](OD-026-communication-notification-and-attention.md) | architecture/domain | Open |
| OD-027 | [Configurable Work lifecycle](OD-027-configurable-work-lifecycle.md) | work-coordination | Open |
| OD-028 | [Agent Context lifecycle](OD-028-agent-context-lifecycle.md) | architecture/domain | Resolved by ADR-0073 |
| OD-029 | [Data retention and erasure policy](OD-029-data-retention-and-erasure-policy.md) | architecture/security | Open |
| OD-030 | [SLO targets and error-budget policy](OD-030-slo-targets-and-error-budget-policy.md) | architecture/reliability | Open |
| OD-031 | [Semantic authority and claim admission](OD-031-semantic-authority-and-claim-admission.md) | architecture/domain | Open |
| OD-032 | [Last-mile side-effect safety](OD-032-last-mile-side-effect-safety.md) | architecture/security | Open |
| OD-033 | [OODA convergence and context activation](OD-033-ooda-convergence-and-context-activation.md) | architecture/domain | Open |
| OD-034 | [External Integration Management](OD-034-external-integration-management.md) | architecture/domain | Deferred |
| OD-035 | [Local durable workflow engine](OD-035-local-durable-workflow-engine.md) | run-orchestration | Open |
| OD-036 | [First usable deployment profile](OD-036-first-usable-deployment-profile.md) | architecture/composition | Resolved by ADR-0086 |
| OD-037 | [Commercial capability entitlements](OD-037-commercial-capability-entitlements.md) | architecture/contracts | Open |

Use the [open-decision template](../templates/open-decision.md) for new entries.
CI verifies that every record is listed and that table owner and status match its
frontmatter.
