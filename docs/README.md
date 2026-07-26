---
id: docs.index
type: index
status: active
owner: architecture
summary: Canonical navigation and authority index for all technical documentation.
---

# Technical Documentation

This directory is the canonical architecture knowledge base for Agent Teams
Orchestrator.

## Reading order

1. [Documentation standard](standards/documentation.md)
2. [Architecture index](architecture/README.md)
3. [Architecture overview](architecture/overview.md)
4. [Local Host lifecycle](architecture/local-host-lifecycle.md)
5. [Domain documentation](domain/README.md)
6. [Full DDD modeling standard](domain/modeling-standard.md)
7. [Proposed bounded-context dossiers](domain/contexts/README.md)
8. [Architecture decisions](decisions/README.md)
9. [Open decisions](open-decisions/README.md)
10. [Research evidence](research/README.md)
11. [Glossary](glossary.md)

For client/API work, read [SDK and transports](architecture/sdk-and-transports.md)
and [Public control contracts](architecture/public-control-contracts.md) together.
For desktop extraction work, read
[Migration boundary](architecture/migration-boundary.md) before the runtime or
board-specific open decisions.

## Document status

Every document declares machine-validated metadata. An ADR records why a decision
was made and what it supersedes. Each open question has one file under
`open-decisions/`; it must not be silently resolved in implementation code.

The [documentation standard](standards/documentation.md) defines type-compatible
statuses, metadata, placement, ownership, and lifecycle rules.

## Authority model

Authority depends on the knowledge type: ADRs own rationale, architecture
documents own current cross-context rules, bounded-context dossiers own domain
language and invariants, machine-readable schemas own exact wire shape, and
runbooks own operations. See the
[authority matrix](standards/documentation.md#authority-by-knowledge-type).

When two artifacts of the same authority type disagree, resolve the conflict
explicitly. Do not update only one side.

## Documentation quality bar

Architecture documentation must:

- name the owner of every responsibility;
- distinguish accepted decisions from unresolved questions;
- define allowed and forbidden dependency directions;
- describe failure, retry, idempotency, recovery, and migration behavior;
- avoid references to one frontend as if it were the product;
- include consequences and tradeoffs, not only the chosen design;
- remain provider-neutral unless documenting an adapter.

## Quality gate

Run `pnpm docs:check` before committing documentation changes. CI applies the same
metadata, ID, navigation, link, anchor, Mermaid, and Markdown checks.
