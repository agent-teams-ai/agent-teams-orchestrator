---
id: ADR-0017
type: adr
status: accepted
superseded_by: []
supersedes: []
owner: platform/control-api
summary: Constrain public Protobuf contracts to a predictable cross-language type and evolution profile.
related:
  - ADR-0016
  - OD-008
  - OD-016
  - OD-019
---

# ADR-0017: Cross-Language Protobuf Contract Profile

## Context

Protobuf code generation does not by itself make TypeScript, Go, Rust, binary, and
ProtoJSON clients behave identically. Field presence, 64-bit integers, enums,
timestamps, null values, maps, and open unions can otherwise acquire different
semantics in each client.

These choices become expensive to change after public v1 because they alter
generated source APIs as well as wire behavior.

## Decision

Public v1 uses `proto3`. Moving to Protobuf Editions requires a later compatibility
ADR and complete language-toolchain conformance.

The control contract profile is:

- resource identities, operation names, cursors, and external references are
  opaque strings, never filesystem paths, process IDs, or numeric database keys;
- scalar fields use `optional` only when absence has a distinct business meaning
  from the scalar default;
- `null` is not a normal business value; absence, an explicit `oneof`, a field
  mask, or a dedicated clear command represents the intended meaning;
- repeated fields and maps never distinguish absent from empty;
- tagged unions use `oneof`;
- every enum starts with a context-prefixed `*_UNSPECIFIED = 0`, remains open,
  and preserves unknown numeric values through an explicit SDK fallback;
- published v1 fields remain present and deprecated rather than being removed;
  removed field numbers, field names, enum numbers, and enum names are reserved
  only in a later breaking major;
- existing field names are not renamed because names are part of ProtoJSON
  compatibility;
- published service and method names, existing oneof names, and existing oneof
  membership are immutable within v1;
- `int32` and `uint32` are preferred for bounded counts and limits;
- `int64` and `uint64` are used only for values requiring exact 64-bit arithmetic,
  never for identity; official SDKs must not lose precision;
- absolute time uses `google.protobuf.Timestamp` in UTC with public precision
  bounded to milliseconds;
- elapsed time uses `google.protobuf.Duration` with field-specific bounds;
- `float` and `double` are not used for exact quantities;
- `bytes` is allowed only for explicitly bounded inline payloads; large logs,
  outputs, attachments, and artifacts use references;
- maps are not used where ordering, duplicate keys, or per-entry evolution matter;
- `google.protobuf.Struct` and `Value` are prohibited in public v1.

`google.protobuf.Any` is prohibited in feature messages. It is permitted only
inside an accepted standard operation envelope when the method declares a fixed,
allowlisted response and metadata type and every official SDK maps it to a typed
model.

Official binary clients tolerate unknown additive fields. ProtoJSON profiles use
numeric enum representation and ignore unknown additive fields only where doing so
cannot bypass validation or authorization. Unknown values are never silently
converted to `UNSPECIFIED`.

Unknown-field preservation may be relied on only for a direct binary Protobuf
parse and re-serialization path with preservation enabled. Mapping through
application, domain, or handwritten SDK models is not a transparent relay and
must not claim to retain unknown fields.

Additive request fields are wire compatible, but new request oneof variants or
new required behavior also require protocol-minor and capability negotiation.
Official SDKs reject an unsupported capability before sending it. New response
variants require an explicit SDK-level unknown fallback.

The handwritten SDKs may expose language-idiomatic representations, but a
language-neutral behavioral specification and golden fixtures define equivalent
meaning. TypeScript exposes exact 64-bit arithmetic as `bigint`, not `number`.

## Consequences

- Contract authors have a smaller but predictable type system.
- Additive evolution is safer across official languages.
- Some convenient dynamic JSON shapes require explicit typed messages.
- Public SDK mappers must preserve unknown enum values and numeric precision.
- Contract linting must enforce this profile in addition to Buf's standard rules.

## Rejected alternatives

- Allow every Protobuf type and rely on generated clients to converge.
- Use `Struct`, `Value`, or unbounded maps as generic extension points.
- Represent 64-bit values as JavaScript `number`.
- Treat `null`, missing, and default values as interchangeable without a
  contract-specific decision.

## Evidence

- [Protobuf field presence](https://protobuf.dev/programming-guides/field_presence/)
- [ProtoJSON mapping](https://protobuf.dev/programming-guides/json/)
- [Protobuf compatibility practices](https://protobuf.dev/best-practices/dos-donts/)
- [Google AIP-142: Time and duration](https://google.aip.dev/142)
- [Google AIP-149: Unset field values](https://google.aip.dev/149)
- The isolated protocol-evolution spike on 2026-07-25 passed 36/36 checks,
  including all 16 previous/current TypeScript/Go client-server combinations,
  binary unknown-field round trips across both languages, Buf `FILE` negative
  controls, unknown enum/detail handling, and capability-gated oneof evolution.
  The retained `Protocol evolution` fingerprint is in the
  [foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).
