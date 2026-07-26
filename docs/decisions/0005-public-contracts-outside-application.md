---
id: ADR-0005
type: adr
status: accepted
owner: architecture/contracts
summary: Keep public transport and SDK contracts outside domain and application models.
---

# ADR-0005: Public Contracts Stay Outside Application and Domain

## Context

Feature ownership places public schemas beside the feature that defines them. That
physical ownership can be misread as permission for application use cases to
depend on SDK, transport, or integration-event DTOs.

Such a dependency would let external compatibility requirements shape internal use
case and domain models, violating Clean Architecture.

## Decision

Public command, query, event, snapshot, and error schemas are outer-boundary
contracts. Inbound adapters validate and map them into transport-independent
application input models. Outbound adapters map publication intent and application
results into public contracts.

Application and domain code do not import public contract or generated SDK types.

## Consequences

- Feature ownership and dependency direction are distinct concepts.
- API evolution does not force aggregate or use-case signatures to change.
- Adapters contain explicit mappings and compatibility behavior.
- Mapping code and contract tests add deliberate overhead.
- Architecture tests reject public-contract imports in application and domain.

## Rejected alternatives

- Reuse SDK DTOs as application commands.
- Generate domain entities from JSON Schema.
- Put public schemas in the shared kernel.
