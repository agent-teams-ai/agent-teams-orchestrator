---
id: architecture.testing
type: architecture
status: accepted
owner: architecture/quality
summary: Required test layers, conformance suites, architecture checks, and quality gates.
related:
  - ADR-0028
  - ADR-0015
  - ADR-0016
  - ADR-0017
  - ADR-0019
  - ADR-0045
  - ADR-0046
  - ADR-0047
  - ADR-0048
  - ADR-0049
  - ADR-0050
  - ADR-0055
  - ADR-0057
  - ADR-0058
  - ADR-0060
  - ADR-0071
  - ADR-0078
  - ADR-0080
  - ADR-0089
  - ADR-0092
  - ADR-0094
  - ADR-0064
  - ADR-0065
  - architecture.local-host-lifecycle
  - architecture.security
code_anchors:
  - pattern: architecture/executable-specs/**
    enforcement: advisory
  - pattern: scripts/orchestration-specs/**
    enforcement: advisory
---

# Testing Strategy

## Test layers

### Domain tests

Fast, deterministic tests for:

- aggregate invariants;
- value-object validation;
- state transitions;
- domain events;
- policy edge cases.

Domain-heavy features also use property-based value-object tests, aggregate
command-trace tests, invalid-state construction tests, and explicit assertions
that domain events remain distinct from public integration-event fixtures.

They use no mocks for infrastructure because infrastructure is absent.

### Pre-production executable state specifications

Accepted Orchestrator-owned semantics may be captured before production package
admission as strict [canonical JSON specifications](../../architecture/executable-specs/orchestrator-state-machine.schema.json)
with deterministic traces and fault cases. The current specifications cover only
ADR-0079 `RunAuthorityState` plus `RunAuthorityGeneration`, and ADR-0080
`OrchestrationProject` identity lifecycle.

The JSON files are authoritative for this harness. Strict schema validation,
property tests, and a semantic mutation pack protect their invariants. XState and
its graph package derive pure test and Mermaid views without actors, services,
timers, actions, persisted snapshots, or Agent Runtime state. Deterministic
derived evidence lives under `architecture/executable-specs/fixtures/proof-artifacts`
and changes only through the explicit generation command; the blocking check
compares expected content without writing files.

This is partial evidence only. It does not accept the proposed tactical dossiers,
activate a production package, define Agent Runtime contracts, or pass an
implementation-readiness gate.

Foundation 0.11.0 validates the consumer-owned executable-specification catalog
and classifies the harness source boundary as development tooling. XState, graph,
schema, and property-test dependencies remain exact development dependencies and
cannot cross into a runtime source boundary. The Foundation capability validates
static connectivity only; the repository-owned property, mutation, and model
scripts remain the independent executable evidence gates.

### Application tests

Test use cases through ports using deterministic fakes:

- transaction behavior;
- authorization and policy coordination;
- idempotency;
- optimistic concurrency;
- outbox creation;
- failure mapping.

### Contract tests

Validate:

- Protobuf control-contract and JSON integration-event compatibility;
- event envelopes;
- SDK/server compatibility;
- runtime-adapter conformance;
- transport error mapping.

### Security architecture conformance

The deterministic security gate validates feature-owned data-classification
manifest fragments and executes paired allow/deny fixtures for cross-tenant
substitution, malicious workspace configuration, prompt authority confusion,
controlled egress and SSRF, replay and stale authority, credential leakage, and
unredacted operational output.

These fixtures are architecture fitness functions. They do not replace
context-owned authorization tests, adapter threat tests, hosted tenant-isolation
tests, or `ar`-owned runtime enforcement conformance.

### Reliability architecture conformance

The reliability gate validates candidate SLI specifications, deployment profiles,
strict invariants, resource budgets, owners, lifecycle state, and metric
attributes. Negative fixtures prove that high-cardinality dimensions, active
objectives without approval evidence, and 100 percent targets are rejected.

This architecture gate does not prove a production SLO. Activating an objective
also requires representative measurements, controlled failure evidence,
product-owner approval, an operational owner, and an enforceable error-budget
policy.

Integration-event compatibility tests use separate exact producer and
major-compatible consumer-reader schemas. Their matrix covers additive payload
fields, required-field removal, incompatible type changes, unsupported major
versions, mismatched event-type and schema-version majors, unknown string values,
duplicate `eventId`, malformed JSON, and redacted terminal rejection. A closed
producer schema passing validation is not evidence that an older consumer can
read a newer additive payload.

Cross-context fan-out conformance publishes one producer-owned source fact to
independent durable consumers. It proves that one unavailable consumer does not
block the others, redelivery creates no duplicate local effect, the same
producer/event identity deduplicates across migration routes, and human
notification mute or digest state cannot suppress Agent Attention or context
invalidation.

All official SDK transports run one behavioral conformance suite covering:

- validation, authorization context, and project scoping;
- idempotency keys, retry safety, duplicate commands, and unknown outcomes;
- full-receipt expiry, compact tombstones, reuse-detection expiry, and same-key
  fingerprint conflicts;
- stable semantic fingerprints across equivalent wire encodings;
- canonicalization-version retention and safe comparison across supported
  idempotency horizons;
- accepted-versus-completed long-running operations;
- caller-persisted command IDs, SDK crash before response, deterministic operation
  lookup, and operation-handle restoration in another process;
- command-ID conflict, result expiry, tombstone expiry, and canonicalization
  version retention;
- local cancellation versus explicit business cancellation;
- cancellation-versus-completion races and privileged termination separation;
- disconnect and explicit client cleanup without terminating durable work;
- stale ETags, invalid field masks, and protection against old-client field loss;
- live-keyset and snapshot pagination, scope-bound tokens, changed queries,
  authorization rechecks, and token expiry;
- stream reconnect, duplicates, gaps, cursor expiry, bounded buffering, and slow
  consumers;
- snapshot-watermark handoff, projection lag, resume vectors, and caller-owned
  checkpoints;
- credential refresh concurrency, token expiry midstream, tenant substitution,
  delegation, and one bounded forced refresh;
- Supervisor and Host spoofing, stale locators, rotating endpoints, instance and
  boot identity, renderer isolation, and lifecycle-capability separation;
- concurrent CLI and Desktop discovery converging on one compatible Host;
- incompatible client, Supervisor, Host, and component versions with no silent
  replacement or fallback;
- generic SDK disconnect and observer `Ctrl+C` without durable-work cancellation;
- attached CLI clean exit, abrupt death, sponsorship expiry, stale heartbeat,
  bounded cancellation, and detached Run survival;
- unknown additive fields, event variants, and enum values;
- binary and ProtoJSON golden fixtures for TypeScript browser, TypeScript Node,
  Go, and the accepted Rust transport;
- stable error mapping and safe diagnostic redaction.

SDK compatibility CI tests the supported previous SDK against the current server
and the current SDK against supported previous servers. Public API reports, Buf
format/lint/breaking checks, generated-code drift checks, package consumer
fixtures, and documentation examples are release gates once package
implementation begins.

During Desktop migration, the same application-capability fixtures run through
Electron IPC, hosted HTTP compatibility routes, Connect, and the direct
handwritten SDK backend. They verify equivalent authorization, durable command
identity, Operation recovery, progress projection, cancellation, feed resume,
errors, and redaction. Provider-specific compatibility routes are excluded from
the target public Orchestrator API.

TypeScript SDK publication tests install the real packed artifact and cover the
publish allowlist, explicit Node ESM and CommonJS entry points, browser conditional
exports, TypeScript `NodeNext` and `Bundler`, esbuild and Rollup tree shaking,
forbidden browser dependencies, forbidden generated deep imports, previous
compiled consumers, bundle-size budgets, and Connect-Web streaming through a
cross-origin proxy. Source-workspace imports do not satisfy this gate.

Hosted proxy conformance runs Chromium, Firefox, and WebKit through every
maintained nginx and Envoy profile. Static configuration validation is necessary
but insufficient: dynamic probes detect response buffering, compression-induced
delay, short idle timeouts, missing CORS headers, broken cancellation, auth
rotation and resume failures, and proxy limits below the typed application limit.
Tests allow browser frame coalescing while requiring ordered, gap-aware,
deduplicated feed semantics.

Each narrow runtime capability port has a conformance suite. The applicable suites
run against the fake runtime, legacy compatibility adapter, and `ar` adapter.
Capability discovery tests verify that an adapter cannot claim unsupported resume,
approval, streaming, or recovery behavior.

Runtime integration uses two complementary conformance layers:

- `ar`-owned Runtime Published Language/API conformance validates canonical wire
  schemas, compatibility, typed errors, idempotency, capability negotiation,
  ordering, replay, redaction, and ambiguous outcomes;
- orchestrator-owned runtime-port conformance validates ACL mapping and the
  consumer semantics required by each narrow port.

Both repositories run the applicable shared Published Language fixtures in CI.
The orchestrator additionally verifies permission decision replay, same-ID
payload conflicts, stale published concurrency preconditions, expired decisions,
capability scope mismatch, unknown enforcement outcomes, event replay, duplicate
and gap handling, runtime epochs, cursor persistence, and snapshot reconciliation.
Shared contract tests verify that execution fences never enter the Runtime
Published Language, Runtime ACL, persistence, SDK models, public schemas,
snapshots, logs, or safe diagnostics. AR-owned tests verify stale-fence enforcement
internally.

The migration-derived runtime matrix additionally verifies:

- process liveness, session availability, context application, pending
  interaction, participant readiness, and completion remain distinct;
- context application without a model turn produces no assistant or tool effect;
- partial participant failure does not disturb healthy siblings without an
  explicit Run policy outcome;
- late reconciliation can promote a pending participant without relaunching
  healthy runtime sessions;
- stale launch, input, permission, reconcile, and stop commands are rejected
  before an external effect;
- accepted input, provider processing, visible output, and product processing
  acknowledgement remain distinct outcomes;
- uncertain delivery and stop preserve evidence and enter reconciliation;
- shared provider-host adoption and release never transfer or stop another
  session's ownership.

AR-owned provider-adapter conformance additionally covers exact host-adoption
identity, cross-process startup single-flight, PID reuse, execution-proof
freshness, provider message ordering, and precedence when provider status and
durable transcript evidence disagree.

Operational rejection tests verify that credentials, prompts, attachments, raw
payloads, and unkeyed digests of secret-bearing content never enter audit or
quarantine records.

Each production persistence adapter runs:

- platform technical harnesses for transactions, crash simulation, migrations, and
  backup/restore;
- its context-owned semantic suite for aggregate, repository, query, and scope
  behavior;
- applicable capability suites for event outbox, command dispatch, inbox, tenant
  isolation, and projection cursors.

Exact-value conformance for Usage Metering, Usage Accounting, and Consumption
Governance covers BigInt values above `Number.MAX_SAFE_INTEGER`, canonical decimal
parsing, scale conversion, half-even and policy-specific rounding, currency
mismatch, allocation conservation, malformed values, overflow, and lossless
contract/persistence round trips. SQLite fixtures prove BigInt reads are enabled
before result consumption and integer aggregate overflow fails safely. PostgreSQL
fixtures prove `bigint`/`numeric` string mapping and reject exact values exposed as
JSON numbers. Exact-time fixtures cover microsecond preservation, negative epoch
conversion, explicit rounding, DST gaps and folds, period boundaries, and
provider evidence with finer precision. The same semantic vectors run through
both adapters.

Each hosted mutating capability runs its declared ADR-0050 conflict matrix against
real PostgreSQL. Tests force same-revision races, write skew, deadlocks,
serialization failures, lock-order inversions, timeout, complete-Unit-of-Work
retry, and lost commit acknowledgement. Equivalent SQLite scenarios prove domain
outcomes but do not substitute for hosted concurrency evidence.

Migration tests distinguish transactional and online-resumable steps. They kill
the runner after intent persistence, external operation dispatch, ambiguous
response, verification, and completion recording; rerun under the same generation;
and prove that compatibility never advances before verified completion.

Hosted tenant-isolation fixtures exercise application predicates and PostgreSQL
RLS independently. They cover pooled connection reuse, forbidden session-level
tenant state, transaction-local reset after commit and rollback, missing context,
cross-tenant identifiers, prepared statements, owner and `BYPASSRLS` hazards,
separate migration and maintenance identities, background dispatch, connection
loss, retry rebinding, and pool plus checked-out-client error handling.

Optional PgBouncer fixtures repeat the hosted semantic suite through transaction
pooling and force physical-backend switches. Negative controls cover plain
session `SET`, SQL-level prepared statements, `LISTEN`, advisory locks, preserved
temporary tables, holdable cursors, statement pooling, pool-level repository
calls during a Unit of Work, and tenant identity in startup parameters.

PostgreSQL failover and recovery suites exercise asynchronous and synchronous
replication profiles separately. They verify explicit RPO outcomes, transaction
phase classification, same-command reconciliation, replica-lag read policy,
endpoint and deployment-epoch replacement, tenant rebinding, old-primary fencing,
physical base backup, archived WAL, selected-point restore, context watermarks,
and fail-closed too-early, too-late, missing-WAL, and corrupted-WAL plans.
They treat physical cluster PITR separately from logical context export/import and
prove that a schema dump is never accepted as disaster-recovery evidence.

Multi-context local backup tests additionally kill the coordinator after every
barrier, manifest, staging, activation, and commit stage; time out individual
participants; mix or tamper with generations; and prove that normal product access
never observes a partial restore set.

These runtime contract suites are separate from provider-adapter conformance owned
by `ar` and from platform or bounded-context persistence conformance. Passing one
suite never substitutes for another.

Project retirement conformance races restriction add and clear, cancellation and
irreversible commit, binding rebind, queued owner writes, participant catalog
upgrade, legal-hold change, lost receipt acknowledgement, and backup restore.
Every owner proves a local freeze before inventory, exact receipt replay, and
truthful policy-retained, unsupported, unknown, and reconcile-required outcomes.
Managed Shared fixtures additionally attempt cross-tenant substitution during
inventory, credential detach, workspace unlink, evidence query, and restore.

### Adapter integration tests

Test concrete adapters against disposable infrastructure:

- NATS JetStream;
- SQLite and PostgreSQL;
- Temporal test environment;
- local Host transport and Supervisor bootstrap control;
- Centrifugo client realtime edge;
- `ar` test runtime.

Temporal adapter tests retain representative histories and exercise replay against
the next worker bundle, stable duplicate workflow starts, worker process death,
activities failing before and after application commit, overlapping timeout
attempts, stale and duplicate signals, product and workflow cancellation,
late-completion fencing, continue-as-new, pinned deployment routing, deployment
registration readiness, and application/Temporal reconciliation. The same
application command fixtures run through the in-process scheduler without
Temporal imports in domain or application code.

Local lifecycle integration also verifies:

- the same behavioral contract for launchd, systemd-user, Windows, and portable
  Supervisor adapters;
- process start, readiness, bounded restart, crash-loop degradation, drain,
  side-by-side activation, failed activation, and recovery;
- Host restart reconciliation without duplicated commands, consumers, or process
  owners;
- AR-owned provider execution is not terminated by Host replacement;
- local NATS process ownership is separate from JetStream topology and message
  semantics;
- target/profile/workspace separation, deterministic target selection, and
  rejection of project-controlled endpoint or trust overrides.

Managed JetStream store tests additionally inject active-publication process
death, repeated crash/redelivery, configured limits, physical `ENOSPC`, store
bit-flip and truncation, tampered backup, adjacent patch update/rollback, invalid
configuration, duplicate-window expiry, and competing store owners. Readiness
tests verify process liveness, broker service health, and expected store content
independently.

Hosted R3 topology tests kill and isolate stream leaders, verify metadata quorum
and placement readiness, crash consumers after business commit but before ACK,
roll nodes one at a time, coexist old and new consumers, backfill with separate
transport identities, and demonstrate that stream sequence cannot become global
business ordering. Every management request has an explicit deadline and uses a
quorum-side control path during partition tests.

Versioned topology tests additionally kill the migration coordinator after every
durable stage, reconcile ambiguous publishes with the same route-scoped transport
identity, prove one business effect through inbox deduplication, exercise rollback
before retirement, and require fail-closed behavior after retirement. Broker
upgrade tests use exact image digests and verify mixed-version quorum, replica
catch-up, traffic, downgrade, and re-upgrade for every explicitly supported
version pair.

Centrifugo conformance runs the same SDK feed fixtures against the local memory
profile, hosted Redis-compatible profile, and a deterministic fake realtime edge.
It verifies scoped token issuance and revocation, disabled client publication,
authorized channel isolation, bounded buffers, duplicates, slow consumers,
process restart, reconnect storms, `recovered=false`, history expiry, missed
wake-ups, authoritative snapshot and cursor reconciliation, and cleanup. Packaging
tests cover nested macOS signing and notarization, Windows signing and lifecycle,
Linux packaging, staged activation, rollback, crash loops, and absence of
first-launch downloads.

Observability integration tests send sampled, unsampled, and malformed W3C trace
context through Connect, persistence, outbox, JetStream, inbox, and durable work.
They verify new-root span links for delayed work, one span per retry or
redelivery, structured-log correlation, explicit signal allowlists, absent secret
baggage, bounded metric labels, and unchanged business effects while the
Collector is unavailable. An instrumentation feature is not claimed merely
because its SDK exports model types; the configured exporter path must emit it.

### End-to-end tests

Use isolated sandbox projects and test identities. End-to-end tests verify only
critical workflows and recovery boundaries.

Never run agent launch or task execution tests against real user projects.

## Architecture tests

Automated checks must reject:

- forbidden imports;
- package dependency cycles;
- cross-context deep imports;
- broad package exports;
- provider branches in core;
- public SDK/transport contract imports in application or domain;
- transport types in domain;
- Centrifugo channels, tokens, offsets, epochs, or errors in domain, application,
  public SDK, or canonical feed models;
- unversioned external contracts;
- public control JSON Schemas that duplicate canonical Protobuf;
- public Protobuf fields outside the accepted cross-language profile;
- context-owned storage or projections placed in global platform packages;
- process-wide resources instantiated below the application composition root;
- multiple process-owner implementations wired simultaneously;
- bounded-context domain/application imports in Local Supervisor packages;
- process installation, supervision, update, or termination in the ordinary SDK;
- normal public API commands proxied through Local Supervisor adapters;
- project or workspace configuration imported as target endpoint, credential, or
  trust configuration;
- runtime ports owned or exported by the Runtime ACL;
- `ar` Published Language schemas imported by orchestrator domain/application
  code;
- product approval state merged with technical runtime permission state;
- one event handler mutating multiple bounded contexts;
- cross-context foreign keys, joins, transactions, or table writes;
- broad `spi` or root package barrel exports;
- feature dependency cycles inside one bounded context;
- generic aggregate repositories or ORM entities in domain/application;
- child-entity repositories or direct application mutation of aggregate internals;
- JavaScript `Date`, Temporal implementation objects, Decimal, Dinero, Drizzle,
  or driver types in domain/application models or public contracts;
- integration-event schemas without complete manifests or with broker-specific
  semantics in canonical contract metadata.
- provider payload rendered, indexed, exported, or promoted into activity without
  Execution Observation admission, classification, redaction, and registered
  deterministic normalization;
- search indexes or realtime history used as canonical activity or lifecycle
  truth;
- blob, database, and search writes presented as one atomic Unit of Work;
- observation cursors that are not bound to authorization scope, snapshot
  watermark, projection or index generation, and index-local commit position;
- search authorization applied after matching, ranking, count, pagination, or
  cursor advancement;
- latest-only search documents presented as snapshot-stable pagination;
- observation safety modeled as one latest-revision pointer instead of explicit
  revision intervals and current payload disposition;
- Run attribution updates without monotonic compare-and-advance, conflict, gap,
  and idempotent correction semantics;
- realtime history replaying materialized Activity content without current Host
  authorization, deletion, and disclosure hydration;
- public runtime fragments emitted before durable evidence and feed commit;
- observation admission that does not compare current freeze revision and
  deletion epoch in its database transaction;
- rebuild code that queries another bounded context's current state instead of a
  context-local versioned reference projection;
- full raw provider payload indexed by default or globally deduplicated across
  tenants;
- compressed or chunked provider input without expansion, nesting, object-count,
  and per-partition limits;
- client resources, caches, cursors, subscriptions, or late responses not fenced
  by Target identity and client generation;
- local-device execution advertised before OD-038 connectivity conformance;
- materialization of a package marked `deferred` in the package materialization
  policy;
- durable write entry points that do not resolve to exactly one mutation and one
  ADR-0078 consistency contract;
- mutations without a compatible binding for every enabled deployment profile;
- concurrency strategies without independent semantic and required adapter
  evidence;
- process-local mutexes presented as hosted or multi-instance correctness;
- write-capable query contexts, direct inbound-to-handler imports, dynamic write
  registrations, and runtime database access outside owning adapters.

## Replay and simulation

Build a deterministic harness that can:

- replay integration events into projections;
- simulate duplicate and out-of-order delivery;
- race durable replay with live publication and prove a contiguous handoff;
- expire, tamper with, and cross-feed replay cursors before any partial tail is
  exposed;
- exercise complete, snapshot-plus-tail, and non-rebuildable replay classes;
- erase detachable payloads, remove upcasters, inject journal gaps, and verify
  all-feed preflight before projection or broker reconstruction;
- reauthorize replay using current project scope before exposing a plan, snapshot,
  or event;
- inject runtime crashes and stale snapshots;
- verify retry and compensation policy;
- kill cross-context process workers before and after each local commit, publish,
  inbox, acknowledgement, reply, and compensation boundary;
- prove that owner process managers preserve one policy decision while
  choreography-only negative controls expose duplicated policy ownership;
- compare legacy and new runtime projections.

Replay tests are a reliability tool, not a commitment to event sourcing.

## Test doubles

Fakes model declared contracts and deterministic state. Mocks are reserved for
interaction boundaries where call ordering is itself the behavior. Tests must not
encode implementation details that prevent refactoring adapters.

## Quality gates

Before merging behavior:

- affected domain and application tests pass;
- contract schemas validate;
- architecture tests pass;
- changed adapters have focused integration coverage;
- migrations include rollback or forward-recovery verification;
- documentation and ADRs match the implementation.
