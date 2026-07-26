---
id: architecture.index
type: index
status: active
owner: architecture
summary: Navigation index for system-wide architecture standards and boundaries.
---

# Architecture Documentation

This directory contains current, normative system-wide architecture. ADRs explain
why significant decisions were made; these documents describe the architecture
that contributors must implement now.

## System model

- [Architecture overview](overview.md)
- [Local Host lifecycle](local-host-lifecycle.md)
- [Strategic context map](context-map.md)
- [Evolution and quality attributes](evolution-quality-attributes.md)

## Structural standards

- [Dependency rules](dependency-rules.md)
- [Feature module standard](feature-module-standard.md)
- [Composition and dependency injection](composition-and-dependency-injection.md)
- [Repository tooling plan](repository-tooling.md)
- [Machine-readable package catalog](../../architecture/package-catalog.yaml)

## Integration and data boundaries

- [Runtime boundary](runtime-boundary.md)
- [Persistence boundary](persistence-boundary.md)
- [Eventing and reliability](eventing-and-reliability.md)
- [SDK and transports](sdk-and-transports.md)
- [Public control contracts](public-control-contracts.md)
- [Extension points](extension-points.md)
- [Migration boundary](migration-boundary.md)

## Quality

- [Testing strategy](testing-strategy.md)

## Placement rule

Add a document here only when it governs more than one bounded context or defines
a system boundary. Context-specific language, invariants, and models belong in the
owning [bounded-context dossier](../domain/contexts/README.md). Operational
procedures belong in `docs/operations/` when the first runbook is needed.

Do not create a second document for the same rule. Update the current architecture
document and add or supersede an ADR when the underlying decision changes.
