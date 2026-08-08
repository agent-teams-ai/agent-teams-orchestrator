---
id: ADR-0022
type: adr
status: superseded
supersedes: []
owner: apps/desktop-sidecar
summary: Make the host composition the sole owner of sidecar supervision and local trust bootstrap.
related:
  - ADR-0015
  - ADR-0021
  - OD-001
superseded_by:
  - ADR-0033
---

# ADR-0022: Host-Owned Sidecar Supervision

## Context

Desktop use must start the orchestrator automatically, but placing process
supervision inside the general SDK would create multiple lifecycle owners,
surprising shutdown behavior, and Node.js dependencies in browser clients.

Local endpoints also need protection against another local process, stale sockets,
PID reuse, and renderer compromise.

## Decision

The Desktop Main process or another explicit host composition owns one
`SidecarSupervisor`. The ordinary SDK only connects. Closing an SDK client releases
its connections and iterators but never stops the sidecar.

The supervisor:

- launches a verified absolute executable path;
- creates a unique instance and boot identity;
- creates an ephemeral local endpoint;
- establishes an ephemeral high-entropy bootstrap capability through inherited
  protected IPC rather than command-line arguments, environment variables, or a
  shared plaintext file;
- waits for authenticated readiness and protocol-capability handshake;
- owns graceful shutdown and may terminate only the matching instance it started;
- handles parent loss, partial startup, stale endpoint detection, and bounded
  restart policy.

PID is diagnostic metadata, not process identity. A stale endpoint is removed only
after ownership and liveness checks; a foreign live endpoint is never killed or
reused.

Normal client and supervisor shutdown capabilities are distinct. Multiple SDK
clients may share a sidecar, but client reference counts do not own its lifetime.

The Electron renderer never receives the sidecar endpoint, bootstrap capability,
or process controls. It uses a narrow, validated Electron IPC bridge. The exact
platform binding remains in OD-001, with these constraints:

- Unix sockets live in an owner-only runtime directory with owner-only socket
  permissions;
- Windows named pipes require an explicit current-user access control list;
- if the selected Node.js stack cannot enforce that ACL, loopback
  `127.0.0.1` with an ephemeral port and bootstrap capability is the fallback;
- wildcard and externally reachable binds are prohibited.

## Consequences

- Desktop startup remains automatic for the user.
- SDK cleanup cannot accidentally terminate shared durable work.
- Browser packages remain free of process-management code.
- Local supervision requires a security-focused platform adapter and failure
  tests.
- A future per-user daemon needs a separate lifecycle ADR.

## Rejected alternatives

- Let every SDK client spawn and stop its own sidecar.
- Use a global endpoint and PID file as identity.
- Pass the bootstrap secret through argv, inherited environment, or renderer IPC.
- Bind the local control server to an externally reachable interface.

## Evidence

- [Electron security recommendations](https://www.electronjs.org/docs/latest/tutorial/security)
- [Node.js IPC support](https://nodejs.org/api/net.html#ipc-support)
- [Windows named-pipe security](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)
