---
id: research.foundation-spike-evidence-2026-07-25
type: research
status: active
owner: architecture/reliability
summary: Consolidated reproducible evidence for pre-implementation orchestration, persistence, eventing, SDK, and workflow decisions.
related:
  - architecture.eventing
  - architecture.persistence
  - architecture.sdk-transports
  - architecture.extensions
  - architecture.testing
---

# Foundation Spike Evidence, 2026-07-25

## Scope

These pre-implementation spikes used isolated synthetic state on
`codex-workers-eu-01`. They did not launch agents, access real user projects, or
modify production application behavior.

The complete campaign recorded 28 evidence groups and 1125 passing checks out of
1127 executions. This number demonstrates repeated exercised behavior; it is not
a coverage percentage and does not mean 1125 unique product requirements.

The two failures are the same OpenTelemetry JavaScript metric-exemplar assertion
in two clean runs. The limitation remains explicit in OD-014.

All temporary remote and local harnesses were checksum-verified and deleted on
2026-07-26. The compact audit fingerprints are retained in the
[evidence manifest](foundation-spike-evidence-manifest-2026-07-26.md).

## Evidence matrix

The original 23 groups recorded 958/958 passing executions. The final wave added:

| Area | Result |
|---|---:|
| Mixed-version NATS and crash-safe topology migration | 32/32 |
| JSON integration-event schema evolution | 17/17 |
| OpenTelemetry durable causality | 70/72 |
| PostgreSQL failover, WAL, and PITR | 38/38 |
| Desktop compatibility facade and API inventory | 10/10 |

## High-impact findings

- Broker, database, workflow, and transport acknowledgements can all have
  ambiguous outcomes. Stable command or event identity plus durable receipts,
  outbox, inbox, and reconciliation remain mandatory.
- Process liveness, protocol readiness, and durable-store integrity are separate
  states.
- Work Coordination owns Task or Work lifecycle. Run Orchestration owns the
  feature-specific cross-context process policy.
- Application persistence owns business state. Temporal owns scheduling history.
- Browser chunk timing is not a feed contract; sequence, cursor, and
  deduplication are.
- Hosted tenant isolation combines explicit application predicates with forced
  PostgreSQL RLS. PgBouncer is an optional transaction-pooling profile.
- Exact producer schemas and major-compatible consumer reader schemas are
  different JSON Schema artifacts.
- Async PostgreSQL replication can lose acknowledged writes; the deployment
  profile must declare RPO and promotion authority.
- Raw PostgreSQL PITR does not fail closed for a target before the base backup;
  the recovery coordinator must reject it before startup.
- Telemetry context is optional metadata. Durable application identities own
  causality and recovery.

Current normative rules are in the related architecture documents and ADRs.

## Still unproven

- Windows Supervisor, Named Pipes, installer, signing, and service lifecycle;
- real power loss and platform-specific filesystem behavior;
- NATS version pairs beyond 2.14.2/2.14.3, multi-region operation, and prolonged
  soak;
- PostgreSQL multi-zone or managed failover, production-volume PITR, automated
  promotion, and PgBouncer HA;
- Temporal HA or Cloud authentication, mass outage reconciliation, and soak;
- proxy TLS, HTTP/2 downstream, CDN, and enterprise gateway chains;
- OpenTelemetry Collector HA, long-outage pressure, real Temporal interceptors,
  and JavaScript metric exemplars;
- Windows SDK package installation and registry provenance;
- unresolved product policy listed in the open decisions.

These are release, deployment, or product-semantics gates. They do not justify
moving infrastructure behavior into domain or application code.
