---
id: ADR-0106
type: adr
status: accepted
owner: platform/persistence
summary: Select native PostgreSQL for local and server persistence with one adapter family, Supervisor-owned local lifecycle, and qualified bundled distribution.
approved_by: product-owner
accepted_at: 2026-10-17
supersedes:
  - ADR-0011
superseded_by: []
related:
  - ADR-0025
  - ADR-0047
  - ADR-0048
  - ADR-0049
  - ADR-0050
  - ADR-0052
  - ADR-0060
  - ADR-0078
  - ADR-0087
  - ADR-0093
  - architecture.persistence
  - architecture.local-host-lifecycle
  - architecture.deployment-profiles
  - architecture.testing
  - OD-003
  - OD-021
  - OD-035
  - OD-040
---

# ADR-0106: Native PostgreSQL for Local and Hosted Profiles

## Context

The product owner selected PostgreSQL for local Desktop persistence as well as
server deployments. Maintaining authoritative SQLite and PostgreSQL adapters
would retain two schema, migration, codec, and concurrency implementations even
though the product requires the same business behavior. Native bundled
PostgreSQL can reuse the server adapter family while keeping normal local use
free of manual database installation.

This replaces dialect work with binary distribution, process custody, protected
endpoints, resource limits, upgrades, and recovery obligations. A wrapper does
not solve those product responsibilities. Desktop must also work as a client of
a server Target without starting local infrastructure or creating another
authoritative write model.

The product-owner-supplied report *Bundled PostgreSQL options: research and
executable comparison*, dated 2026-10-03, reports isolated Linux experiments
with Rust `postgresql_embedded` 0.21.0, Node `embedded-postgres`
18.4.0-beta.17, and PGlite 0.5.8. Its native runs reported offline startup,
`pg`/Drizzle transaction behavior, state/receipt/outbox atomicity, persistence,
and a responsive control-loop probe. The reported actual engines were
PostgreSQL 18.6 for Rust and 18.4 for Node. These are evidence pins, not selected
production versions. The report's linked raw artifacts are not reproduced by
this ADR, and this documentation change did not rerun those experiments.

The one-client comparison does not establish 100-agent capacity, power-loss
durability, signed distribution, Windows recovery, backup restore, or major
upgrade readiness. Its scores do not select a Desktop framework or justify
introducing Rust into a Node product.

## Decision

### Engine, topology, and client authority

Native PostgreSQL is the selected authoritative relational engine for server
profiles and the future Fully Local profile. The local engine runs as a separate
managed process with persistent data; SQLite and PGlite are not authoritative
fallbacks.

The initial local topology is one PostgreSQL cluster and one application
database per local Target data root, with one schema per bounded context.
Component upgrades preserve that data ownership. Desktop instances, CLI clients,
projects, workspaces, and agents share the selected Target rather than creating
their own clusters. OD-021 retains installation-channel and target-cardinality
details.

Every context has exactly one persistence authority in a deployment. A Desktop
connected to a server Target uses the ordinary SDK, public control API, and
authorized feeds. It receives no SQL credentials, connects to no server database,
and starts no unused local database. Client caches are disposable. Target
switching does not migrate state, repeat a command against another Host, or
synchronize database tables. Context movement remains an explicit versioned
logical transfer with validation, receipts, and reconciliation.

### Shared persistence semantics

The TypeScript Host retains asynchronous `node-postgres` and adapter-local
Drizzle. Local and server profiles reuse feature-owned PostgreSQL schemas,
immutable SQL migrations, codecs, repository mappings, and applicable semantic
suites within a qualified version and capability matrix. Engine versions,
extensions, encoding, collation, and operational configuration are verified
inputs, not assumptions inferred from the PostgreSQL name.

Each context owns its tables, migrations, Unit of Work, receipts, inbox, outbox,
projections, and dispatch records. State, revision, durable command receipt, and
required durable intent commit in its transaction. External effects follow
commit; a lost commit acknowledgement reconciles the original command identity.
One Unit of Work owns one checked-out client. Cross-context transactions, table
writes, joins, and foreign keys remain prohibited.

ADR-0050's capability-owned concurrency evidence applies to local PostgreSQL as
well as hosted PostgreSQL. The SQLite-specific synchronous command lane and
Worker-promotion rule are no longer the local default. Bounded admission,
fairness, short transactions, exact values, stable outcomes, tenant predicates,
and constrained runtime roles remain required. Composition budgets connections
across context roles and workers rather than allocating a pool per agent.

### Lifecycle and wrapper selection

| Responsibility | Owner |
|---|---|
| Bundled binary, process, protected data root, endpoint, and activation custody | Local Supervisor |
| SQL connection, context migration, transaction, and recovery validation | Host persistence adapter and owning context |
| Business invariants, conflict semantics, receipts, and reconciliation decisions | Owning capability |
| Target selection, presentation, and SDK connection | Desktop, CLI, or other client |

For the existing Node lifecycle substrate, `embedded-postgres` is the first
qualification candidate. `postgresql_embedded` is the alternative only if a Rust
lifecycle substrate is independently selected. A Rust launcher does not run
Drizzle inside Rust or replace the TypeScript Host. Neither wrapper is adopted
as a production dependency by this decision, and the project does not maintain
both launchers by default.

The [Node wrapper's pinned launcher](https://github.com/leinelissen/embedded-postgres/blob/8c8c16d1b81bec8ae3315d59a050654086a85e23/packages/embedded-postgres/src/index.ts)
uses development credentials and a fixed port by default, recognizes readiness
from stderr, and force-stops Windows children. Its bootstrap password file has
no explicit owner-only creation mode in that source; its process error, timeout,
already-exited-child, and global exit-hook behavior also needs qualification.
These are source-review risks, not reproduced npm-package data-loss or secret
disclosure results. Production integration must close them or reject that
candidate while retaining the same PostgreSQL boundary.

The [Rust bundler's pinned source](https://github.com/theseus-rs/postgresql-embedded/blob/a995b73d5b0b220f96b03634ec8cdfe117996c26/postgresql_embedded/build/bundle.rs)
can reuse existing output files before selecting a newly requested archive.
Qualification therefore binds the actual binary/archive hash and observed engine
version, not only a wrapper version or environment setting. Persistent data
and effective durability settings must override unsafe temporary/test defaults.

Product policy remains in the Host and Supervisor. A wrapper may supply a narrow
launch mechanism; it cannot become a universal SQL manager, repository framework,
or a second process supervisor. A proven wrapper limitation may be isolated in
the PostgreSQL component adapter using upstream process tools without moving
lifecycle policy into business features or the SDK.

### Safety and qualification boundaries

The [managed PostgreSQL lifecycle](../architecture/local-host-lifecycle.md#managed-postgresql-lifecycle)
owns offline signed packaging, authenticated SQL identity, private bootstrap
credentials, bounded startup/shutdown, foreign-process rejection, and custody
when a Supervisor dies before its database child. Normal use initializes only
new owned data and never resets an existing cluster to recover availability.

Host activation, schema migration, and engine upgrades are distinct transitions.
A candidate cannot migrate the old Host's live database during a health check.
Old writers, checked-out clients, and dispatchers are fenced before new mutation
authority. Returning to an old binary requires compatibility with current data;
it cannot silently discard later accepted writes. PostgreSQL documents that
starting a cluster upgraded with hard links can make the old cluster unsafe,
so a retained directory alone is not rollback evidence.
See [the upstream major-upgrade contract](https://www.postgresql.org/docs/18/pgupgrade.html).

The [persistence recovery contract](../architecture/persistence-boundary.md#backup-and-restore)
requires a consistent engine artifact, context and blob validation, and explicit
reconciliation before restored dispatch. One SQL snapshot is not an atomic
backup of NATS, AR, and external effects. A missing restored receipt does not
prove an effect never happened, and a restored epoch is not fresh authority.

OD-003 and OD-021 remain open for exact implementation and operational evidence.
The [testing strategy](../architecture/testing-strategy.md) separates semantic,
concurrency, packaging, recovery, and representative active-agent workload
qualification. Local PostgreSQL does not inherit hosted HA guarantees, and
hosted capacity does not increase merely because Desktop uses the same engine.

ADR-0087's server-first V1, OD-035's workflow decision, OD-040's implementation
admission, and ADR-0093's release qualification remain unchanged. Native
PostgreSQL is accepted architecture; no Fully Local availability, production
dependency, or materialized package is claimed.

### Supersession scope

This ADR supersedes ADR-0011's topology and rejection of an auto-managed local
PostgreSQL process. It also partially supersedes only these local requirements:

- ADR-0025: `node:sqlite`, synchronous local command lanes, and their default
  Worker-promotion path;
- ADR-0048: local SQLite authority and SQLite-specific recovery artifacts;
- ADR-0052: paired SQLite/PostgreSQL repository trees, dialect migrations, and
  the local SQLite dependency-readiness requirement.

Their other decisions remain in force, including capability-scoped Unit of Work,
post-commit effects, single authority, logical transfer, and adapter-local Drizzle.
Earlier SQLite-specific local examples and experiments remain historical; they
do not require a second current engine. Exact-value, DDD, consistency-evidence,
and bounded-context ownership requirements are preserved.

## Consequences

- One native SQL engine removes the need for a second dialect and repository
  family while retaining narrow domain-specific persistence ports.
- Desktop gains native PostgreSQL concurrency and existing server semantics,
  with explicit connection, memory, disk, and scheduling budgets.
- Distribution and operations become more substantial: binaries, credentials,
  process custody, backup, patching, major upgrades, and recovery need evidence
  on each supported platform.
- The client can use a local or server Target without owning either deployment's
  database or changing business behavior.
- The accepted engine choice reduces future ambiguity without expanding V1 or
  certifying a research wrapper as production-ready.

## Rejected alternatives

- Keep authoritative local SQLite or PGlite as a fallback: preserves a second
  persistence runtime and creates ambiguous authority during failure.
- Select Rust solely because its research score is higher: ignores the chosen
  lifecycle substrate and adds a language boundary without demonstrated benefit.
- Treat bundling as production qualification: leaves signing, custody, restore,
  interruption, and workload evidence unproven.
- Give every Desktop, project, or agent its own authoritative PostgreSQL child:
  conflicts with one local lifecycle owner and shared durable Target identity.
- Connect Desktop directly to hosted SQL or synchronize local and server tables:
  bypasses control contracts and creates competing write authorities.
- Build a generic database supervisor or global transaction abstraction:
  duplicates existing owners and erases context boundaries.
