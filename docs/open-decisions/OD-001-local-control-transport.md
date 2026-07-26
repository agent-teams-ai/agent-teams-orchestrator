---
id: OD-001
type: open-decision
status: open
owner: platform/control-api
summary: Select the protected local protocols for Supervisor bootstrap and direct Orchestrator Host control.
related:
  - architecture.sdk-transports
  - ADR-0016
  - ADR-0033
  - architecture.local-host-lifecycle
---

# OD-001: Local Control Transport

## Decision required

Select the protected local endpoint substrates for two separate surfaces:

1. the narrow Supervisor bootstrap and lifecycle-control protocol;
2. the direct Orchestrator Host Connect control protocol.

Candidates include Unix sockets plus Windows named pipes, protected loopback
`127.0.0.1` with rotating credentials, or a platform-specific combination behind
one Local Connector.

## Constraints

The decision must cover authentication, discovery, startup readiness, reconnect,
streaming, backpressure, version negotiation, credential rotation, and crash
recovery. Normal Desktop and CLI use must not require manual infrastructure setup.

ADR-0033 fixes process ownership: the shared Local Supervisor owns technical
process availability, and the ordinary SDK connects directly to the Host after
protected discovery. The Supervisor must not proxy normal control API traffic.

The selected substrates must support a stable trusted locator, rotating
per-instance Host endpoints, instance and boot handshake, stale endpoint recovery,
and Desktop renderer isolation. Bootstrap lifecycle authority and normal SDK
credentials remain separate.

## Acceptance criteria

- equivalent conformance on macOS, Linux, and Windows;
- no wildcard or externally reachable bind;
- current-user access control for socket or pipe transports;
- no secret in argv, inherited environment, renderer IPC, or shared plaintext
  descriptor;
- Connect unary and server-streaming behavior remains unchanged by platform;
- Supervisor discovery cannot be used as a generic application proxy;
- CLI and Desktop can concurrently discover the same compatible Host;
- packaging and upgrade tests cover stale locators, rotating Host endpoints, and
  incompatible components.

## Decision evidence

Isolated lifecycle probes on macOS and Linux tested both Unix-domain-socket and
protected loopback Host endpoints. In each profile, eight concurrent clients
converged on one Supervisor and one Host, connected directly to the Host after
discovery, rejected stale endpoints, rotated per-boot Host identity and
credentials after crash, negotiated incompatible protocol as a typed outcome, and
completed staged side-by-side activation.

A separate Connect-Node probe passed unary and server-streaming calls directly
over an HTTP/1.1 Unix socket using public `socketPath` configuration and no custom
transport. The built-in HTTP/2 client path does not expose `socketPath`.

This evidence makes Connect HTTP/1.1 over UDS the leading macOS/Linux profile, but
does not resolve this decision. Windows named pipes, production bootstrap
authority, credential rotation, renderer isolation, service-manager packaging,
and the exact protected-loopback fallback still require conformance.

A later security-rotation spike restarted a local Host and proved that Host
identity, boot identity, endpoint, and credential rotate together. The previous
credential was rejected, while the stable locator contained no credential and
owner-only state exposed none through argv or logs. This confirms the protected
discovery contract independently of the final Windows/loopback substrate.

The retained `Credential and cursor rotation` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

## Resolution

Open.
