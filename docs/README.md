# Technical Documentation

This directory is the canonical architecture knowledge base for Agent Teams
Orchestrator.

## Reading order

1. [Architecture overview](architecture/overview.md)
2. [Full DDD modeling standard](domain/modeling-standard.md)
3. [Context map](architecture/context-map.md)
4. [Feature module standard](architecture/feature-module-standard.md)
5. [Dependency rules](architecture/dependency-rules.md)
6. [Persistence boundary](architecture/persistence-boundary.md)
7. [Runtime boundary](architecture/runtime-boundary.md)
8. [Eventing and reliability](architecture/eventing-and-reliability.md)
9. [SDK and transports](architecture/sdk-and-transports.md)
10. [Testing strategy](architecture/testing-strategy.md)
11. [Extension points](architecture/extension-points.md)
12. [Architecture decisions](decisions/README.md)
13. [Open decisions](open-decisions.md)
14. [Glossary](glossary.md)

## Document status

Each architecture document declares its status. An ADR records why a decision was
made and what it supersedes. Open questions belong in
`open-decisions.md`; they must not be silently resolved in implementation code.

Use the following status vocabulary:

- **Accepted**: authoritative and enforceable.
- **Proposed**: ready for review but not binding.
- **Exploratory**: research or a spike, not a commitment.
- **Superseded**: retained for history; replaced by another ADR.

## Source-of-truth hierarchy

1. Accepted ADRs
2. Architecture documents
3. Public context and feature contracts
4. Feature-local documentation
5. Code comments

When behavior and documentation disagree, determine whether the implementation
is a defect or the decision has changed. Do not update only one side.

## Documentation quality bar

Architecture documentation must:

- name the owner of every responsibility;
- distinguish accepted decisions from unresolved questions;
- define allowed and forbidden dependency directions;
- describe failure, retry, idempotency, recovery, and migration behavior;
- avoid references to one frontend as if it were the product;
- include consequences and tradeoffs, not only the chosen design;
- remain provider-neutral unless documenting an adapter.
