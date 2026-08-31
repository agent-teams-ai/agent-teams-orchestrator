---
id: ADR-0099
type: adr
status: proposed
superseded_by: []
supersedes: []
owner: architecture/tooling
summary: Extend the Foundation scaffolding protocol with an immutable scoped recovery contract and transaction-aware Apply precedence.
related:
  - ADR-0081
  - ADR-0038
  - ADR-0059
  - architecture.repository-tooling
---

# ADR-0099: Foundation-Scoped Scaffolding Recovery

## Context

ADR-0081 establishes Foundation as the owner of package-scaffolding rendering,
filesystem transactions, and recovery. The Orchestrator adapter still needs to
resume an interrupted scaffolding transaction without copying Foundation's
journal schema or making a new Plan race with an unfinished mutation.

## Decision

Extend the ADR-0081 protocol through Foundation's public APIs only:

- pass an immutable scope containing `projectId`, canonical `configPath`,
  `targetCatalogPath`, and `compositionId` to scoped recovery;
- inspect Foundation's transaction-aware status only to give a pending
  scaffolding transaction precedence over a newly supplied Plan;
- let Foundation validate the scope against its stored transaction while holding
  its existing scaffolding lease and perform the mutation;
- keep the one-argument recovery API compatible for other consumers;
- fail closed for unrelated transaction kinds and expose no journal bytes,
  callbacks, or second recovery platform in the adapter.

The Orchestrator adapter remains responsible for catalog identity, topology,
and consumer policy. This is a contract extension to ADR-0081, not a mutation of
that accepted decision's immutable record.

## Consequences

- Recovery ownership is unambiguous and the adapter has no duplicate parser.
- Apply is deterministic when an interrupted scaffolding transaction exists.
- Foundation can evolve journal representation without a consumer migration.
- Scope validation remains bounded by the existing lease and cooperative-writer
  threat model; hostile same-user inode replacement is not claimed.

## Rejected alternatives

- Parse Foundation's journal in Orchestrator.
- Add a second consumer-owned recovery engine or callback protocol.
- Rewrite the accepted ADR-0081 record or expose journal bytes as public API.
