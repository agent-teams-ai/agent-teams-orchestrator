---
id: ADR-0046
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: usage-capability
summary: Represent usage quantities and money with native BigInt, context-owned exact value objects, and lossless persistence mappings.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0045
  - ADR-0049
  - architecture.persistence
  - research.exact-values-spike-2026-07-26
  - OD-024
---

# ADR-0046: Exact Usage and Money Values

## Context

JavaScript `number`, SQLite `REAL`, and JSON numeric values cannot represent all
token counts, decimal rates, and monetary amounts exactly. Provider rates use
different scales, and accounting corrections must reproduce the original result
under a recorded rounding policy.

An executable spike exercised native BigInt, `decimal.js@10.6.0`, the BigInt entry
of `dinero.js@2.0.2`, SQLite 3.53.2 through `node:sqlite`, and PostgreSQL 15.13
through `pg@8.22.0`. Both runs passed all assertions. The spike also demonstrated
SQLite integer-sum overflow and precision loss when PostgreSQL exact integers are
embedded as JSON numbers and parsed by JavaScript.

## Decision

- Whole authoritative counts and integer coefficients use native `bigint` inside
  context-owned domain value objects.
- General exact quantities carry a coefficient or canonical decimal value, scale,
  unit, and semantic basis. Money additionally carries currency. A unit price also
  carries its denominator quantity and rate-card version.
- `decimal.js` is the selected exact decimal arithmetic engine for parsing,
  multiplication, division, scale conversion, and explicit rounding.
- The BigInt entry of `dinero.js` is the selected money arithmetic engine for
  currency-safe operations, scale, allocation, and rounding.
- Exact constructors accept canonical strings or BigInt-derived coefficients,
  never JavaScript number input. Each context uses a private immutable decimal
  configuration with declared precision and rounding; mutable process-global
  Decimal configuration is prohibited.
- Library objects never cross a domain boundary. Every bounded context owns its
  own semantic value objects and maps them to canonical primitives in Published
  Languages, persistence records, and tests.
- Do not introduce a shared domain `Money`, `UsageQuantity`, or `ExactDecimal`
  package initially. The same pinned arithmetic libraries may back context-local
  value objects. A future narrow shared kernel requires a separate ADR and exact
  allowlist after stable duplication is proven.
- Wire and JSON representations use canonical decimal strings plus explicit scale,
  unit, basis, and currency fields as required. BigInt is never serialized as a
  JSON number.
- PostgreSQL adapters use `bigint` and bounded `numeric(precision, scale)` and keep
  driver values as strings until context mapping. Exact database values embedded
  in JSON are explicitly cast to text.
- SQLite adapters use `INTEGER` only for values proven to fit signed 64-bit range
  and enable BigInt reads before consuming a row. Wider coefficients and exact
  decimals use canonical text or coefficient-plus-scale columns. `REAL` is
  prohibited for authoritative values.
- Every aggregation has an explicit range or overflow strategy. SQLite integer
  `sum()` is allowed only when the projection proves a safe bound; otherwise the
  adapter uses checked BigInt or decimal aggregation.
- Rounding occurs only at a named business boundary and records the rounding mode,
  target scale, algorithm version, and originating meter/rate versions.

The evaluated versions are the baseline for the first Usage implementation. They
are added to the strict pnpm catalog only when that implementation materializes,
then remain pinned and covered by arithmetic and persistence conformance tests.

## Consequences

- Counts, rates, allocations, and money round-trip without binary floating-point
  loss across local and hosted profiles.
- Domain types remain meaningful and independent from libraries, SQL dialects,
  Drizzle, and public contracts.
- SQLite and PostgreSQL schemas differ physically but must pass one semantic
  conformance suite.
- Query builders and JSON projections require explicit exact-value codecs.
- Arithmetic is slower than native `number`, but the spike showed ample local
  headroom; production-scale throughput still requires representative benchmarks.

## Rejected alternatives

- JavaScript `number`, SQLite `REAL`, or JSON numbers for authoritative values.
- Store all money only in ISO minor units, which cannot represent arbitrary token
  rates and intermediate scales without loss.
- Let PostgreSQL `numeric`, Drizzle, Decimal, or Dinero types become domain or wire
  contracts.
- Implement decimal and money arithmetic from scratch.
- Create a global shared business-value package before cross-context semantics are
  proven identical.
