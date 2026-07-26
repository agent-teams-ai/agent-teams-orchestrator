---
id: research.ecmascript-temporal-engine-spike-2026-07-26
type: research
status: active
owner: architecture/domain
summary: Reproducible comparison of Temporal ponyfills for exact instants and calendar-period calculations on Node 24.
related:
  - ADR-0049
  - OD-025
---

# ECMAScript Temporal Engine Spike, 2026-07-26

## Question

Which Temporal implementation best supports exact instants, timezone-aware budget
periods, and a later migration to native Node Temporal while the runtime remains
on Node 24 LTS?

## Environment

- Node.js 24.18.0;
- Node.js 26.5.0 for the native parity run;
- `temporal-polyfill@1.0.1`;
- `@js-temporal/polyfill@0.5.1`;
- macOS arm64 host;
- native `globalThis.Temporal` was `undefined` on Node 24 and available on Node 26;
- ICU 78.3 on both runtimes;
- timezone data `2026a` on Node 24 and `2026b` on Node 26;
- packages installed into an isolated temporary directory.

The npm registry and project documentation were checked on 2026-07-26. Temporal
was Stage 4, native Node support began in Node 26, and Node 24 remained the accepted
project LTS baseline.

## Method

The same fixture function executed against both package exports without global
installation and against native Node 26 Temporal. It checked:

1. nanosecond RFC3339 parsing and exact epoch representation;
2. explicit half-even rounding to microseconds;
3. negative epoch conversion with mathematical floor semantics;
4. an America/New_York DST gap using compatible and reject policies;
5. an America/New_York DST fold using earlier and later policies;
6. a Europe/Kyiv month period across a daylight-saving transition;
7. JSON serialization;
8. 50,000 exact parse-and-add operations in three sequential runs.

Resolved package directory sizes were also measured. Dependency trees were read
from pnpm after exact-version installation.

## Results

All three implementations produced identical fixture output:

```text
exact nanoseconds       1785069296123456789
half-even microsecond   2026-07-26T12:34:56.123457Z
negative epoch nanos    -500
negative epoch micros   -1
DST gap compatible      2026-03-08T03:30:00-04:00[America/New_York]
DST gap reject          RangeError
DST fold earlier        2026-11-01T01:30:00-04:00[America/New_York]
DST fold later          2026-11-01T01:30:00-05:00[America/New_York]
Kyiv period start       2026-02-28T22:00:00Z
Kyiv period end         2026-03-31T21:00:00Z
Kyiv elapsed hours      743
```

The 50,000-operation timings in milliseconds were:

| Run | temporal-polyfill | @js-temporal/polyfill |
|---|---:|---:|
| 1 | 498.98 | 418.84 |
| 2 | 339.68 | 337.18 |
| 3 | 276.19 | 285.83 |

The warm results do not justify choosing either implementation on performance.
The resolved package directories measured approximately 1.1 MB for
`temporal-polyfill` and 2.9 MB for `@js-temporal/polyfill`, before treating shared
package-store storage as a deployment artifact.

Dependency trees were:

```text
temporal-polyfill
  -> temporal-spec
  -> temporal-utils

@js-temporal/polyfill
  -> jsbi
```

## Interpretation

`temporal-polyfill@1.0.1` is the stronger current candidate because it tracks the
June 2026 Stage 4 specification, is actively maintained, is smaller, exposes a
tree-shakeable non-global API, and matched the alternative on the tested exact-time
and DST semantics.

`@js-temporal/polyfill@0.5.1` remains credible but its release predates the final
Stage 4 specification and is larger. Proposal-champion provenance does not offset
specification lag for this project.

Native Node 26.5.0 matched both ponyfills on every fixture despite carrying newer
timezone data. This materially lowers migration risk but does not guarantee parity
for every historical timezone transition or future timezone-data update.

The domain must not wrap Temporal objects directly. `ExactInstant`,
`CalendarPeriod`, and related value objects retain canonical primitives. A narrow
engine performs parsing and timezone/calendar calculations. This makes
`temporal-polyfill` to native Temporal a conformance-tested implementation change.

## Limitations

- This was not the full Test262 suite.
- Node 26 was invoked as an isolated exact-version npm runtime, not adopted as the
  repository runtime baseline.
- The benchmark is a focused microbenchmark, not a product workload.
- Package size is not a bundled application-size measurement.
- ICU and timezone-database identity were not varied.
- Non-ISO calendars and historical timezone changes were not exhaustively tested.

OD-025 keeps the dependency decision open until the fixture is promoted into the
repository conformance suite, broader timezone evidence and package-policy checks
are complete, and the product owner approves the dependency.

## Sources

- [TC39 Temporal status and implementation table](https://github.com/tc39/proposal-temporal)
- [Stage 4 Temporal specification](https://tc39.es/proposal-temporal/)
- [temporal-polyfill repository and 1.0 documentation](https://github.com/fullcalendar/temporal-polyfill)
- [@js-temporal/polyfill repository](https://github.com/js-temporal/temporal-polyfill)
- [Node.js 26.0.0 release](https://nodejs.org/en/blog/release/v26.0.0)
