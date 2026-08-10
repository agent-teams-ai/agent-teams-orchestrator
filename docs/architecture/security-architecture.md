---
id: architecture.security
type: architecture
status: accepted
owner: architecture/security
summary: Cross-system trust boundaries, data classification, secret handling, controlled egress, and executable security conformance rules.
related:
  - ADR-0021
  - ADR-0028
  - ADR-0055
  - ADR-0058
  - ADR-0080
  - OD-012
  - OD-014
  - OD-029
  - OD-031
  - OD-032
  - architecture.machine-readable-model
  - architecture.public-control-contracts
  - architecture.runtime-boundary
code_anchors:
  - pattern: architecture/security/**
    enforcement: required
  - pattern: architecture/likec4/security.c4
    enforcement: required
  - pattern: scripts/security/**
    enforcement: required
---

# Security Architecture

## Purpose and authority

This document owns cross-system security boundaries and deterministic security
fitness rules. It does not create a Security bounded context and does not absorb
business authorization, runtime enforcement, secret storage, or feature policy.

| Concern | Authority |
|---|---|
| Product identity, membership, and grant facts | Configured product authority provider |
| Operation-specific business policy | Owning bounded context |
| Authorization-consumption semantics | Feature-owned application port |
| Runtime permission, sandbox, and capability enforcement | `ar` |
| Raw secret storage and retrieval | Composed secret-store adapter |
| Cross-system classification and trust-boundary rules | This architecture standard |

The configured product authority provider answers product authorization
questions. In managed composition this can be the Platform authority; standalone
composition supplies an independent local authority. Each application feature
owns the narrow authorization port it consumes, validates current aggregate
state, and applies operation-specific invariants. An ACL translates provider
evidence without becoming an authorization owner. Exact provider and principal
topology remains open under OD-012.

The Runtime ACL separately translates a consumer-owned runtime port into the
`ar` Published Language without becoming an authorization owner. `ar`
independently enforces technical runtime permissions, sandbox boundaries, and
capabilities.

## Trust boundaries

The canonical deployment-oriented trust model is
[`securityTrustBoundaries`](../../architecture/likec4/security.c4). It is
separate from the strategic bounded-context view.

The model distinguishes:

- local user-device processes: Desktop, CLI, Supervisor, Host, local JetStream,
  local SQLite, and local `ar`;
- the browser device, whose payload and execution environment are untrusted by
  the hosted Host;
- the hosted control plane: Host, JetStream, and PostgreSQL;
- remote runtime workers containing `ar`;
- external identity authorities, task boards, webhooks, and APIs.

Crossing a drawn boundary never grants authority by itself. Each data flow names
its authentication, authorization, ownership, and adapter semantics. Localhost,
same-user execution, NATS possession, and process parentage are not substitutes
for a scoped authenticated control channel.

The exact external identity provider remains unresolved in `OD-012`. The LikeC4
element is deliberately provider-neutral and proposed.

## Authority and untrusted content

Trusted identity and tenant scope come from authenticated context and canonical
resource identity. Business payload fields may repeat scope for validation, but
cannot establish or override it. Cross-tenant administration requires a
dedicated authenticated authority and operation, never a boolean payload escape
hatch.

Prompts, model output, attachments, workspace files, task-board content, webhook
payloads, and provider output are data. Command-like text inside those surfaces
does not become a control command. A mutation requires a typed command envelope,
an authenticated authority, explicit scope, validation, idempotency, and the
owning application use case.

Workspace configuration is untrusted input even after a workspace is registered.
It cannot choose executables, runtime endpoints, credentials, transports, or
egress policy. Workspace Registry and Policy and Risk may publish trusted facts
or decisions; configuration text itself has no authority.

## Data classification manifests

Every materialized public contract, integration event, durable feed, blob, and
telemetry surface owns a feature-local classification manifest fragment. The
exact shape is
[`data-classification.schema.json`](../../architecture/security/data-classification.schema.json).
Context or package composition may assemble fragments for validation and
operations, but a central catalog never becomes the semantic owner.

The fragment file is named `security.manifest.json` and lives in the owning
feature or package beside its public surface. The security validator discovers
that exact filename under `apps/`, `packages/`, and `tooling/`, validates its
registered owner, and rejects duplicate asset IDs across materialized fragments.

Each asset declares:

- `classification`;
- `tenantScope`;
- `retentionClass`;
- `redactionProfile`;
- `exportPolicy`;
- `containsUserContent`;
- `containsAuthorityEvidence`.

### Classification

| Value | Meaning |
|---|---|
| `public` | Intentionally safe for unrestricted disclosure |
| `internal` | Non-public operational or product data without protected payload |
| `sensitive` | Tenant, project, user, provider, or operational data requiring scoped access |
| `secret` | Raw credential or secret material confined to a secret adapter |
| `authority-evidence` | Restricted evidence of a decision or authority check; never the authority credential itself |

`SecretRef` is an opaque reference and is not raw secret material. A public
contract, event, feed, log, or telemetry signal never carries a raw secret.
Authority evidence must not include AR-private fences or become replayable
authorization.

### Tenant scope

`none`, `tenant`, `project`, and `resource` describe the narrowest ownership
scope of the asset. They do not identify the trusted source of scope. The
authenticated context and canonical resource name must still agree before access
or mutation.

### Retention class

`transient`, `operational`, `durable`, `audit`, and `policy-governed` express
lifecycle intent without inventing a legal duration. Exact periods, jurisdiction
rules, legal holds, erasure, and backup interaction remain unresolved in
`OD-029`.

An immutable policy snapshot records intended disposition but is not perpetual
erase authority. Before every irreversible owner-local action, the owner checks
fresh typed authorization for the exact Project epoch, category, action, and
revision. Missing or changed hold evidence fails closed as retention plus
reconciliation; it never reopens Project admission.

### Redaction and export

Redaction profiles are deterministic transformations, not display hints.
`metadata-only` removes protected payload while preserving safe diagnostics.
`authority-evidence` and `secret` use dedicated profiles. User content cannot use
the `none` profile.

Export policies are `unrestricted`, `tenant-authorized`, `restricted`, and
`prohibited`. Unrestricted export is valid only for public data without user
content or authority evidence. Export authorization is rechecked at export time;
classification metadata does not grant access.

## Secrets

Domain and application types may carry only `SecretRef` or a narrow capability
that retrieves a secret inside an outbound adapter. Raw secret values:

- exist only inside the secret-store or provider adapter for the minimum needed
  lifetime;
- never enter domain entities, application commands, public contracts, events,
  feeds, snapshots, logs, telemetry, exception text, or fixtures;
- never pass through command-line arguments, workspace configuration, or
  renderer-controlled state;
- are redacted before operational evidence leaves the owning adapter.

Secret adapters are infrastructure, not a bounded context. Secret rotation,
provider choice, and storage implementation remain composition concerns unless
future domain evidence proves a separate business language.

## Controlled egress

All orchestrator-owned outbound HTTP crosses a consumer-owned egress port
implemented by a controlled outbound adapter. Feature adapters declare intent
and destination policy; they do not create arbitrary sockets or follow
unvalidated URLs. Provider and sandbox egress performed inside a runtime remains
AR-owned technical enforcement and is not routed through an orchestrator port.

The controlled adapter validates the scheme, canonical host, resolved addresses,
redirect chain, port, request size, response size, timeout, and destination
class. It fails closed for loopback, link-local, metadata-service, and
policy-forbidden private destinations. DNS resolution and connection targets
remain bound so a re-resolution cannot bypass the checked destination.

Internal control traffic uses its declared adapter and trust policy rather than
pretending to be external HTTP. Exceptions require an explicit architecture
decision and conformance fixture.

## Replay and stale authority

Retryable mutations carry an idempotency identity and explicit concurrency
preconditions. A stale revision, expired authority decision, scope mismatch, or
invalid execution observation is rejected before an external side effect.
Ambiguous outcomes are reconciled rather than blindly retried.

Orchestrator never stores or validates an AR-private execution fence. It sends
only the published preconditions accepted by the `ar` contract; `ar` owns the
technical enforcement decision.

## Client realtime boundary

Centrifugo terminates client realtime connections but grants no business
authority. The Host issues short-lived, audience-bound, scope-limited
subscription tokens after authenticating the client and authorizing the feed.
Opaque channel names, possession of a connection, localhost, presence, and
publication payload fields never establish tenant or resource scope.

The default profile disables client publication, generic RPC, and unneeded
history or presence capabilities. Product commands enter only through the typed
control API. The Host publishes feature-approved, classified client projections
or opaque wake references after durable feed commit. Raw domain events,
JetStream envelopes, secrets, private fences, and reusable authority credentials
cannot cross this boundary.

Centrifugo history is treated as a non-authoritative bounded cache whose payloads
and scope are validated at the Host and SDK boundaries. Recovery failure,
revocation, authorization uncertainty, or a cursor gap returns the client to a
Host-authorized snapshot or feed reconciliation. Hosted Redis-compatible fanout
and local memory history do not become durable or security authorities.

## Logs, events, feeds, and telemetry

Operational output uses structured fields with explicit classification.
Redaction happens before serialization or export, not only in a UI. Error
messages expose stable safe codes and diagnostics rather than raw payloads.

Telemetry is not an accounting or audit source of truth. Sampling, aggregation,
and exporter behavior may lose detail. User content, raw prompts, credentials,
authority evidence, tenant identifiers, and unbounded resource IDs are excluded
unless the owning manifest and an accepted observability decision explicitly
permit a bounded representation.

## Executable conformance

`pnpm security:check` validates the schemas and executes paired allow/deny
fixtures for:

- cross-tenant substitution;
- malicious workspace configuration;
- prompt and command authority confusion;
- SSRF and controlled-egress policy;
- replay and stale authority;
- credential leakage;
- unredacted logs, events, feeds, and telemetry.

The fixture rules are architecture fitness functions, not the complete runtime
authorization implementation. Feature, adapter, transport, and `ar` conformance
suites add their own threat cases while preserving these invariants.

The security command remains one fail-closed gate even when its implementation
is split into schema, discovery, policy, and threat-fixture modules to satisfy
maintainability budgets. Generated or vendor code may be exempt from the five
size and complexity budgets, but it is not exempt from security discovery,
classification, suppression governance, or the allow/deny fixture contract.

The ReviewRouter interaction entry point is a least-privilege caller of the
centrally maintained reusable workflow. Its `uses` reference and `runtime_ref`
input must match one immutable reviewed commit SHA. The caller keeps OIDC and
repository-specific event filtering explicit, maps only the required secrets,
and limits the fallback GitHub token to read-only issue and pull-request access.
The security validator rejects mutable or mismatched refs, write-capable
fallback permissions, and local checkout, authentication, or runtime steps that
would duplicate or bypass the reusable workflow boundary.

`pnpm architecture:check` includes this gate. The documentation and architecture
CI workflows execute it independently so changes to prose, schemas, fixtures, or
LikeC4 cannot bypass validation.

## Unresolved decisions

- `OD-012` owns identity-provider selection, authentication mechanisms, delegated
  identity, and the detailed tenant-isolation model.
- `OD-029` owns legal and product retention durations, erasure policy, legal
  holds, backup interaction, and jurisdiction-specific sources.
- `OD-014` owns the exact OpenTelemetry profile and export topology.
- `OD-031` owns semantic authority, typed claim admission, delegation, and
  cross-source conflict behavior.
- `OD-032` owns the detailed feature-owned intent, last-mile enforcement,
  target-safety profile, and ambiguous-effect recovery model.

No implementation may infer these choices from examples or fixture timestamps.
