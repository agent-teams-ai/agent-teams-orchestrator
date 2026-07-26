# Agent Navigation and Guardrails

This file is the entry point for coding agents. It is intentionally short and
points to canonical documents instead of duplicating them.

## Start here

Read these documents before proposing or changing architecture:

1. [Technical documentation index](docs/README.md)
2. [Documentation standard](docs/standards/documentation.md)
3. [Architecture index](docs/architecture/README.md)
4. [Architecture overview](docs/architecture/overview.md)
5. [Full DDD modeling standard](docs/domain/modeling-standard.md)
6. [Bounded-context dossiers](docs/domain/contexts/README.md)
7. [Context map](docs/architecture/context-map.md)
8. [Feature module standard](docs/architecture/feature-module-standard.md)
9. [Dependency rules](docs/architecture/dependency-rules.md)
10. [Persistence boundary](docs/architecture/persistence-boundary.md)
11. [Runtime boundary](docs/architecture/runtime-boundary.md)
12. [Eventing and reliability](docs/architecture/eventing-and-reliability.md)
13. [Local Host lifecycle](docs/architecture/local-host-lifecycle.md)
14. [SDK and transports](docs/architecture/sdk-and-transports.md)
15. [Public control contracts](docs/architecture/public-control-contracts.md)
16. [Extension points](docs/architecture/extension-points.md)
17. [Open decisions](docs/open-decisions/README.md)
18. [Accepted ADRs](docs/decisions/README.md)

Terminology is defined in [the glossary](docs/glossary.md).

## Current state

The repository is in the architecture-definition phase. Do not introduce
production behavior, dependencies, transports, databases, or framework
scaffolding until the corresponding decision is accepted.

When a requested change depends on an unresolved decision:

1. identify the decision explicitly;
2. present concrete alternatives and tradeoffs;
3. record the accepted outcome as an ADR;
4. only then implement it.

## Product boundary

This repository owns multi-agent coordination:

- teams, members, and roles;
- project and workspace scope;
- tasks, assignments, and dependencies;
- orchestration runs and completion policy;
- messages, inboxes, and handoffs;
- product approval policy, eligible approvers, decision routing, and audit;
- provider-neutral runtime commands and projections.

This repository does not own provider execution. The `ar` runtime owns agent
processes, sessions, resume, cancellation, recovery, leases, fencing, sandboxing,
technical runtime permission state and enforcement, and provider-specific drivers.

## Non-negotiable architecture rules

1. Use domain-capability feature slices inside accepted bounded-context packages.
2. Domain code is pure and depends on no framework, transport, database, runtime,
   filesystem, clock implementation, or process API.
3. Application code depends on domain code and declared ports only.
4. Adapters implement ports; ports never import adapters.
5. Inbound and outbound directions are always relative to the application core,
   never to network traffic or payload flow. Inbound adapters invoke application
   use cases; outbound adapters implement capabilities required by application
   code.
6. Bounded contexts do not deep-import each other's internals.
7. A context consumes another context through a consumer-owned port, an ACL or
   context bridge,
   and the provider's published contract, or through versioned integration events.
8. Every aggregate implementation has exactly one owning feature. Features inside
   the same bounded context may use explicit context-internal APIs; they are not
   mini bounded contexts.
9. Provider-specific behavior does not enter orchestration domain code.
10. NATS, Temporal, `ar`, SQLite, PostgreSQL, Electron, and HTTP are adapters.
11. External commands, events, and snapshots use strict versioned schemas.
12. At-least-once delivery is assumed. Consumers must be idempotent.
13. There is no global event ordering guarantee. Each event contract declares
    its ordering scope; consumers must tolerate every ordering not declared.
14. Business state plus required event-outbox and durable command-dispatch records
    share one context-local database transaction. Broker delivery happens later and
    is never part of that transaction.
15. Event sourcing is not the default persistence model.
16. There must be exactly one owner of each process and runtime mutation.
17. SDKs contain transport and contract logic, never orchestration business logic.
18. Every team, task, run, message, and runtime binding is scoped to a project.
19. Public transport/SDK contracts never become application or domain models.
20. Process-wide resources are created only by the application composition root.
21. The `ar` Published Language is the canonical runtime wire contract. Consumer
    ports belong to orchestrator application features and are not copied into or
    exported by the Runtime ACL.
22. Public control Protobuf and integration-event JSON Schema are separate
    canonical surfaces. Neither is generated from the other.
23. The ordinary SDK never owns process installation, supervision, update, or
    termination. The Local Supervisor owns local component availability and does
    not proxy normal SDK traffic.
24. Runtime session, attempt, epoch, allocation, account, custody, and fence
    concepts remain AR-owned. The orchestrator stores only product-owned bindings,
    normalized observations, and opaque published references.
    `ExecutionFence` never crosses the Runtime Published Language or Runtime ACL.
25. Mutating local use cases enter a per-bounded-context command lane and a
    capability-scoped Unit of Work. External effects occur only after commit.
26. A durable process manager belongs to its business feature or bounded context;
    do not build a generic workflow engine in platform code.
27. Product message inboxes and technical event-consumer inboxes never share a
    type, port, table, retention policy, or acknowledgement state.
28. All production behavior under `packages/**` belongs to
    `src/features/<feature>/`. Package roots contain only curated exports,
    composition, feature-owned artifact assembly, generated output, and
    explicitly accepted narrow primitives.
29. Package role determines feature layers. Full tactical DDD is required for
    genuine domain complexity and must not be imitated with empty aggregates,
    repositories, ports, or services in integrations, platform code, SDKs, or
    tooling.
30. The Local Supervisor contains no bounded-context domain or application code.
    Orchestrator Host owns coordination, AR owns provider execution, and the
    JetStream adapter owns broker interaction.
31. Target, Client Profile, and Workspace are different concepts. Project or
    workspace configuration never selects an endpoint, credential, installation
    channel, or trust policy.
32. Client disconnect, cleanup, terminal closure, and `Ctrl+C` never cancel
    durable work. Cancellation is an explicit business command.
33. Every managed local JetStream store has one Supervisor-held OS-level
    lifetime lock. NATS process identity or PID files are not ownership proof.
34. JetStream delivery is at least once even after confirmed acknowledgement.
    Every consuming context uses its own durable inbox and idempotent handler.
35. JetStream is not authoritative aggregate history. Corruption, stream gaps,
    and physical `ENOSPC` enter typed degraded recovery and reconciliation.
36. The durable outbox, not a NATS client buffer, is the publication queue.
    Timed-out publish is an ambiguous outcome retried with the same `eventId`.
37. JetStream topology reconciliation classifies diffs before mutation.
    Destructive or immutable changes require the OD-022 migration path.
38. A local SQLite command lane has bounded admission and scheduling. It cannot
    drain an unbounded synchronous transaction burst in one event-loop turn.
39. Command fingerprints use a versioned canonical application representation,
    never database-returned JSON order, raw JSON, or raw Protobuf bytes.
40. The stable local locator never contains a Host bearer credential. Bootstrap
    election, Supervisor lifetime ownership, and store lifetime ownership are
    distinct locks.
41. Durable subscription replay always reads the owning feed log. Notifications
    only wake readers. Expired, tampered, or cross-feed cursors fail before any
    partial retained tail is exposed.
42. A context migration authority acquires its deployment lock before migration
    metadata bootstrap. SQL, immutable checksum history, and version watermark
    commit atomically; restore requires schema and capability validation beyond
    an engine integrity check.
43. A staged local Host candidate has no mutation authority before atomic
    generation selection and locator replacement. Keep the previous Host for a
    bounded rollback window; never adopt or unlink a responsive foreign endpoint.
44. Published Protobuf v1 fields and source names remain present and deprecated.
    New request variants require negotiated capability support; wire compatibility
    alone never authorizes new behavior.
45. Every journaled contract declares complete, snapshot-plus-tail, or
    non-rebuildable replay. Erasable payloads cannot claim complete historical
    replay; replay authorization and all-feed preflight happen before output.
46. Multi-context backup uses a technical coordinator over context-owned
    participant capabilities. Its manifest has per-context watermarks and
    explicitly provides neither a cross-context transaction nor a global
    watermark.
47. Credential refresh is single-flight per canonical security scope. One logical
    call gets at most one compare-and-refresh; resumable streams enforce minimum
    usable lifetime and bounded same-checkpoint auth churn.
48. Persistence retry classification includes adapter-owned commit phase. Failure
    after commit dispatch is an unknown outcome reconciled by the original
    command ID, never a blind retry or a new logical command.
49. The TypeScript SDK publishes explicit Node ESM and CommonJS outputs plus an
    isolated browser export. Packed-artifact tests must prove that generated
    contracts and Node-only local lifecycle code cannot enter the public browser
    graph.
50. Hosted tenant isolation uses explicit application and repository tenant
    predicates plus PostgreSQL RLS as defense in depth. Tenant identity is bound
    transaction-locally; runtime, migration, and elevated maintenance use
    separate pools and credentials.
51. Managed local JetStream process liveness, service readiness, and store
    integrity are separate states. Timeout or process death may be an ambiguous
    persisted publication outcome; retry uses the same stable event identity and
    durable inbox.
52. Work Coordination alone changes Task or Work lifecycle. Run Orchestration
    owns feature-specific Run-to-Work process policy; compensation is a durable
    idempotent command, never a distributed rollback or independently inferred
    policy in both contexts.
53. JetStream topology changes expand and coexist before retirement. Backfill
    preserves domain `eventId` but uses a route-scoped transport deduplication
    identity. Stream sequence is never cross-aggregate business ordering.
54. Browser stream chunk timing is not a public contract. Hosted proxy profiles
    pass static validation and a dynamic Connect-Web resume probe; application
    limits remain below proxy hard limits.
55. Temporal owns scheduling history, not business state. Mutating activities
    invoke idempotent application commands with stable IDs and expected revisions;
    external clients never depend directly on Temporal signals or queries.
56. PgBouncer is an optional transaction-pooling hosted profile. A Unit of Work
    keeps one checked-out client and transaction-local tenant binding; runtime
    session state is forbidden, and migrations or maintenance use separate direct
    endpoints.

## Planned repository shape

```text
apps/
  cli/
  local-supervisor/
  orchestrator-local/
  orchestrator-server/
packages/
  contexts/
    identity-registry/
    access-control/
    tenant-project-registry/
    workspace-registry/
    team-topology/
    work-coordination/
    run-orchestration/
    agent-communication/
    policy-risk/
    approval-management/
  integrations/
    runtime-acl/
    task-boards/
      jira/
  platform/
    local-host-control/
    eventing/
    persistence/
    observability/
    schema-registry/        # indexes feature-owned Protobuf and JSON schemas
  clients/
    sdk-typescript/
  testing/
docs/
  domain/
  architecture/
  decisions/
```

The focused eight-to-ten-context direction is accepted. Exact context packages
remain proposed until language, invariants, context relationships, and concurrency
are validated. Create packages and features only when the context and an initial
vertical slice are accepted.

`orchestrator-local` and `orchestrator-server` are thin composition roots over the
same application core and public control contracts. `local-supervisor` is a
separate technical composition root that manages local component availability,
discovery, and staged activation without importing business contexts. `cli` is an
SDK client and may compose a separate narrow local-host administration client.
Local/hosted composition branching is prohibited in domain and application code.

## Change workflow

For architecture or implementation work:

1. identify the owning bounded context and feature;
2. confirm its Ubiquitous Language, invariants, and aggregate boundary;
3. confirm dependency direction;
4. define application models, Published Language, and client contracts separately;
5. model invariants in the domain, not in transport handlers;
6. implement the application use case through narrow consumer-owned ports;
7. add adapters at the edge;
8. add domain, application, contract, and architecture tests proportional to risk;
9. update documentation and ADRs in the same change.

## Prohibited shortcuts

Do not:

- create a generic `shared` package for business logic;
- create a root shared kernel without a dedicated accepted ADR and exact allowlist;
- expose feature internals through broad barrel exports;
- import public SDK/transport schemas into application or domain code;
- import Electron, NATS, Temporal, `ar`, or provider SDKs into domain/application;
- put OpenCode, Claude, or Codex branches in orchestration domain services;
- spawn or kill agent processes from the orchestrator core;
- use frontend DTOs as domain entities;
- publish unversioned events;
- rely on exactly-once broker delivery;
- implement distributed transactions between bounded contexts;
- write another context's tables, projections, inbox, or outbox;
- instantiate process-wide runtime, broker, or database clients inside a feature;
- put orchestration behavior, JetStream semantics, or AR execution state in the
  Local Supervisor;
- make Desktop, CLI, or the ordinary SDK a second local process owner;
- proxy normal public control operations through the Local Supervisor;
- let project or workspace configuration override target trust or credentials;
- store authoritative runtime binding or observation state inside the Runtime ACL;
- mirror AR execution, capacity, account, or credential aggregates inside the
  orchestrator;
- expose a generic or cross-context Unit of Work;
- combine product messages with technical delivery-deduplication inbox records;
- let one event handler mutate more than one bounded context;
- add a second process owner during migration;
- copy legacy implementations into the new domain or application core;
- derive new aggregates or feature boundaries from legacy class structure instead
  of accepted language and invariants;
- test agent execution against real user projects.

## Runtime testing safety

Never test agent launch, provisioning, task assignment, terminal runtime, recovery,
or message delivery on real user projects. Use newly created sandbox projects or
explicitly test-only fixtures.

## Documentation ownership

- `docs/domain/` defines domain-discovery artifacts, Ubiquitous Language,
  invariants, and modeling standards.
- `docs/architecture/` defines current architecture rules.
- `docs/decisions/` records accepted decisions and their consequences.
- `docs/open-decisions/` contains one addressable document per unresolved design
  question.
- `docs/standards/documentation.md` defines metadata, authority, placement, and
  validation rules.
- Feature READMEs document local behavior without redefining global rules.

If documents conflict, use the authority-by-knowledge-type matrix in the
documentation standard. ADRs own rationale, architecture documents own current
cross-context rules, machine-readable schemas own exact wire shape,
bounded-context dossiers own domain language and invariants, and runbooks own
operations. Update stale artifacts rather than allowing two sources of truth.
