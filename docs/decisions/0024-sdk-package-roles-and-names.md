---
id: ADR-0024
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Fix the TypeScript SDK, generated contract, and runtime integration package roles and names.
related:
  - ADR-0015
  - ADR-0016
  - ADR-0021
  - ADR-0036
  - OD-008
---

# ADR-0024: SDK Package Roles and Names

ADR-0036 subsequently fixed dual Node publication plus browser ESM. OD-008
retains registry, release-channel, and support-policy decisions only.

## Context

The public product SDK, generated Protobuf artifacts, and orchestrator-to-runtime
integration have different audiences and compatibility obligations. Similar names
must not encourage applications to import transport DTOs or runtime ACL internals.

## Decision

The TypeScript product SDK is published as:

```text
@agent-teams/orchestrator-sdk
```

Its root exports only the handwritten capability facade, public SDK models,
credential interfaces, operation handles, and documented client options. It does
not export generated Protobuf messages, Connect stubs, sidecar supervision, or
runtime ACL types.

If low-level generated Protobuf artifacts are published for advanced clients,
their package is:

```text
@agent-teams/orchestrator-contracts
```

That package is versioned against the control Published Language and is not
re-exported by the product SDK.

The orchestrator-to-`ar` anti-corruption integration uses:

```text
@agent-teams/runtime-gateway
```

It is an integration package, not a public control SDK. Orchestrator
domain/application packages and external applications cannot import it.

Browser-safe remote SDK code and Node-specific local connectors have separate
package entry points or packages. Package `exports` prohibit deep imports.
ADR-0036 defines the publication formats. OD-008 still decides registry policy,
exact Node connector boundaries, and future Go/Rust module names.

## Consequences

- Package names communicate three different compatibility surfaces.
- Normal applications cannot accidentally depend on generated or runtime types
  through the root SDK.
- Additional Node-specific publication may be required.
- Generated artifacts can be withheld initially without changing the product SDK
  name.

## Rejected alternatives

- Put handwritten SDK, generated Protobuf, sidecar, and runtime ACL exports in one
  package.
- Name the runtime gateway as if it were the public orchestrator SDK.
- Permit undocumented deep imports from package internals.
