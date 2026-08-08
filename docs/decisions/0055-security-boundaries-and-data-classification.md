---
id: ADR-0055
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/security
summary: Establish trust boundaries, feature-owned data classification, controlled egress, and executable security checks without a Security bounded context.
approved_by: product-owner
accepted_at: 2026-07-27
related:
  - ADR-0021
  - ADR-0028
  - architecture.security
  - OD-012
  - OD-014
  - OD-029
---

# ADR-0055: Security Boundaries and Data Classification

## Context

The orchestrator crosses local processes, browsers, hosted infrastructure,
runtime workers, brokers, databases, and external integrations. Security rules
kept only in prose or individual adapters would drift as feature and deployment
topology grows. A generic Security bounded context would be equally harmful
because it would absorb authorization and enforcement owned by established
domains and the external runtime.

Public contracts, events, feeds, blobs, and telemetry also need one deterministic
classification vocabulary before real payloads and retention histories exist.

## Decision

Maintain a dedicated security trust-boundary and data-flow view in LikeC4.
Security remains a cross-cutting architecture concern and a set of executable
fitness functions, not a bounded context.

Access Control owns product authorization facts. Owning application use cases
apply those decisions to their operations. `ar` owns runtime permissions,
sandbox and capability enforcement, private fences, and technical recovery.
Security architecture does not duplicate either model.

Every materialized public contract, integration event, feed, blob, and telemetry
surface owns a feature-local classification manifest conforming to the canonical
JSON Schema. Manifests declare classification, tenant scope, retention class,
redaction profile, export policy, user-content presence, and authority-evidence
presence. Context-level assembly may validate fragments without taking semantic
ownership.

Raw secrets remain inside secret adapters. Other layers carry only `SecretRef`.
Outbound HTTP crosses a controlled egress adapter. Untrusted content never becomes
a command without a typed authenticated command boundary.

Repository checks execute positive and negative security fixtures for tenant
substitution, workspace configuration, prompt authority confusion, SSRF, replay,
stale authority, credential leakage, and redaction.

Identity-provider selection, exact authentication mechanisms, legal retention
periods, erasure policy, legal holds, and OpenTelemetry topology remain open
decisions.

## Consequences

- Security-sensitive topology and data flows become visible and reviewable.
- Classification drift and high-risk authority mistakes fail deterministically.
- Feature ownership remains intact; no central security package absorbs domain
  behavior.
- `ar` enforcement remains independent from product authorization.
- Every new externally observable data surface pays a small manifest and fixture
  cost.
- Exact identity and retention implementations remain blocked until their open
  decisions are resolved.

## Rejected alternatives

- Create a Security bounded context. Security has no single language or lifecycle
  that should own Access Control, runtime enforcement, secret adapters, and
  feature data handling.
- Put all classification in one hand-maintained central catalog. It would become
  a cross-feature bottleneck and detach metadata from the owning contract.
- Treat local processes and localhost as trusted automatically. Process and
  network locality do not establish product authority.
- Let feature adapters perform arbitrary outbound HTTP. This would make SSRF and
  destination policy inconsistent and untestable.
