# Agent Navigation and Guardrails

This file routes coding agents to canonical project knowledge. It is not a second
copy of the architecture.

## Fast start

Read these before making any change:

1. [Documentation map](docs/README.md)
2. [Architecture overview](docs/architecture/overview.md)
3. [Open decisions](docs/open-decisions/README.md)
4. [Documentation standard](docs/standards/documentation.md)
5. [Documentation authoring Skill](.agents/skills/docs-authoring/SKILL.md)

Use the single task router in [the documentation map](docs/README.md#navigate-by-task).
Do not preload every architecture document when a change touches one boundary.
Search stable IDs such as `ADR-0051`, `OD-004`, or
`domain.contexts.run-orchestration`, not only filenames.

## Current phase

The repository is in architecture definition. Do not introduce production
behavior, runtime dependencies, transports, databases, or framework scaffolding
until the owning boundary and required decision are accepted.

The first production vertical slice is additionally blocked by the four
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
  [feature standard](docs/architecture/feature-module-standard.md).
- Domain code is pure. Application code depends only on domain and declared
  ports. Adapters implement ports. See
  [dependency rules](docs/architecture/dependency-rules.md).
- Cross-context collaboration uses Published Language, integration events, or a
  consumer-owned port plus ACL. Never deep-import another context or write its
  tables.
- NATS, Temporal, AR, SQLite, PostgreSQL, Electron, HTTP, provider SDKs, and
  Drizzle remain adapters or composition concerns.
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
- Process-wide resources and private Awilix containers are created only in
  `composition/**`. Features export typed factories and public contracts, never
  containers.
- The Local Supervisor manages local component availability only. It contains no
  orchestration domain and does not proxy normal public control traffic.
- SDKs contain contract, transport, and client ergonomics, never orchestration
  business rules or process ownership.
- Legacy code is a behavior oracle and adapter donor, not a source of domain
  boundaries. Migration keeps exactly one mutation owner.
- Authoritative exact values never use JavaScript `number`, SQLite `REAL`, or JSON
  numbers. Follow the exact-value profile in
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

## Change workflow

For architecture or implementation work:

1. identify the owning context, feature, and authoritative documents;
2. check related open decisions and superseded ADRs;
3. confirm language, invariants, aggregate boundary, and concurrency model;
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

For governed documentation changes, follow the repository-local
`docs-authoring` Skill. Run `pnpm docs:impact` before the final documentation
gate; an impact report is a review route, not permission to rewrite an unrelated
authority.

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
