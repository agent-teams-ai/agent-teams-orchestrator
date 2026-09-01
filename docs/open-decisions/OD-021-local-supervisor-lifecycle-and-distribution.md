---
id: OD-021
type: open-decision
status: open
owner: platform/local-host
summary: Specify the exact local supervisor state machine, distribution, compatibility, activation, and recovery policy.
related:
  - ADR-0030
  - ADR-0035
  - ADR-0058
  - ADR-0060
  - ADR-0064
  - architecture.local-host-lifecycle
  - OD-001
  - OD-003
  - OD-009
---

# OD-021: Local Supervisor Lifecycle and Distribution

## Decision required

Define the implementation-level lifecycle and distribution contract beneath
ADR-0060, ADR-0064, ADR-0035, and ADR-0058 without changing their ownership
boundaries.

## Constraints

- one compatible active Host per local target;
- no business behavior or provider-process ownership in the Supervisor;
- zero-touch default use with explicit foreground and ephemeral modes;
- staged side-by-side installs, never in-place replacement of active components;
- safe concurrency across CLI, Desktop, updater, and OS service-manager triggers;
- recovery from partial install, crash loop, stale locator, failed activation,
  NATS store failure, and interrupted migration;
- macOS, Linux, and Windows support with one behavioral contract;
- no secret in argv, project configuration, renderer IPC, or shared plaintext
  files;
- no automatic downgrade across an irreversible storage migration;
- no silent target fallback or adoption of an unknown process.

## Decisions to make

1. Supervisor and local-target cardinality across OS user, installation channel,
   product version, and data root.
2. Exact lifecycle states, transition lock, generation model, and crash-loop
   thresholds.
3. launchd, systemd user service, and Windows Service or Task Scheduler adapters,
   including a portable fallback.
4. Stable locator record, protected bootstrap channel, rotating Host endpoint, and
   credential rotation.
5. Side-by-side component layout, signature or integrity verification, activation
   pointer, rollback, garbage collection, and interrupted-update recovery.
6. Supervisor/Host/CLI/SDK compatibility matrix and typed incompatible-client
   behavior.
7. Drain deadlines, forced-stop authority, and behavior when AR or JetStream is
   unavailable.
8. Storage migration compatibility, backup, rollback limits, and forward-recovery
   policy.
9. Bundled NATS implementation beneath ADR-0035: compatibility matrix, disk
   thresholds, backup schedule, corruption classification, and recovery
   coordination with OD-009.
10. Bundled Centrifugo implementation beneath ADR-0058: exact platform binaries,
    nested signing and notarization, endpoint and credential rotation, memory
    limits, crash-loop policy, staged update, Windows/Linux lifecycle, and the
    retention, coalescing, retry horizon, and garbage collection of durable
    realtime-publication work after a long edge outage.
11. Whether the Supervisor uses the repository's Node runtime or a smaller native
    implementation after a measured packaging and reliability spike.

## Decision evidence

The 2026-07-25 Supervisor substrate spike proved concurrent first-run convergence,
direct Host discovery, protected locators, rotating Host identity, stale endpoint
rejection, staged v1-to-v2 activation, and bounded crash-loop degradation on
macOS and Linux with both UDS and loopback Host endpoints.

Node 24.18.0 and 24.16.0 expose no standard-library advisory file-lock API.
Platform-native macOS `lockf` and Linux `flock` rejected concurrent contenders and
released ownership after `SIGKILL`. An atomic directory remains useful for short
bootstrap election, but it is not sufficient proof of lifetime ownership because
a crash leaves stale state.

The implementation decision must therefore distinguish:

- short first-run bootstrap election;
- Supervisor process lifetime ownership;
- component-specific store lifetime locks.

The same primitive need not implement all three. The selected platform adapters
must release authority on process death and pass one cross-platform conformance
suite. Windows and portable-fallback behavior remain unproven.

Crash accounting is version and activation aware. A successfully activated new
component generation starts a new immediate crash window, while historical
incidents remain available for diagnostics and rollback policy.

A second adversarial spike passed 42/42 checks across macOS 15.6 and Ubuntu
Linux 6.8. It killed the activation model after every stage, raced two updaters,
recovered stale bootstrap state, preserved independent Supervisor and store
lifetime locks, rejected corrupt locators, foreign endpoints, symlink
substitution, and unsafe permissions, and verified rollback plus stale-credential
rejection.

The evidence selects these POSIX constraints:

- stage and attest a candidate at a unique endpoint before visibility;
- use atomic locator replacement with file and parent-directory `fsync`;
- keep the previous Host for a bounded post-pivot rollback window;
- never grant mutation authority to an unselected candidate;
- use a short private runtime root for Unix-domain sockets;
- treat PID and owner records as diagnostics, never lock authority;
- expose typed recovery outcomes instead of raw filesystem or socket errors.

The locator swap is the visibility pivot but not an unconditional point of no
return. If the selected candidate fails while the previous Host remains available,
recovery may atomically restore the previous generation. Once the previous Host is
stopped, recovery repairs or restarts the selected generation and cannot claim a
rollback target that no longer exists.

The locator does not fence existing client connections. The implementation state
machine must quiesce the previous Host before the candidate accepts mutations and
prove that rollback fences the failed candidate before re-enabling the previous
generation. The exact Host-generation authority handshake remains part of this
open decision.

The retained `Adversarial Supervisor activation` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
Windows locking and Named Pipes, packaging and signing, service-manager adapters,
and power-loss/filesystem fault injection remain unproven.

A four-run JetStream store-resilience spike passed 56/56 scenarios on Linux with
NATS 2.14.3. It proved:

- a broker health response can remain green after physical corruption silently
  recovers only part of a stream;
- configured storage exhaustion and physical `ENOSPC` have different failure and
  recovery behavior;
- publication interrupted by process death has an ambiguous persisted outcome;
- publisher deduplication is bounded and never replaces the durable inbox;
- verified backup restore and adjacent patch rollback are viable;
- NATS itself does not prevent two standalone processes from opening one store.

The implementation must therefore treat process liveness, service readiness, and
store integrity as separate states; retain an independently durable expected
watermark or content manifest; hold an external store lifetime lock; reserve disk
headroom for recovery; and block dispatch until controlled restart and
reconciliation complete.

The retained `Local JetStream store resilience` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
Cross-platform filesystem behavior, power loss, long soak, exact thresholds,
backup destination and schedule, encryption, signing, and release compatibility
remain unresolved.

A macOS arm64 Centrifugo 6.9.1 spike proved loopback startup, JWT
authentication, disabled client publishing, reconnect, explicit
`recovered=false` after memory-engine restart, 100-client fanout, and clean
shutdown. Startup was approximately 155-165 ms and idle RSS approximately 38 MB.
The upstream binary had only an ad-hoc signature, so production Desktop packaging
must bundle, nested-sign, and notarize it. Windows, Linux, signed Electron
packaging, staged update, long soak, and hosted Redis-compatible multi-node
operation remain release gates. The complete evidence is in the
[Centrifugo Desktop spike](../research/centrifugo-desktop-spike-2026-07-28.md).

## Acceptance criteria

- executable state-machine specification with transition and ownership tests;
- concurrent-client, crash, update, rollback, and incompatible-version fixtures;
- one conformance suite for all OS lifecycle adapters;
- explicit threat model for discovery and lifecycle authority;
- deterministic target resolution and no project-controlled endpoint override;
- documented operator recovery for every terminal degraded state;
- no migration or activation step can create two lifecycle owners.

## Resolution

Open.
