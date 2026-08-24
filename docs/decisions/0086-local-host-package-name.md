---
id: ADR-0086
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Name the Node-only local discovery and lifecycle package orchestrator-local-host to distinguish it from the universal SDK.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0024
  - ADR-0030
  - ADR-0036
  - ADR-0060
  - architecture.local-host-lifecycle
  - architecture.sdk-transports
  - OD-008
  - OD-036
---

# ADR-0086: Local Host Package Name

## Context

ADR-0036 isolated Node-only local discovery and lifecycle behavior from the
universal SDK but named its package `@agent-teams/orchestrator-local`. That name
does not state whether the package is a client transport, a complete local
deployment, or the Orchestrator Host itself. The accepted product terminology now
uses Local Host for the optional local authority process.

## Decision

The universal product SDK remains:

```text
@agent-teams/orchestrator-sdk
```

The Node-only package for Local Host discovery, protected local authentication,
ensure/connect lifecycle, and explicit local transport composition is:

```text
@agent-teams/orchestrator-local-host
```

This package does not contain orchestration domain logic, expose Supervisor
administration as ordinary SDK methods, or make Local Host startup implicit. The
deployable local composition remains a separate application artifact. Remote-only
browser and Node consumers do not depend on this package.

This decision replaces only the old package-name clauses in ADR-0036 and OD-008;
their publication, browser isolation, and conformance decisions remain unchanged.

## Consequences

- Package purpose is explicit and does not look like a second business SDK.
- Remote clients avoid local process, filesystem, and Supervisor dependencies.
- Catalog paths, package exports, examples, and release fixtures use the longer
  name.
- Existing pre-release references to `@agent-teams/orchestrator-local` are not a
  supported compatibility alias because no public release exists.

## Rejected alternatives

- Keep the ambiguous `@agent-teams/orchestrator-local` name.
- Add Local Host lifecycle to the universal SDK.
- Publish separate local and remote business SDK models.
