---
id: ADR-0020
type: adr
status: accepted
owner: platform/control-api
summary: Use typed business commands and field-mask updates guarded by opaque ETags.
related:
  - ADR-0005
  - ADR-0016
  - OD-016
  - OD-019
---

# ADR-0020: Typed Updates and ETags

## Context

A generic patch format would let transport vocabulary leak into domain behavior.
Full resource replacement makes additive evolution unsafe because an older client
can erase newer fields it does not know. Omitting concurrency preconditions also
creates lost updates.

## Decision

Business state transitions use explicit typed commands such as assign, cancel,
approve, complete, or retry. They are not modeled as generic resource patches.

A general update method is allowed only for genuinely editable metadata or
configuration. It uses:

- a typed resource or patch message;
- `google.protobuf.FieldMask` relative to that resource;
- an opaque public `etag` representing the observed resource version.

The ETag is an outer contract token, not an exposed aggregate revision or database
version. An update with an ETag succeeds only against the matching current state.
Stale state returns a stable concurrency-conflict outcome and is never retried
automatically by the SDK.

Omitted fields are unchanged. A field included in the mask is set to the supplied
value, including its allowed default. If clear has distinct business meaning that
cannot be represented unambiguously, the contract uses an explicit union or
dedicated clear command.

Public v1 does not expose JSON Patch, arbitrary merge patch, or full-replacement
updates. Invalid masks fail before domain mutation. Output-only and immutable
fields cannot be changed through a mask.

## Consequences

- Domain transitions remain explicit and auditable.
- New resource fields do not make old clients destructive.
- Clients must retain and submit ETags for protected updates.
- Adapters map public masks and ETags into application-specific update intent and
  concurrency facts.
- More commands exist than in a generic CRUD surface, matching the domain model.

## Rejected alternatives

- JSON Patch as the universal mutation API.
- Full resource replacement with `PUT` semantics.
- Expose numeric aggregate revisions as public concurrency tokens.
- Automatically retry stale writes.

## Evidence

- [Google AIP-134: Standard update methods](https://google.aip.dev/134)
- [Google AIP-161: Field masks](https://google.aip.dev/161)
