# Agent Navigation and Guardrails

This file routes coding agents to canonical project knowledge. It is not a second
copy of the architecture.

## Fast start

Read these before making any change:

1. [Documentation map](docs/README.md)
2. [Architecture overview](docs/architecture/overview.md)
3. [Open decisions](docs/open-decisions/README.md)
4. [Documentation standard](docs/standards/documentation.md)
5. Follow the documentation route below.

<!-- agent-teams-docs:route/v1 begin -->
Use [.agents/skills/docs-authoring/SKILL.md](.agents/skills/docs-authoring/SKILL.md) for documentation.
<!-- agent-teams-docs:route/v1 end -->

Use the single task router in [the documentation map](docs/README.md#navigate-by-task).
Do not preload every architecture document when a change touches one boundary.
Search stable IDs such as `ADR-0051`, `OD-004`, or
`domain.contexts.run-orchestration`, not only filenames.
Do not hand-copy frontmatter or bypass the ordered discovery, authoring,
reachability, impact, and repository-semantic checks.

The exact registry-pinned Docs Protocol command suite is the only document
writer and query engine. Start with `pnpm docs:info`, search with
`pnpm docs:find`, preview before every `pnpm docs:new -- --apply`, and use
`pnpm docs:doctor` before recovery. Mutation and recovery qualification runs
only in disposable fixtures, never against the real repository.

## Current phase

The repository is in architecture definition. Do not introduce production
behavior, runtime dependencies, transports, databases, or framework scaffolding
until the owning boundary and required decision are accepted.

The first production vertical slice is additionally blocked by the five
[implementation readiness gates](docs/architecture/implementation-readiness-gates.md).
Research, deterministic contract fixtures, diagrams, and disposable spikes may
proceed while a gate is in review.

When work depends on an unresolved choice:

1. name the owning open-decision ID;
2. present concrete alternatives and consequences;
3. wait for explicit product-owner approval;
4. record the outcome in a new or superseding ADR;
5. only then implement the affected production behavior.

Agents create ADRs as `proposed`. Only an explicit product-owner instruction can
change an ADR to `accepted` or `superseded`.

## Product boundary

The orchestrator owns multi-agent coordination: organizations, teams, projects,
work, runs, product messages, product approvals, governance, and provider-neutral
runtime observations and commands.

The `ar` runtime owns provider execution: runtime sessions, processes, resume,
reattach, recovery, capacity, technical permissions, sandbox enforcement,
provider bindings, leases, and private fences. The orchestrator stores opaque AR
references and its own projections; it does not mirror AR aggregates.

## Hard guardrails

The linked documents own the exact rules. This summary exists only to stop agents
before a high-cost boundary violation.

- Business behavior belongs to the owning bounded context and feature. Follow the
  [context map](docs/architecture/context-map.md) and
  [Orchestrator feature profile](docs/architecture/feature-module-standard.md),
  which adopts the organization Feature Module Standard v1.1.
- Distinguish a feature, nested feature, Get Modular entry/group, package, bounded
  context, and deployed service. Do not map them one-to-one. Only a direct parent
  assembles its children; external callers use declared ancestor republication.
  Add the required source checks with the first materialized nested constructs.
- Domain code is pure. Application code depends only on domain and declared
  ports. Adapters implement ports. See
  [dependency rules](docs/architecture/dependency-rules.md).
- Cross-context collaboration uses Published Language, integration events, or a
  consumer-owned port plus ACL. Never deep-import another context or write its
  tables.
- NATS, Temporal, AR, PostgreSQL, Electron, HTTP, provider SDKs, Moleculer, and
  Drizzle remain adapters or composition concerns. Get Modular imports and
  descriptors remain in composition and tests.
- Public transport models, integration events, domain events, application models,
  and provider contracts are separate surfaces. See
  [public contracts](docs/architecture/public-control-contracts.md).
- Assume at-least-once delivery, partial failure, duplicated messages, ambiguous
  external outcomes, and only explicitly declared ordering. See
  [eventing](docs/architecture/eventing-and-reliability.md).
- Each bounded context owns its state, migrations, inbox, outbox, feed, and
  transaction boundary. There is no cross-context Unit of Work or distributed
  transaction.
- Full strategic and tactical DDD applies to business contexts with real domain
  complexity. Do not invent ceremonial aggregates in platform, SDK, integration,
  host, or tooling packages. See [the DDD standard](docs/domain/modeling-standard.md).
- Aggregate roots own transitions and invariants. Repositories persist aggregate
  roots; query services and projections serve reads.
- Production package paths and owners must be declared in
  [`architecture/package-catalog.yaml`](architecture/package-catalog.yaml).
  Proposed owners reserve topology but do not authorize production code.
- Plan modules within the blocking Foundation maintainability budgets. Product
  and repository-tooling source uses 500 effective lines per file, 150 per
  function, complexity 20, depth 4, and 5 parameters; tests and conformance
  harnesses use 800, 250, 30, 5, and 6. Split responsibilities before the gate,
  rather than adding a local lint exception.
- The selected Host assembles capabilities once through the exact Get Modular
  Core/Assembly `0.5.0` pair. Meaningful composition seams use typed entries and
  static groups; private helpers stay direct imports. Never retain a parallel
  Awilix graph or reconstruct the same features in Moleculer service factories.
  Follow the [composition profile](docs/architecture/composition-and-dependency-injection.md),
  including its stricter authoring budgets and first-scope conformance requirements.
- Before extracting a service, record its capability owner, measurable reason,
  versioned contract and wire protocol, transaction and durability boundary,
  authorization, concurrency, recovery, and lifecycle owner. Framework selection
  or module count does not supply these decisions. Name the semantic owner,
  callable capability, and execution placement separately; justify RPC or a
  durable handler without deriving services from nested features. Use owned
  ports, not a generic service locator; the [service-boundary proposal](docs/decisions/0105-portable-service-boundaries-and-moleculer.md)
  records the reviewed portable contract, local RPC, and distributed runtime
  alternatives. Follow the [planned groups](docs/architecture/context-map.md#planned-service-groups):
  Team Topology's S3 product group is distinct from the S1/S2 checker fixture.
  Every operation names its group, real consumer, and request/reply or durable
  semantics. Distinguish a capability group, deployment role, and interchangeable
  replica set; never split one transaction across RPC roles. Use selected
  framework or platform mechanisms through typed adapters, with explicit
  discovery, routing, identity, admission, drain, and retry owners. Do not rebuild
  them as a generic framework. A `.proto` file does not select Moleculer or Dapr;
  standard RPC and framework packet protocols remain distinct. Proposed runtime
  choices and disposable spikes are not production qualification.
- Define each application's input port and narrow trusted invocation profile
  without transport types. Connect, future GraphQL, and selected private RPC
  adapters map to that port. Keep composed queries behind owned query ports and
  ACLs, and follow the [additional API profile](docs/architecture/sdk-and-transports.md#additional-client-api-styles)
  for request caches, operation scopes, and first-materialization evidence.
- Native PostgreSQL is the selected authoritative SQL engine for local and
  hosted profiles. Reuse the PostgreSQL adapter family and context-owned
  migrations; keep local process and distribution management behind the Local
  Supervisor boundary. Desktop chooses a Target and uses its Host API, never
  direct SQL or a second authoritative local fallback. [ADR-0108](docs/decisions/0108-bundled-postgresql-launcher-integration.md)
  selects `embedded-postgres` behind the Supervisor component adapter. Exact
  artifacts and every released platform/capability require the [packaged PostgreSQL qualification](docs/architecture/local-host-lifecycle.md#packaged-postgresql-qualification),
  including Windows/macOS packaging and verified restore. Library selection and
  unrelated platform CI are not that evidence.
- The Local Supervisor manages local component availability only. It contains no
  orchestration domain and does not proxy normal public control traffic.
- SDKs contain contract, transport, and client ergonomics, never orchestration
  business rules or process ownership.
- Legacy code is a behavior oracle and adapter donor, not a source of domain
  boundaries. Migration keeps exactly one mutation owner.
- Authoritative exact values never use JavaScript `number`, SQL binary floating
  point, or JSON numbers. Follow the exact-value profile in
  [persistence](docs/architecture/persistence-boundary.md#exact-quantities-money-and-instants).
- Product identity and grant facts belong to the configured authority provider;
  each owning use case owns its authorization port and business invariants.
  Runtime, sandbox, capability, and technical permission enforcement belongs to
  `ar`.
- Trusted tenant scope comes from authenticated context and canonical resources,
  never from payload or workspace configuration. Untrusted content never becomes
  a command without a typed authenticated control boundary.
- Raw secrets remain inside secret adapters; other layers carry only `SecretRef`.
  Outbound HTTP crosses a controlled egress adapter. Follow
  [security architecture](docs/architecture/security-architecture.md).
- SLOs measure a small set of user journeys. Correctness, tenant isolation, and
  resource saturation remain separate invariants or budgets. Numerical targets
  require calibration and explicit approval under
  [reliability objectives](docs/architecture/reliability-objectives.md).

The root quality tooling lane defaults to Node `26.11.1` and pnpm `11.18.0`
under the product owner's explicit Node default migration. Node `24.21.0`
remains an explicit compatibility lane. Historical Node staging evidence and
accepted ADRs retain their original values; earlier guidance to keep Node 26
inactive does not govern this migration. Node 26 does not bundle Corepack;
invoke the existing Corepack JavaScript entrypoint with the selected Node
executable and use a job-owned pnpm shim for nested commands. Keep frozen
installation and engine strictness enabled.
`pnpm quality:coverage:test` binds all mandatory quality test files and identities
to the installed Foundation execution runner. `pnpm lint:typed` includes the
default unknown-assertion bridge gate; never bypass a reported shared defect.

Foundation `architecture.source-dependencies` is schema v3: `rootPackage: true`
and `packageRoots` for every workspace package. Required CI runs
`agent-teams-foundation check` on the installed registry package. When that
gate reports a boundary violation, fix the source rather than shrinking scope
or adding a baseline:

- forbidden domain/tooling dependency -> introduce a consumer-owned port and
  adapter; do not import filesystem, environment, network SDK, or a concrete
  adapter into a constrained production boundary;
- deep import -> use the public entrypoint listed for that boundary;
- cross-package relative import -> package export or a dynamic repo-root load
  from a development boundary, never a new production package;
- new root or package -> owner, `packageRoots`/`rootPackage`, and a
  non-overlapping boundary, never an exclusion;
- `includeRootPackage` in YAML is invalid; public v3 uses `rootPackage: true`;
- `@agent-teams/engineering-foundation` stays a root-only exact registry
  development dependency. Nested workspace packages must load it from the
  repository root install, not declare it in their own manifests;
- oxlint counterexample fixtures live in `tooling/lint-fixtures` so they can
  fail lint on purpose. Production oxlint lanes keep them ignored.
  Foundation source-dependencies classifies them as `fixture.lint` so they
  cannot sit outside the graph;
- CI greening by dropping a governed root, pending a root silently, or adding
  an unbounded suppression is forbidden.

## Change workflow

For architecture or implementation work:

1. identify the owning context, feature, and authoritative documents;
2. check related open decisions and superseded ADRs;
3. confirm language, invariants, aggregate boundary, and concurrency model;
   distinguish the feature/module boundary from any proposed deployment boundary;
4. define domain, application, Published Language, and client surfaces separately;
5. implement inward dependencies and narrow consumer-owned ports;
6. add adapters and composition at the edge;
7. add tests and conformance evidence proportional to risk;
8. update canonical documentation in the same change;
9. run `pnpm check:changed` during iteration; Foundation routes the current Git
   delta to the configured path-aware and project-wide checks;
10. run `pnpm check:fast` before handoff;
11. run the authoritative `pnpm check` before opening or merging a pull request;
12. use `pnpm nx:projects` and `pnpm nx:affected -- --base=<base> --head=<head>`
    for repository-pinned project discovery and impact inspection;
13. run additional surface-specific gates when the owning documentation requires
    them. A passing changed-file or fast check never replaces the complete gate.

For governed documentation changes, the repository-local `docs-authoring` Skill
is the exact route for `agent-teams.docs-protocol/v1`; it does not duplicate the
machine-readable profile. Its ordered checks are mandatory. An impact report is
a review route, not permission to rewrite an unrelated authority.

Do not create generic `shared`, `core`, workflow-engine, repository, event, DTO, or
utility packages to avoid choosing an owner. Reuse semantics through explicit
contracts and proven narrow primitives, not through an unowned dumping ground.

## Verification

Minimum documentation and architecture preflight:

```bash
pnpm docs:check
pnpm architecture:nx:check
pnpm architecture:check
pnpm lint
pnpm security:check
pnpm typecheck
```

Run narrower tests first while iterating. The final gate must match the changed
surface.

## Runtime testing safety

Never test agent launch, provisioning, terminal runtime, task assignment,
recovery, or message delivery on real user projects. Use a new sandbox project or
an explicitly test-only fixture.

## Documentation authority

Use the [authority matrix](docs/standards/documentation.md#authority-by-knowledge-type)
when documents differ:

- ADRs own decision rationale and consequences;
- architecture documents own current cross-context rules;
- bounded-context dossiers own domain language and invariants;
- machine-readable schemas own exact wire shape;
- runbooks own operations and recovery;
- research records evidence but is never normative.

Fix conflicting artifacts explicitly. Do not let two sources of truth survive.

<!-- agent-teams:quality-standard:start -->
Before planning, implementing, or reviewing changes, read and follow the
[organization Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md).
Apply it with this repository's instructions, accepted decisions and local
adoption profiles. This reference does not change pinned architecture contracts
or certify existing code as conformant.
<!-- agent-teams:quality-standard:end -->
