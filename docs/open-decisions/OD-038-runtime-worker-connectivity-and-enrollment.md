---
id: OD-038
type: open-decision
status: open
owner: integration/runtime
summary: Define secure enrollment and durable connectivity between a server Orchestrator and AR capacity on a user or customer device.
related:
  - ADR-0024
  - ADR-0064
  - ADR-0086
  - ADR-0087
  - ADR-0089
  - architecture.deployment-profiles
  - architecture.runtime-boundary
  - architecture.security
---

# OD-038: Runtime Worker Connectivity and Enrollment

## Decision Required

Define how a Managed or Standalone Self-Hosted Orchestrator discovers, enrolls,
authorizes, reaches, revokes, and recovers AR capacity running on a user or
customer device without making Desktop the durable lifecycle owner.

## Constraints

- The device initiates the protected connection; inbound NAT reachability is not
  assumed.
- Device identity, installation identity, human identity, runtime execution
  identity, and provider identity remain distinct.
- Enrollment is explicit, target-bound, tenant-bound, expiring, revocable, and
  resistant to copied bootstrap material.
- The channel authenticates both deployment and device and binds messages to a
  negotiated protocol and connection generation.
- Disconnect, Desktop exit, sleep, network change, credential rotation, and Host
  restart have typed durable outcomes.
- Reconnect never revives stale custody, stale execution authority, or a
  cancelled Run.
- Command acceptance, dispatch, provider acceptance, and observation remain
  distinct; ambiguous delivery enters reconciliation rather than blind retry.
- A local connector owns connectivity and process availability only. AR owns
  technical runtime state; Orchestrator owns business coordination.
- Logs, diagnostic payload, workspace data, and secrets follow explicit data-flow
  and redaction contracts across the channel.

## Qualification Evidence

- enrollment, renewal, revocation, and stolen-bootstrap threat fixtures;
- outbound tunnel reconnect and generation-fencing tests;
- device offline, sleep, Desktop exit, Host failover, and duplicate connector
  scenarios;
- cancellation and containment while the device is unavailable;
- protocol N/N-1 negotiation and capability downgrade behavior;
- proof that a local runtime cannot attach to another Target or tenant;
- proof that Desktop closure does not silently terminate durable accepted work.

## Candidate Directions

1. A dedicated signed Local Runtime Connector with an outbound multiplexed
   channel to a server runtime gateway.
2. A customer-operated worker daemon for self-hosted environments, with Desktop
   only managing user onboarding.
3. Direct server-to-AR networking, allowed only for explicitly managed networks
   and never as the universal desktop path.

## Resolution

Open. Until this decision is accepted and its conformance passes, server profiles
must not advertise local-device execution as a qualified capability.
