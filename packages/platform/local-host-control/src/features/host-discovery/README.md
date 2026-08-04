---
id: feature.local-host-control.host-discovery
type: feature
status: accepted
owner: platform/local-host
summary: Validates one explicit local Host discovery observation without fallback or lifecycle side effects.
related:
  - architecture.local-host-lifecycle
  - OD-001
  - OD-021
---

# Host Discovery

## Scope

The feature reads one discovery source for one explicit `TargetId`, validates the
returned observation, evaluates expiry and compatibility, and returns a closed
typed outcome. It never retries, falls back to another target, mutates lifecycle
state, or performs readiness and authentication handshakes.

OS locators, sockets, named pipes, credentials, process management, `ensure`,
updates, and rollback remain outside this slice while `OD-001` and `OD-021` are
open.

## Public surface

The private package exports nominal identities, validated constructors, the
`HostDiscoverySource` and `HostDiscoveryClock` ports, and
`createHostDiscovery`. A `candidate` result means only that a structurally valid,
fresh, compatible observation was read and explicitly requires a later
authenticated handshake. Connection material remains adapter-private and is not
part of this slice. A candidate does not mean the Host is ready, authenticated,
trusted, or connected.

## Owned behavior and invariants

- Target selection is explicit and never derived from a workspace, current
  directory, project configuration, or environment fallback.
- Supervisor, Host, boot, target, endpoint, component, capability, and freshness
  identities remain distinct.
- Protocol versions and boot generations use exact `bigint` values. Instants use
  the repository-wide signed epoch-microseconds representation.
- Expired, stale, incompatible, malformed, unavailable, and missing observations
  remain different outcomes.
- No serializable endpoint, connection handle, credential, or bearer-token type
  is exported. Source observations are projected through a closed allowlist.
- Source exceptions are mapped to a typed failure without leaking raw errors.

## Application use cases and ports

`createHostDiscovery` composes one read-only discovery source, one clock, and an
immutable maximum-age/future-skew policy. A call reads the source at most once.
Adapters may later implement the source using the protected Supervisor discovery
channel without changing this application contract.

## Failure and recovery

Discovery has no retry or recovery loop. Callers may retry under their own bounded
policy, but a failed attempt never changes target or claims readiness. Stale and
expired observations must be refreshed through the owning source rather than
reinterpreted locally.

## Verification

Package checks cover valid observations, every typed outcome, forged or malformed
input, target substitution, exact expiry boundaries, compatibility, duplicate
capabilities, one-call behavior, exception redaction, declaration build, and root
package export.
