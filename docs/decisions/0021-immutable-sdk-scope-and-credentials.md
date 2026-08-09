---
id: ADR-0021
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Use immutable scoped SDK clients and an asynchronous credential-provider boundary.
related:
  - ADR-0015
  - OD-008
  - OD-012
  - OD-019
---

# ADR-0021: Immutable SDK Scope and Credentials

## Context

Hosted SDKs must support human users, service identities, delegated calls, token
refresh, concurrent requests, and long-lived streams without allowing payloads or
mutable global defaults to select trusted identity or tenant scope.

Binding the SDK directly to one bearer-token implementation would also make later
sender-constrained credentials or local capabilities unnecessarily disruptive.

## Decision

The SDK depends on an asynchronous, concurrency-safe `CredentialProvider`
abstraction. A credential request includes the exact resource or audience,
minimum scopes, tenant context when applicable, minimum validity, cancellation,
and deadline. The returned credential is applied only by the transport backend.

The credential provider, not the product SDK, owns access-token caching,
single-flight refresh, refresh credentials, rotation, and secure persistence. Raw
tokens never enter domain/application models, public errors, logs, or telemetry.
The SDK does not accept long-lived secret connection strings.

Refresh single-flight is partitioned by provider, authority, resource, tenant,
sorted scopes, and delegation profile. Cancellation of one caller does not cancel
a refresh shared by other callers. A failed refresh is removed from the in-flight
cache. One forced refresh after an unauthenticated response is allowed only when
the operation is a query or has a stable command ID. Insufficient scope is not a
refresh signal.

Scope lists are canonicalized as sets before keying. A forced refresh uses
compare-and-invalidate semantics: a late unauthenticated response for an older
token cannot evict a newer credential already installed by another caller. One
logical call performs at most one forced refresh; a second authentication failure
is terminal.

Client scoping is immutable:

```text
root client
  -> tenant-scoped client
      -> project-scoped client
```

There is no mutable `currentTenant` or `currentProject`. Scope in resource names,
the scoped client, and the authenticated credential must agree. Request payload
fields cannot override authenticated authority. Cross-tenant administration uses
an explicit privileged capability, not a mutable default.

Trusted subject, actor, client identity, and delegation chain come from verified
authentication context. The SDK does not accept trusted actor or subject IDs in
business payloads. Delegation is obtained through a dedicated credential provider
and identity protocol, not arbitrary metadata.

Credentials are attached when opening a stream. On expiry or revocation, a
resumable feed terminates with a typed authentication outcome, obtains a current
credential, and reconnects from an explicit checkpoint within a bounded retry
policy. Credentials are not replaced invisibly inside an existing stream.

The provider refuses credentials whose remaining usable lifetime after expiry
skew cannot cover connection setup and a minimum forward-progress budget.
Repeated authentication reconnects at the same checkpoint trip a bounded
auth-churn circuit breaker instead of entering a livelock.

Browser-safe SDK modules cannot import Node.js, sidecar, filesystem, or process
code. Node-specific local connectors and embedded adapters are separate package
entry points or packages. Environment detection never silently changes transport
or credential behavior.

## Consequences

- Concurrent clients cannot accidentally switch tenant context.
- OAuth, service identity, delegated identity, and local capability credentials
  fit one boundary without entering business code.
- Credential providers carry meaningful security and concurrency responsibility.
- Stream reauthentication depends on resumable cursor semantics.
- Exact identity provider and grant model remain owned by OD-012.

## Rejected alternatives

- Pass a static token string to every public method.
- Store refresh credentials inside the orchestrator SDK.
- Let request payloads declare trusted subject, actor, or tenant authority.
- Use mutable process-global tenant or authentication state.

## Evidence

- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OAuth 2.0 Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707.html)
- [OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html)
- [Azure SDK authentication guidance](https://azure.github.io/azure-sdk/general_design.html#authentication)
- The isolated 2026-07-25 security-rotation spike passed 43/43 assertions in
  three runs. It proved 100-way per-key single-flight, compare-and-refresh,
  scoped token isolation, one bounded forced refresh, durable stream reconnect,
  and minimum-usable-lifetime failure behavior. The retained
  `Credential and cursor rotation` fingerprint is in the
  [foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
