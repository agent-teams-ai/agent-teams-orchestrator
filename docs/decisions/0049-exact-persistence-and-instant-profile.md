---
id: ADR-0049
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/persistence
summary: Use one lossless exact-value and microsecond-instant mapping profile across SQLite, PostgreSQL, and wire contracts.
approved_by: product-owner
accepted_at: 2026-07-26
related:
  - ADR-0046
  - architecture.persistence
  - OD-024
  - OD-025
---

# ADR-0049: Exact Persistence and Instant Profile

## Context

ADR-0046 selected BigInt-backed exact value objects, decimal.js, Dinero, and
lossless adapter mappings, but deliberately left more than one physical mapping
available. Implementation needs one default profile so SQLite and PostgreSQL do
not drift and so generic PostgreSQL `numeric(precision, scale)` cannot perform an
unnamed rounding operation during insertion.

PostgreSQL timestamps preserve microseconds, while JavaScript `Date` and the
default node-postgres timestamp parser preserve only milliseconds. Provider
evidence may carry even finer precision.

## Decision

Authoritative value objects use canonical coefficient-and-scale semantics:

| Semantic value | SQLite | PostgreSQL | Application and wire |
|---|---|---|---|
| Bounded whole count | `INTEGER`, BigInt reads | `BIGINT`, string reads | BigInt-backed value, decimal string |
| Exact quantity | canonical coefficient `TEXT` plus `INTEGER` scale | coefficient `NUMERIC(P, 0)` plus `SMALLINT` scale | coefficient string, scale, unit, basis |
| Money | canonical coefficient `TEXT`, scale, currency | coefficient `NUMERIC(P, 0)`, scale, currency | coefficient string, scale, currency |
| Exact instant | signed `INTEGER` epoch microseconds | `TIMESTAMPTZ(6)` read and written as text | `ExactInstant`, fixed UTC RFC3339 microseconds |

`P` is selected from an explicit domain upper bound and tested overflow policy.
PostgreSQL `numeric` special values are rejected. A business type with a proven,
fixed scale may use `NUMERIC(P, S)` only through a later type-specific decision
that names the rounding and overflow behavior.

SQLite authoritative exact values never use `REAL` or `NUMERIC` affinity.
Exact coefficient text has canonical syntax and adapter validation. Statements
reading SQLite integers enable BigInt before consuming a result row.

`ExactInstant` stores epoch microseconds as BigInt in the domain. The adapter
preserves distinct `occurredAt`, `receivedAt`, `recordedAt`, and `effectiveAt`
semantics where the owning context uses them. Provider timestamps with finer
precision remain immutable raw evidence. Business ordering uses declared
sequence, cursor, revision, or fence semantics rather than timestamps.

Calendar periods store their resolved start and end instants. Their timezone,
calendar, disambiguation policy, and calculation-version evidence are retained so
historical boundaries are not silently recomputed after runtime timezone-data
changes.

JavaScript `Date`, Temporal implementation objects, Decimal, Dinero, Drizzle, and
driver values do not cross domain, application-model, Published Language, or SDK
boundaries. OD-025 owns the initial Temporal implementation choice for Node 24.

## Consequences

- Local and hosted profiles round-trip the same canonical values.
- PostgreSQL can index exact coefficients without becoming the owner of business
  rounding.
- Timestamp microseconds survive PostgreSQL and JSON boundaries.
- A future native Temporal migration changes an internal arithmetic engine, not
  domain or public contracts.

## Rejected alternatives

- JavaScript `number`, SQLite `REAL`, or JSON numbers for authoritative values.
- Generic `NUMERIC(P, S)` for values whose scale varies by meter or rate.
- JavaScript `Date` as the domain or persistence timestamp type.
- Timestamp-based business ordering without an explicit sequence contract.
