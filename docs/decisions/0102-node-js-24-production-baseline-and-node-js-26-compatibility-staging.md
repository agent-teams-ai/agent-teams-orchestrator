---
id: ADR-0102
type: adr
status: proposed
owner: platform/persistence
summary: Keep Node.js 24 as the production baseline while Node.js 26 compatibility requires strict published-dependency qualification.
related:
  - ADR-0025
  - architecture.persistence
  - architecture.repository-tooling
---

# ADR-0102: Node.js 24 production baseline and Node.js 26 compatibility staging

## Context

ADR-0025 selected Node.js 24 LTS and the enforced `>=24.18.0 <25` range for
the persistence baseline. The repository's Node.js 26 draft compatibility work
cannot widen that claim yet: the frozen lockfile contains five reachable,
published `@agent-teams` packages whose declared Node engine is still
`>=24.18.0 <25`: `docs-protocol-agent-teams@0.2.8`,
`docs-protocol@0.6.0`, `document-authoring@0.3.0`,
`engineering-foundation@1.3.3`, and `repository-mutation@0.2.0`.
An install that ignores those engine declarations cannot establish support.

The Node.js 26 CI lane is therefore a compatibility qualification attempt, not
a production runtime cutover. The existing Node.js 24 pin and package engines
remain the current production contract. This successor records the staged
qualification path while leaving ADR-0025's persistence and command-lane
decisions intact; it does not rewrite that accepted record.

## Decision

Keep Node.js 24 LTS as the production default, with `>=24.18.0 <25` in the root
and Local Host Control package engines. The repository's `.node-version` and
normal CI lane continue to use Node.js 24.

Keep a separate Node.js 26 compatibility lane on the exact selected Node.js
26.10.0 toolchain. It must run a frozen pnpm install with engine strictness
enabled before `pnpm check`. A failed strict install is a failed qualification;
the lane may remain red while upstream support is unpublished. Do not bypass
engine strictness, rewrite published engine ranges, or substitute unpublished
local packages for this evidence.

To qualify a candidate engine widening, first obtain exact published upstream
package versions that declare Node.js 26 support and review their provenance
and compatibility. In the candidate review checkout, update the lockfile with
those versions and integrity records and widen the candidate package engines.
Prove a clean, strict frozen install and the complete repository gate under
Node.js 26, while retaining Node.js 24 gate evidence and relevant Local Host
Control platform checks. Only then may the widened engines be advertised as
supported. A production cutover requires its own explicit product-owner
decision and updated current architecture documentation.

## Consequences

- The root and Local Host Control engines remain truthful about the supported
  production runtime.
- A red Node.js 26 draft lane exposes unresolved upstream compatibility instead
  of producing a false positive.
- Node.js 26 adoption waits for published dependency support and a clean full
  qualification; no production cutover is claimed by this proposal.

## Rejected alternatives

- Widen the root or Local Host Control engine range before the locked published
  dependencies support Node.js 26. This would advertise an install path that
  fails under strict engine resolution.
- Disable strict engine checks in the compatibility lane. This would allow a
  green result despite incompatible published dependency declarations.
- Upgrade to unpublished local dependency builds. This would not qualify the
  reproducible registry-backed production install.
