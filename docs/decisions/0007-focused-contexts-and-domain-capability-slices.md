# ADR-0007: Focused Contexts and Domain-Capability Slices

Status: **Accepted**

Supersedes ADR-0002.

## Context

The orchestrator is expected to become a large domain. Broad layer-first modules
would mix unrelated models, while treating every feature as a mini bounded context
would fragment one Ubiquitous Language into ports, DTOs, and mappings.

## Decision

Use a focused Full DDD target of eight to ten business bounded contexts. Exact
context boundaries remain proposed until domain discovery validates them.

Each accepted bounded context becomes a workspace package. Inside it,
domain-capability feature slices own cohesive aggregate clusters and use cases.
Features in one context may collaborate through explicit context-internal APIs and
a directed dependency graph.

Published Language, ACLs, and versioned integration events are mandatory across
bounded contexts, not between every pair of internal features.

## Consequences

- Bounded contexts remain the strongest semantic and physical boundary.
- Features retain vertical ownership without becoming accidental microservices.
- Aggregate mutation still has one owner.
- Internal module cycles require redesign rather than broad barrel exports.
- Exact packages are not scaffolded before context acceptance.
- Mapping duplication across contexts is allowed when meanings differ.

## Rejected alternatives

- One broad Collaboration context for all team, task, run, and message behavior.
- One package or bounded context per endpoint or use case.
- Ports and Published Language between every feature in one bounded context.
