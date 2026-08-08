---
id: ADR-0037
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: architecture/contracts
summary: Begin every contract surface with one v1 schema family and prohibit speculative parallel versions.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0016
  - ADR-0017
  - architecture.public-control-contracts
  - architecture.sdk-transports
  - architecture.eventing
---

# ADR-0037: Single Initial Contract Version

## Context

Public control contracts, Published Languages, and integration events need explicit
version identity, but creating multiple versions before a real incompatibility
multiplies schemas, mappings, fixtures, SDK branches, retention rules, and agent
confusion without delivering compatibility value.

The system must preserve released and durably persisted contracts without turning
versioning into speculative architecture.

## Decision

Every contract surface begins with one major schema family, `v1`. No `v2` schema,
directory, producer, adapter branch, or SDK model is created in anticipation of a
future breaking change.

Before the v1 compatibility baseline is released, and before a durable event of
that schema has entered a supported replay horizon, the team may refine v1 in
place with explicit review and regenerated fixtures. This is initial contract
design, not support for parallel versions.

After release or durable publication:

- compatible additive evolution remains in v1;
- published fields and meanings follow the accepted compatibility policy;
- an incompatible semantic change requires an explicit migration decision before
  a new major schema family exists;
- producers emit one current accepted major version;
- temporary multi-version readers, upcasters, or translation adapters exist only
  for a documented migration and support horizon;
- historical schemas required for replay remain available without becoming
  alternative write models.

SDK SemVer, Protobuf package version, integration-event schema version, and AR
Published Language version remain distinct compatibility surfaces. A new SDK
release or internal refactor does not create a new contract major version.

Version suffixes required for wire identity, such as a Protobuf `v1` package or an
integration-event `schemaVersion`, remain present from the start. The rule
prohibits parallel speculative versions, not explicit version identity.

## Consequences

- Initial implementation and agent navigation have one canonical contract model.
- Compatibility work begins only when an actual published boundary requires it.
- Durable replay can retain old schema readers without allowing multiple active
  producer models.
- A future incompatible change needs a migration ADR, fixtures, support window,
  and retirement plan.

## Rejected alternatives

- Create v1 and v2 folders before the first public release.
- Remove all version identity until the first breaking change.
- Couple SDK package releases to wire-schema major versions.
- Keep multiple producer versions active indefinitely.
