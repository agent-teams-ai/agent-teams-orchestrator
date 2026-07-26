---
id: ADR-0031
type: adr
status: accepted
owner: engineering/tooling
summary: Use native TypeScript 7 as the primary compiler while isolating legacy Compiler API tools.
related:
  - architecture.dependency-rules
  - OD-020
---

# ADR-0031: Native TypeScript 7 Primary Toolchain

## Context

The repository is expected to grow into many packages and feature slices.
TypeScript 7 provides substantially faster native type checking, but some
architecture tools still depend on the TypeScript 6 programmatic Compiler API.
Downgrading the whole repository for one tool would make a secondary checker
control the product compiler.

## Decision

Pin native TypeScript 7 as the repository's primary compiler and type-checker.
TypeScript project references, workspace package exports, and reproducible CI use
the repository-pinned version.

Tools that require the legacy JavaScript Compiler API may run only in an isolated
tooling workspace with an exact TypeScript 6 dependency when all of these
conditions hold:

- the tool is absent from production dependency graphs and artifacts;
- it reads source without compiling or rewriting product output;
- its configuration cannot change the primary compiler settings;
- a representative architecture-conformance corpus proves parser and resolver
  behavior;
- CI reports disagreements with the primary TypeScript 7 graph explicitly.

No incompatible tool may force a repository-wide TypeScript downgrade. SDK
consumer compatibility is tested separately against each declared supported
consumer toolchain and does not change the compiler used to build the repository.

The exact architecture-enforcement stack remains OD-020. This ADR does not accept
dependency-cruiser or another graph tool before its conformance gate passes.

## Consequences

- Fast type checking remains the default developer and CI path.
- Legacy analysis tools can be evaluated without contaminating product packages.
- The repository temporarily may carry two exact TypeScript versions in disjoint
  tooling dependency graphs.
- Tooling isolation and parser-conformance tests become mandatory.

## Rejected alternatives

- Keep the repository on TypeScript 6 until every optional tool supports
  TypeScript 7.
- Install incompatible Compiler API tools in the root dependency graph and ignore
  warnings or false positives.
- Treat global developer tooling as a reproducible CI toolchain.
