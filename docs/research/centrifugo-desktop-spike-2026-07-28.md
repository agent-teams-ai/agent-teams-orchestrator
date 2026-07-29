---
id: research.centrifugo-desktop-spike-2026-07-28
type: research
status: active
owner: clients/sdk
summary: Local macOS evidence for using Centrifugo as a bundled replaceable client realtime edge.
related:
  - ADR-0019
  - ADR-0033
  - ADR-0058
  - OD-021
---

# Centrifugo Desktop Spike, 2026-07-28

## Question

Can Centrifugo run automatically beside the local Orchestrator Host with
acceptable startup, resource use, authentication, reconnect, and fanout behavior
without becoming a durable source of truth?

## Environment

- Centrifugo 6.9.1 official macOS arm64 archive;
- macOS arm64;
- isolated temporary configuration and process directory;
- memory engine and loopback endpoint;
- JWT client authentication and server API authentication;
- `centrifuge@5.7.0`;
- `ws@8.18.3`.

The probe did not use a user project, production data, or the orchestrator
repository as runtime state.

Evidence fingerprints:

```text
Centrifugo archive
602521237afa74680aeb75ebc9fc6c1034a919dd1af20d80bf7d072a6fb1c492

207-line probe
5e1dd90805953c12f75da8e73246a9b8069da44533b578901af9a81aa33f2c04

package lock
62bce7f81be74b419cc8aca7a3565e5a7b03989e415225fd63b58935f1830f32

generated configuration
fce226e4f8c2f70677e19307bf68212171b3737883c1f89fb313cab35ab86519
```

## Scenarios and results

| Scenario | Result |
|---|---|
| Archive checksum and executable startup | Passed |
| Loopback bind and health readiness | Passed |
| JWT-authenticated subscription | Passed |
| Invalid API credential rejection | Passed with HTTP 401 |
| Direct client publication disabled | Passed |
| Server publication and client delivery | Passed |
| Forced process death and automatic client reconnect | Passed |
| Recovery after memory-engine restart | Correctly reported `recovered=false` |
| 100 clients x 100 publications | 10,000 fanout deliveries in about 65 ms |
| Graceful shutdown and process cleanup | Passed |

Measured local characteristics:

- cold readiness: approximately 155-165 ms;
- health response after readiness: approximately 7 ms;
- idle RSS: approximately 38 MB;
- RSS during the 100-client fanout probe: approximately 74 MB;
- release archive: approximately 21 MB;
- executable: approximately 62 MB.

These measurements are suitability evidence, not product SLOs or capacity
promises.

## Packaging finding

The downloaded upstream macOS executable had an ad-hoc signature and was rejected
by Gatekeeper assessment. This is a release-packaging constraint rather than a
runtime incompatibility.

The production path is:

```text
Desktop release
  -> bundled pinned platform binary
  -> checksum and provenance verification
  -> nested code signing
  -> notarization
  -> Local Supervisor activation
```

Downloading the sidecar on first launch is not an accepted default.

## Interpretation

The probe supports Centrifugo as a local realtime edge. It does not support using
memory history as durable replay: restart intentionally lost history and produced
`recovered=false`. The SDK must then reconcile from the authoritative durable
application feed through the Host.

The measured startup and memory costs are acceptable for the selected zero-touch
local composition, provided the Supervisor owns availability and the Host owns
all feed, token, channel, and authorization semantics.

## Limitations and release gates

- no notarized Electron application was built;
- Windows and Linux packaging and service lifecycle were not exercised;
- no Redis engine, multi-node, failover, or hosted soak test was performed;
- no long-duration slow-consumer or reconnect-storm soak was performed;
- no production signing identity or updater was used;
- measurements came from one development machine.

Before a production Desktop release, the nested signed and notarized macOS
package, Windows signing and service lifecycle, Linux packaging, update rollback,
and cross-platform Supervisor conformance must pass. Hosted readiness separately
requires Redis-compatible multi-node, reconnect-storm, tenant-isolation, and
capacity evidence.
