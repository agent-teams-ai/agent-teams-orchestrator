---
id: OD-039
type: open-decision
status: open
owner: architecture/reliability
summary: Define cryptographically verifiable deployment qualification evidence and its CI verification protocol.
blocked_by: []
related:
  - ADR-0090
  - ADR-0092
  - architecture.reliability
  - architecture.testing
---

# OD-039: Deployment Qualification Attestation

## Decision required

What signed artifact format, trusted issuer policy, required suite registry,
subject binding, source-revision provenance, revocation behavior, and offline
verification procedure must prove that a deployment profile or capability is
qualified?

## Why this remains open

File existence and an accepted ADR are not proof. A meaningful artifact must bind
the exact profile or capability, adapter set, source revision, required suites,
successful outcomes, environment, and trusted CI identity. The release and
attestation infrastructure needed to verify that evidence is not selected yet.

Until this decision is resolved and its verifier is blocking, the global
qualification framework remains `blocked`; no profile or capability may be
marked `qualified`.

## Constraints

- verification must fail closed and work in managed CI and supported self-hosted
  release verification;
- evidence must bind one exact catalog subject and source revision;
- repository content alone cannot impersonate a trusted CI issuer;
- revocation and supersession must not depend on mutable branch state.

## Options

- GitHub artifact attestations with an offline-verifiable exported bundle;
- Sigstore-compatible provenance with a pinned issuer and identity policy;
- a project-owned signing profile with independently protected release keys.

## Acceptance criteria

- a versioned qualification artifact schema;
- trusted issuer and signature-verification policy;
- required conformance-suite registry per subject;
- subject, adapter, source revision, environment, and result binding;
- replay, expiry, revocation, and supersession rules;
- positive and forged-artifact CI fixtures;
- an offline verification path for self-hosted release consumers.

## Resolution

Open. Resolution requires an accepted ADR plus a blocking verifier and forged
artifact fixtures.
