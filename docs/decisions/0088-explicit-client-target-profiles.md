---
id: ADR-0088
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: clients/sdk
summary: Use explicit named Target Profiles for Managed, Self-Hosted, and future Fully Local connections while keeping execution placement separate.
approved_by: product-owner
accepted_at: 2026-08-09
related:
  - ADR-0021
  - ADR-0024
  - ADR-0030
  - ADR-0036
  - ADR-0055
  - ADR-0086
  - ADR-0087
  - architecture.deployment-profiles
  - architecture.sdk-transports
  - OD-001
  - OD-008
---

# ADR-0088: Explicit Client Target Profiles

## Context

Desktop and Web clients must connect safely to Agent Teams-managed, customer
self-hosted, and future Fully Local Orchestrators without presenting separate
business applications. Automatic environment detection would make authority,
credentials, data location, and fallback ambiguous. A project could otherwise
start against a different Host after restart or a temporary outage.

Browser and Desktop have different networking constraints. Desktop can validate
and connect to an arbitrary configured server. A centrally hosted browser UI
connecting to private or arbitrary origins introduces CORS, mixed-content,
certificate, credential, and support risks.

## Decision

The client model separates:

```text
Client Profile -> Orchestrator Target -> Project scope
Execution Placement -> local or remote AR capacity
```

A `Target` identifies one Orchestrator deployment and authority realm. A named
`ClientProfile` selects that Target, its trust configuration, credential
reference, and client preferences. Credentials and secret values remain outside
the profile model.

Target selection is explicit and persistent. The client never silently changes
Host, changes authority provider, starts a Local Host, or falls back to Managed
SaaS because the selected Target is unavailable. Project creation binds the
Project to one Target. Moving data or authority to another Target is a separate
future migration operation, not profile switching.

The initial Desktop onboarding offers:

```text
Agent Teams Cloud
Connect to your server
This device
```

`This device` is shown only as unavailable or omitted until Fully Local is
qualified. It cannot initiate a partial or unsupported local installation.

After onboarding, a compact connection switcher manages named profiles such as
`Agent Teams Cloud`, `Work Server`, `Home Server`, and future `This Device`.
When one profile exists, the main workflow does not expose unnecessary mode
controls. Switching profiles changes the visible target workspace only after
explicit confirmation and never migrates or duplicates Runs.

The same handwritten `@agent-teams/orchestrator-sdk` API serves browser and Node
clients. Browser conditional exports contain no local lifecycle code. Desktop
adds `@agent-teams/orchestrator-local-host` only when the future local profile is
installed or managed.

### Web deployment rule

- Agent Teams-managed Web is bound to the Managed SaaS target family.
- Standalone Self-Hosted Server serves or co-deploys the same Web UI from its own
  trusted origin.
- Arbitrary custom Target connection is a Desktop capability in V1.
- A future browser multi-target mode requires an explicit security ADR and
  conformance for CORS, TLS, credential isolation, target discovery, and private
  network access.

Self-hosted onboarding validates a versioned discovery document, HTTPS and
server identity, control-protocol compatibility, authority method, and declared
capabilities before credentials or project data are sent. Endpoint text and a
successful TCP connection are not sufficient trust evidence.

### Execution placement is independent

A Managed or Self-Hosted Orchestrator may dispatch to local AR capacity on the
user's device or to remote workers, according to explicit workspace, policy, and
runtime placement decisions. This does not change the Client Profile or move the
Orchestrator state.

## Consequences

- One frontend codebase supports several deployment targets without ambiguous
  automatic fallback.
- Self-hosted Web avoids the hardest cross-origin and private-network browser
  hazards.
- Desktop can manage several named targets while keeping each Project and Run
  visibly scoped.
- Future Fully Local adds one Target provider rather than a second frontend.
- Target discovery, trust validation, profile storage, and explicit switching
  require dedicated UX and conformance fixtures.

## Rejected alternatives

- Infer Managed, Self-Hosted, or Local mode from endpoint reachability.
- Put local lifecycle methods in the universal SDK.
- Let every browser connect to arbitrary private self-hosted origins in V1.
- Treat local agent execution as proof that the Orchestrator is local.
- Move or clone Project data automatically when a profile changes.
