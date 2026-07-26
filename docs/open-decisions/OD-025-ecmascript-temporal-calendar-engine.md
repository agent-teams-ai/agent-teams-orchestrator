---
id: OD-025
type: open-decision
status: open
owner: architecture/domain
summary: Select the initial ECMAScript Temporal calendar engine for Node 24 without confusing it with the Temporal.io workflow engine.
related:
  - ADR-0049
  - domain.modeling-standard
  - research.ecmascript-temporal-engine-spike-2026-07-26
---

# OD-025: ECMAScript Temporal Calendar Engine

## Accepted constraints

ADR-0049 owns the stable semantics:

- domain exact time is `ExactInstant` backed by epoch microseconds;
- calendar periods retain resolved boundaries and calculation evidence;
- JavaScript `Date` and Temporal implementation objects never become domain,
  persistence-record, Published Language, or SDK types;
- source ordering uses explicit sequence or revision semantics, not timestamps.

Temporal is Stage 4 and native in Node 26, but the repository runtime baseline is
Node 24 LTS and has no global Temporal implementation.

This decision concerns the ECMAScript Temporal date/time API. It is unrelated to
the Temporal.io workflow engine used by Run Orchestration.

## Evidence

The 2026-07-26 spike compared `temporal-polyfill@1.0.1` and
`@js-temporal/polyfill@0.5.1` on Node 24.18.0, then reran the same fixtures against
native Temporal on Node 26.5.0. All three produced identical results for exact
nanosecond parsing, microsecond rounding, negative epoch conversion, DST gap and
fold disambiguation, Europe/Kyiv month boundaries, and serialization. Node 24 used
timezone data `2026a`; Node 26 used `2026b`, so this parity is evidence for the
selected fixtures rather than proof that timezone-data upgrades are irrelevant.

Warm benchmark results were similar. `temporal-polyfill` was materially smaller,
tracks the June 2026 Stage 4 specification, avoids global installation, and is the
current preliminary recommendation. The detailed method and limitations are in
the linked research report.

## Options

### Pin temporal-polyfill initially

Use `temporal-polyfill@1.0.1` through a narrow internal calendar engine. Import it
as a ponyfill and never install `globalThis.Temporal`.

Advantages:

- current Stage 4 semantics and active maintenance;
- smaller package and no global mutation;
- same API shape as native Temporal for a later engine replacement.

Risks:

- TC39 currently lists the project as beta;
- concentrated maintainer ownership;
- runtime ICU and timezone data still affect calendar resolution.

### Pin @js-temporal/polyfill initially

Use `@js-temporal/polyfill@0.5.1` through the same internal boundary.

Advantages:

- created by proposal champions;
- long adoption history and Test262 tooling.

Risks:

- the current release predates the Stage 4 specification;
- larger package and JSBI dependency;
- its own documentation acknowledges historical specification lag.

### Move the runtime baseline to Node 26

Use native Temporal and avoid a polyfill.

Advantages:

- platform implementation and no application dependency;
- direct long-term target.

Risks:

- Node 26 is not the accepted LTS baseline yet;
- changing the runtime also affects SQLite, packaging, CI, and every dependency;
- it is disproportionate to the calendar capability alone.

Dependency-free `Date` plus handwritten timezone arithmetic is rejected. It loses
precision and would recreate DST, disambiguation, calendar, and serialization
rules already standardized by Temporal.

## Recommendation

Select pinned `temporal-polyfill@1.0.1` after the readiness gate passes. The
implementation boundary exposes only project-owned exact-time and calendar-period
operations. It must support a native Node 26 implementation under the same
conformance suite without changing callers.

The intended direction is:

```text
domain period rule and disambiguation policy
  -> application CalendarCalculationPort
  -> outbound ECMAScript Temporal adapter
  -> resolved ExactInstant boundaries plus calculation evidence
  -> aggregate decision
```

The domain owns the meaning of a budget or accounting period. The adapter owns
timezone/calendar resolution. It returns canonical primitives and an explicit
engine, algorithm, timezone-data, and disambiguation identity. It never returns a
Temporal object. A separate `ClockPort` supplies current time; calendar arithmetic
and current-time authority are not one capability.

The ponyfill is imported as a scoped module and never installed globally. The
first implementation should support only ISO-8601 calendar rules and named IANA
time zones unless a domain dossier proves a non-ISO requirement.

## Acceptance gate

- preserve the completed ponyfill/native Node 26 parity fixtures in the repository
  conformance suite;
- pin runtime ICU and record timezone-data identity in test evidence;
- cover DST gaps, folds, historical offset changes, negative epoch values, period
  boundaries, serialization, and explicit disambiguation;
- verify package integrity and dependency policy;
- record product-owner approval before adding the dependency to the catalog.

## Remaining questions

- whether v1 formally rejects every non-ISO calendar at the contract boundary;
- which timezone-data changes require period re-resolution versus a new future
  calculation version;
- the supported historical and future instant range for each owning context;
- package maintenance and security readiness at the first production release.

## Resolution

Open.
