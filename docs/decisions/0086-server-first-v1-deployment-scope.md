---
id: ADR-0086
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/composition
summary: Qualify Managed SaaS and Standalone Self-Hosted Server in V1 while preserving Fully Local as a future first-class profile.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0030
  - ADR-0033
  - ADR-0035
  - ADR-0058
  - ADR-0060
  - architecture.deployment-profiles
  - architecture.implementation-readiness-gates
  - architecture.local-host-lifecycle
  - OD-021
  - OD-035
  - OD-036
---

# ADR-0086: Server-First V1 Deployment Scope

## Context

The product must eventually support a zero-configuration Fully Local Desktop,
Standalone Self-Hosted Server, and Managed SaaS without creating separate
business implementations. Qualifying Fully Local in V1 would add local SQLite,
a durable local workflow engine, local event and realtime sidecars, Supervisor
lifecycle, signed component distribution, updater and rollback, and macOS,
Linux, and Windows recovery to the first release critical path.

Web support and independent self-hosting are required earlier. Deferring the
local composition must not let hosted assumptions leak into business models or
make Fully Local a future rewrite.

## Decision

The first usable V1 qualifies two Orchestrator deployment profiles:

```text
Managed SaaS
Standalone Self-Hosted Server
```

Both profiles use the same logical domain and application core, public SDK
contracts, server artifact family, and applicable behavioral conformance. They
differ only through explicit composition, authority, infrastructure, and
deployment capabilities.

Fully Local Desktop remains a first-class future profile but is not implemented,
packaged, advertised as available, or required for V1 qualification. Its reserved
composition root, persistence ports, workflow scheduling boundary, Local
Supervisor ownership, protected local transport, realtime boundary, and
cross-profile contract fixtures remain architectural requirements.

V1 may implement or exercise interface-level fixtures for future local adapters,
but it does not create placeholder SQLite repositories, a temporary in-memory
workflow engine, dormant sidecar processes, or empty feature packages merely to
claim local support.

Desktop and Web are clients of either qualified server profile. Desktop may also
host or connect to local AR execution components for local workspaces. Local
agent execution does not imply a Fully Local Orchestrator and does not make
Desktop the orchestration authority.

The estimated 40,000 to 70,000 lines of local persistence, workflow, lifecycle,
packaging, updater, and cross-platform qualification work are intentionally moved
out of the V1 critical path. This is a scope decision, not deletion of the local
architecture.

## Profile guarantees

- Standalone Self-Hosted Server has no runtime dependency on the private Agent
  Teams Platform or a private package registry for baseline operation.
- Managed SaaS uses an Agent Teams-managed Orchestrator deployment and managed
  authority adapter.
- Both profiles expose capability negotiation explicitly and reject incomplete
  or contradictory compositions.
- Domain and application code cannot branch on `managed`, `self-hosted`,
  `desktop`, `local`, or infrastructure product names.
- A feature available in both profiles passes one business-behavior conformance
  suite; operational topology may differ.
- Unsupported future-local capabilities return an explicit unavailable profile
  outcome and are not silently redirected to SaaS.

## Consequences

- V1 reaches Web, managed operation, and independent self-hosting without the
  full Desktop infrastructure burden.
- Users can run local agents against a server Orchestrator before Fully Local is
  available.
- Future Fully Local work remains substantial but enters through already owned
  ports and composition roots.
- Local/server parity is proven incrementally rather than claimed before the
  local adapters exist.
- Release documentation and UI must state clearly which profile is selected and
  which components are active.

## Rejected alternatives

- Qualify Fully Local and both server profiles simultaneously in V1.
- Ship Managed SaaS only and make independent self-hosting a later rewrite.
- Treat Docker inside Desktop as the Fully Local user experience.
- Hide unsupported local behavior behind automatic SaaS fallback.
- Add hosted branches to domain or application code until local work begins.
