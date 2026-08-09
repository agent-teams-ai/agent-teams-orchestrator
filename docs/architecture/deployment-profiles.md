---
id: architecture.deployment-profiles
type: architecture
status: accepted
owner: architecture/composition
summary: Canonical deployment profiles, client targets, authority providers, execution placement, and first-release qualification scope.
related:
  - ADR-0030
  - ADR-0058
  - ADR-0060
  - ADR-0085
  - ADR-0086
  - ADR-0087
  - architecture.local-host-lifecycle
  - architecture.sdk-transports
  - architecture.security
  - OD-012
  - OD-035
  - OD-037
---

# Deployment Profiles

## Independent axes

Deployment, client, and execution placement are separate choices:

```text
Orchestrator deployment profile
  Managed SaaS | Standalone Self-Hosted | future Fully Local

Client surface
  Web | Desktop | CLI | SDK consumer

Agent execution placement
  local device | customer worker | managed remote worker
```

No axis is inferred from another. Desktop is not automatically local authority,
Web is not automatically managed, and local AR execution does not mean that
orchestration state is local.

## Qualified profile matrix

| Profile | Orchestrator authority | Product authority | Persistence | V1 | Clients |
|---|---|---|---|---|---|
| Managed SaaS | Agent Teams-managed Server Host | Managed Platform authority adapter | Managed PostgreSQL and server infrastructure | Qualified target | Managed Web, Desktop, CLI, SDK |
| Standalone Self-Hosted Server | Customer-operated Server Host | Standalone authority adapter | Customer PostgreSQL and server infrastructure | Qualified target | Co-deployed Web, Desktop, CLI, SDK |
| Fully Local Desktop | Local Host on user device | Local standalone authority adapter | Context-owned SQLite and protected local components | Architecture only, implementation deferred | Desktop, local CLI, SDK |

The Managed and Self-Hosted profiles use the same logical Orchestrator core and
public contracts. Composition validates one complete compatible adapter set. A
profile name never appears as a business-rule branch.

## Managed SaaS topology

Managed SaaS means that an Orchestrator Host is running in Agent Teams-managed
infrastructure. Agent execution may still be local or remote.

```mermaid
flowchart LR
    Client["Managed Web or Desktop"] -->|"login and target discovery"| Platform["Agent Teams Platform"]
    Platform -->|"short-lived scoped authority"| Client
    Client -->|"commands and queries"| Host["Managed Orchestrator Host"]
    Client -->|"authorized live feeds"| Realtime["Managed realtime edge"]
    Host --> Runtime["Local or remote AR capacity"]
```

Platform is the managed product authority and control plane for customer
identity, tenancy, membership and grants, product-project binding, commercial
access, managed deployment placement, and target discovery. It does not own
Orchestrator Runs, Teams, Work, messages, Observation Evidence, Activity Views,
or diagnostic payload.

The normal data path does not proxy through Platform. After bootstrap, clients
connect directly to the scoped Orchestrator and realtime edge. Direct transport
does not bypass authority: the Host validates Platform-issued, audience-bound,
short-lived authority and current revocation requirements. Exact commercial
capability semantics remain open under OD-037.

## Standalone Self-Hosted topology

The customer deploys the Server Host, PostgreSQL, broker and realtime adapters,
and the Web UI from one supported release composition. A Standalone Authority
adapter replaces Platform identity and grant dependencies for baseline operation.

Self-hosted operation does not require Agent Teams-managed APIs, private package
registry access, or an active commercial connection unless the customer
explicitly enables a future connected managed capability.

The co-deployed Web UI uses the same origin or a release-qualified reverse-proxy
topology. Desktop can store an explicit named Target Profile for the server after
discovery, TLS, protocol, authority, and capability validation.

## Future Fully Local topology

Fully Local composes the future Local Host, context-owned SQLite adapters, local
workflow adapter, local realtime edge, and AR execution components under the
Local Supervisor. Components are independently signed and lifecycle-managed;
unused local infrastructure is not started merely because Desktop is installed.

ADR-0086 excludes this implementation from V1. OD-035 names OpenWorkflow as the
preferred local workflow spike candidate. Deferral cannot change public resource,
persistence port, workflow-state, feed, recovery, or authority boundaries.

## Connected and hybrid evolution

A customer-operated or future Local Host may later consume selected managed
identity, commercial, update, relay, or collaboration services while retaining
local orchestration state. That is a separate Connected Self-Hosted or Connected
Local profile, not Managed SaaS and not an implicit fallback.

Such a profile requires explicit data-flow, offline, revocation, licensing,
privacy, recovery, and degraded-mode decisions. It cannot be created merely by
letting a local Host call arbitrary Platform endpoints.

## Client Target Profiles

A Client Profile owns user-facing connection selection, not server state. It
contains safe target metadata and opaque credential references:

```text
profileId
displayName
targetId
targetKind
endpoint and discovery identity
authorityRealmRef
trustConfigurationRef
credentialRef
lastValidatedProtocol
lastKnownCapabilities
```

Target metadata cannot grant authorization. Secrets are resolved by the client
credential adapter. Capability snapshots are presentation hints and are
revalidated by the Host before commands.

The first-use choices are Agent Teams Cloud, Connect to your server, and future
This device. Profiles are persistent and explicitly switched. Project identity
is bound to one Target; profile switching never migrates data, retries a command
against another Host, or duplicates a Run.

## Profile conformance

Every qualified profile proves:

- explicit authority and trust configuration;
- one writer and one process owner for every mutation and runtime process;
- public SDK behavioral compatibility for advertised capabilities;
- no silent adapter or target fallback;
- current authorization on command, query, feed resume, and raw data access;
- typed unsupported and degraded outcomes;
- target identity preserved across restart, update, and reconnect;
- execution placement changes without changing Orchestrator target identity;
- profile-specific backup, recovery, deletion, and operational readiness.
