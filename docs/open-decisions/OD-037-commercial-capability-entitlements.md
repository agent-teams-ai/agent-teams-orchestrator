---
id: OD-037
type: open-decision
status: open
owner: architecture/contracts
summary: Define commercial capability entitlement without proxying Orchestrator traffic through Platform or mixing plans with domain authorization.
related:
  - ADR-0055
  - ADR-0086
  - ADR-0087
  - architecture.deployment-profiles
  - architecture.security
  - OD-012
---

# OD-037: Commercial Capability Entitlements

## Decision required

Define how a future paid or commercially restricted Orchestrator capability is
admitted in Managed SaaS, connected self-hosted, and potentially disconnected
self-hosted deployments while clients continue to call Orchestrator directly.

## Constraints

- Client flags, UI visibility, package presence, and possession of an endpoint
  never grant a commercial capability.
- Product authorization, commercial entitlement, deployment availability, and
  domain policy remain four distinct decisions.
- Plan names such as `free`, `pro`, or `enterprise` do not enter Orchestrator
  domain or public command contracts.
- The owning feature consumes one narrow commercial capability decision and
  still enforces its own authorization and domain invariants.
- Platform does not proxy normal Orchestrator commands, feeds, or diagnostic
  payload.
- Managed revocation, expiry, offline grace, and in-flight work behavior are
  explicit per capability and cannot silently terminate durable work.
- Baseline Standalone Self-Hosted operation remains possible without Platform.
- Closed implementation modules cannot be treated as an authority merely because
  they are installed.

## Preferred direction

An external Commercial Access authority issues a signed, audience-bound,
tenant-scoped capability entitlement or short-lived capability lease. A managed
adapter verifies or refreshes it and implements a consumer-owned feature port.
The Orchestrator command admission path validates entitlement itself, so direct
client-to-Orchestrator transport remains safe.

Candidate evidence includes capability ID and revision, subject scope, target
audience, validity interval, revocation epoch, policy version, issuer, and opaque
commercial decision reference. It never contains billing internals or becomes a
reusable user authorization credential.

New work may fail closed when required entitlement freshness cannot be proven.
Each feature must define whether already accepted durable work completes, enters
grace, pauses, or requires reconciliation after expiry or revocation. One global
commercial kill switch is prohibited.

Potential adapters are:

- managed online or bounded-cache Platform entitlement;
- connected self-hosted entitlement;
- signed offline entitlement with explicit expiry and rollback protection;
- standalone baseline policy for capabilities not commercially restricted.

## Options

1. Feature-owned commercial decision ports backed by signed Platform capability
   leases, the preferred direction. This preserves direct data paths and explicit
   authority.
2. Proxy every restricted command through Platform. This centralizes checks but
   couples availability, latency, logs, and all data flow to Platform.
3. Put plans, billing state, and licensing directly in Orchestrator. This removes
   a cross-system contract but gives Orchestrator responsibility outside its
   domain and complicates standalone operation.

## Acceptance criteria

- Threat-model token theft, replay, tenant substitution, clock skew, rollback,
  offline operation, issuer-key rotation, and stale revocation.
- Define command admission and in-flight behavior for each capability category.
- Prove a client cannot bypass entitlement by calling Host or realtime directly.
- Prove Platform outage does not corrupt accepted durable work.
- Prove Standalone baseline operation without Platform.
- Keep commercial provider schemas behind an ACL and out of domain models.
- Define capability discovery without leaking hidden module or customer details.

## Resolution

Open. The architecture supports paid capabilities without routing normal traffic
through Platform, but the entitlement lease, offline, revocation, and in-flight
policies require a dedicated decision before implementation.
