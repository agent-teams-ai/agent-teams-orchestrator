---
id: OD-002
type: open-decision
status: resolved
owner: platform/eventing
summary: Select the durable local eventing profile and lifecycle owner for bundled NATS.
resolved_by: ADR-0035
related:
  - ADR-0004
  - ADR-0035
  - ADR-0060
  - architecture.eventing
---

# OD-002: Local NATS Lifecycle

## Decision required

Decide whether local deployments:

- bundle and automatically manage a local `nats-server`;
- use a lighter local durable adapter and reserve NATS for hosted deployments;
- use an embedded-compatible transport with equivalent event semantics.

## Constraints

Users must not install, configure, or start infrastructure manually for normal
local use. The choice must preserve broker-neutral core contracts and define a
single lifecycle owner.

## Resolution

Resolved by ADR-0035.

Local deployment bundles and pins `nats-server`; the Local Supervisor owns its
technical process and physical store lifecycle. Hosted deployment connects the
same JetStream adapter family to externally operated NATS.

The JetStream adapter owns broker connection, topology reconciliation,
publication, consumption, acknowledgement, and transport error mapping.
Feature-owned contracts own semantic delivery, ordering, privacy, retention, and
replay requirements.

Exact NATS update, backup, corruption, resource-limit, and historical replay
behavior remains in OD-009 and OD-021.
