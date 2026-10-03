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
the persistence baseline. When this proposal was drafted, the frozen lockfile
contained five reachable, published `@agent-teams` packages whose declared Node
engine was still `>=24.18.0 <25`: `docs-protocol-agent-teams@0.2.8`,
`docs-protocol@0.6.0`, `document-authoring@0.3.0`,
`engineering-foundation@1.3.3`, and `repository-mutation@0.2.0`.
An install that ignores those engine declarations cannot establish support.

The integration with current main pins published packages whose engines admit Node.js
26: `docs-protocol-agent-teams@0.3.2`, `docs-protocol@0.6.2`,
`document-authoring@0.3.2`, `engineering-foundation@1.7.2`, and
`repository-mutation@0.2.2`. The root tooling lower bound is now Node.js
24.21.0; the Local Host Control package retains its staged engine range.

The earlier candidate `dc76b6f09bed96c95ff8d9c004072c089125116f`
recorded hosted Node.js 24.21 and 26.10 strict frozen installs,
`pnpm check:fast`, and GitHub Node.js 26 and architecture job passes with
adapter 0.2.13 and Foundation 1.7.0. Those results remain historical evidence
for those inputs and do not qualify the current integration.

Current main already carries the controller-generated stable31 generation-2
profile, state and caller. The former stable24 coordinate mismatch is historical.
Installed qualification, required CI on the integrated source, and observed
admission remain pending. Node.js 26 engine admission does not qualify managed
Docs execution there; managed operations retain the Node.js 24 default.

The Node.js 26 CI lane remains a compatibility qualification attempt, not a
production runtime cutover. The existing Node.js 24 pin remains the production
default. This successor records the staged qualification path while leaving
ADR-0025's persistence and command-lane decisions intact; it does not rewrite
that accepted record.

## Decision

Keep Node.js 24 LTS as the production default. The candidate root and Local Host
Control package engines admit both Node.js 24 and 26; the repository's
`.node-version` and normal CI lane continue to use Node.js 24.

Keep a separate Node.js 26 compatibility lane on the exact selected Node.js
26.10.0 toolchain. It must run a frozen pnpm install with engine strictness
enabled before `pnpm check`. A failed strict install is a failed qualification.
Do not bypass engine strictness, rewrite published engine ranges, or substitute
unpublished local packages for this evidence.

Candidate engine widening requires exact published upstream package versions
that declare Node.js 26 support, reviewed provenance and compatibility, and
lockfile integrity records. A clean, strict frozen install and the complete
repository gate must pass under Node.js 26, with Node.js 24 gate evidence and
relevant Local Host Control platform checks retained. The current integration has
the published dependency selection noted above, but still requires fresh
qualification and the separate managed Docs admission evidence. A production cutover requires its own explicit
product-owner decision and updated current architecture documentation.

## Consequences

- The root and Local Host Control engines admit the staged compatibility
  candidate while Node.js 24 remains the production default.
- A red qualification gate exposes an unresolved compatibility or Cohort
  mismatch instead of producing a false positive.
- Node.js 26 production adoption still requires complete qualification and an
  explicit cutover decision; this proposal claims neither.

## Rejected alternatives

- Widen the root or Local Host Control engine range before the locked published
  dependencies support Node.js 26. This would advertise an install path that
  fails under strict engine resolution.
- Disable strict engine checks in the compatibility lane. This would allow a
  green result despite incompatible published dependency declarations.
- Upgrade to unpublished local dependency builds. This would not qualify the
  reproducible registry-backed production install.
