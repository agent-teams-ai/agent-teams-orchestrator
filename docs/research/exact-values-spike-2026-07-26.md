---
id: research.exact-values-spike-2026-07-26
type: research
status: active
owner: usage-capability
summary: Reproducible evidence for exact usage, decimal, money, SQLite, and PostgreSQL value handling.
related:
  - ADR-0046
  - architecture.persistence
  - OD-024
---

# Exact Values Spike, 2026-07-26

## Scope

The spike validated exact arithmetic and persistence mappings using isolated
synthetic state. It did not launch agents, access user projects, modify production
databases, or add dependencies to the orchestrator workspace.

The harness ran twice from a temporary pnpm project. A temporary PostgreSQL cluster
was created under `/tmp`, listened only on `127.0.0.1:55439`, and was stopped after
each run.

## Environment

- macOS arm64;
- Node 24.18.0;
- SQLite 3.53.2 through `node:sqlite`;
- PostgreSQL 15.13 Homebrew temporary cluster;
- `decimal.js` 10.6.0;
- `dinero.js` 2.0.2 BigInt entry;
- `pg` 8.22.0;
- pnpm 11.17.0.

## Assertions

- BigInt values above `Number.MAX_SAFE_INTEGER` remain exact.
- Canonical decimal parsing rejects exponent and non-canonical input.
- Decimal addition, rate multiplication, division, and half-even rounding are
  exact for selected boundary cases.
- Dinero BigInt money preserves currency, scale, multiplication, allocation, and
  half-even rounding; cross-currency addition is rejected.
- Two thousand and one positive, zero, and negative allocation cases preserve the
  original amount exactly.
- SQLite exact integers and coefficient-plus-scale values round-trip without loss.
- Reading a large SQLite integer without BigInt mode fails rather than silently
  rounding.
- SQLite strict integer columns reject fractional values, rollback works, and
  integer `sum()` reports overflow beyond signed 64-bit range.
- PostgreSQL `bigint` and `numeric` return lossless strings through node-postgres,
  and transaction rollback works.
- PostgreSQL exact integers embedded as JSON numbers lose precision after the
  default JavaScript JSON parse; explicit text casting preserves them.

## Results

| Operation | Run 1 | Run 2 |
|---|---:|---:|
| 50,000 Decimal rate calculations | 66.82 ms | 63.17 ms |
| 50,000 Dinero BigInt multiplications | 15.29 ms | 13.48 ms |
| SQLite transaction, 25,000 inserts, and sum | 11.49 ms | 10.51 ms |
| PostgreSQL generate and sum 25,000 rows | 3.40 ms | 3.31 ms |

These microbenchmarks prove basic feasibility only. They are not production
capacity targets and do not include Drizzle, indexes, concurrent writers, network
latency, projection updates, or real cardinality.

## High-impact findings

1. BigInt read mode is a correctness requirement for the SQLite adapter, not an
   optional optimization.
2. Exact PostgreSQL values must be cast to text before JSON construction or mapped
   outside JSON.
3. SQLite integer aggregates require a proven range or checked application-level
   aggregation.
4. Decimal and Dinero types can remain fully hidden behind context-owned value
   objects while preserving exact strings and BigInt coefficients.

## Evidence

- spike harness SHA-256:
  `99cc9dc5afe1aeac99697c7f8ff0bb9d2a5da4cd1169b977035b176fee6865f0`;
- temporary lockfile SHA-256:
  `c66a8c874c006c24d9f8ac4ca5434b7a83f52545ad29f8c2dbf61905ba9af6c2`;
- temporary package manifest SHA-256:
  `d709423900a1b23bf801155c9ecd1e0c81a5cb435d91222c5d65e3243a864679`.

The normative outcome is ADR-0046. This research report records evidence and does
not redefine the architecture decision.

## Limitations and next evidence

- PostgreSQL 15.13 was tested, not the eventual hosted production version.
- Drizzle RC codecs and migrations were not part of this arithmetic spike.
- SQLite disk persistence, crash recovery, WAL concurrency, and corruption belong
  to the platform persistence conformance suite.
- Provider fixtures, FX, tiered pricing, late corrections, period closing, and
  hard-quota races remain OD-024 work.
- Representative local and hosted workloads require later soak and concurrency
  benchmarks.
