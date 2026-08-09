---
id: ADR-0056
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: engineering/tooling
summary: Use Oxlint as the sole lint runtime with separate fast, type-aware, and advisory quality lanes.
approved_by: product-owner
accepted_at: 2026-07-27
related:
  - ADR-0031
  - ADR-0032
  - ADR-0041
  - architecture.repository-tooling
---

# ADR-0056: Oxlint-First Quality Gates

## Context

The repository needs fast feedback that coding agents can run after every focused
change, plus type-aware checks strong enough to catch abandoned promises, unsafe
values, and invalid asynchronous control flow. Running overlapping Oxlint and
ESLint stacks would duplicate diagnostics, configuration, dependency updates, and
CI time.

Enabling every available category as blocking would also be harmful. Pedantic and
stylistic rules can produce large low-signal migrations, while framework plugins
are meaningless before a package owns that framework.

## Decision

Oxlint is the only lint runtime. Exact versions of Oxlint and
`oxlint-tsgolint` are pinned in the default pnpm catalog. TypeScript 7 remains the
separate authoritative type-checker; Oxlint's experimental `--type-check` mode
does not replace it.

Three lanes have distinct responsibilities:

1. `lint:fast` blocks on correctness, suspicious code, import hygiene, promises,
   Node practices, Vitest correctness, selected Unicorn practices, and
   feature-layer boundaries.
2. `lint:type-aware` blocks on unsafe typed operations, abandoned or misused
   promises, exhaustive control flow, and deprecated typed APIs in production
   TypeScript package roots.
3. `lint:advisory` reports selected complexity and modernization candidates
   without blocking delivery.

`eslint-plugin-boundaries` executes through Oxlint's JavaScript-plugin bridge.
There is no ESLint runtime or ESLint configuration. React, JSX accessibility,
Next.js, Vue, Jest, or other capability-specific plugins are enabled only when a
materialized package uses that capability and positive and negative fixtures prove
the configuration.

Every blocking lane has executable valid and invalid fixtures. An unsupported
rule, parser panic, or silent configuration regression therefore fails CI rather
than creating false confidence.

## Consequences

- Agents get a quick blocking preflight and a deeper typed gate without two lint
  engines.
- New production packages enter the type-aware glob automatically.
- Existing tooling follows the same fast correctness baseline as product code.
- Advisory findings can be promoted only after evidence shows acceptable signal.
- A future ESLint runtime requires a new decision identifying a necessary rule
  that Oxlint and repository-specific structural checks cannot provide.

## Rejected alternatives

- Run ESLint and Oxlint together by default.
- Enable every plugin and every category as blocking.
- Use Oxlint's experimental type-check mode instead of the pinned TypeScript 7
  compiler.
- Keep architecture boundaries as documentation-only review guidance.
