import assert from "node:assert/strict";
import { test } from "node:test";

import {
  epochMicroseconds,
  hostBootGeneration,
  hostProtocolRange,
  hostProtocolVersion,
  microseconds,
  targetId,
} from "@agent-teams/local-host-control";

const int64Magnitude = 1n << 63n;
const uint64Modulus = 1n << 64n;

test("rejects forged protocol range values at the JavaScript boundary", () => {
  const valid = hostProtocolVersion(2n);
  const invalidRanges = [
    [{ type: "Microseconds", value: 1n }, valid],
    [{ type: "HostProtocolVersion", value: 1 }, valid],
    [valid, { type: "EpochMicroseconds", value: 3n }],
    [valid, { type: "HostProtocolVersion", value: 0n }],
    [valid, { type: "HostProtocolVersion", value: uint64Modulus }],
  ];

  for (const rangeArguments of invalidRanges) {
    assert.throws(
      () => Reflect.apply(hostProtocolRange, undefined, rangeArguments),
      TypeError,
    );
  }

  assert.throws(
    () =>
      hostProtocolRange(
        {
          get type() {
            throw new Error("secret-protocol-accessor");
          },
        },
        valid,
      ),
    (error) =>
      error instanceof TypeError &&
      error.message ===
        "HostProtocolRange minimum must be a HostProtocolVersion",
  );
});

test("snapshots validated protocol range values", () => {
  const minimum = { type: "HostProtocolVersion", value: 1n };
  const range = Reflect.apply(hostProtocolRange, undefined, [
    minimum,
    hostProtocolVersion(2n),
  ]);

  minimum.value = 2n;

  assert.equal(range.minimum.value, 1n);
  assert.equal(Object.isFrozen(range.minimum), true);
});

test("rejects oversized text values", () => {
  assert.throws(() => targetId("x".repeat(161)), TypeError);
});

test("enforces signed and unsigned 64-bit exact-value bounds", () => {
  assert.equal(epochMicroseconds(-int64Magnitude).value, -int64Magnitude);
  assert.equal(
    epochMicroseconds(int64Magnitude - 1n).value,
    int64Magnitude - 1n,
  );
  assert.throws(() => epochMicroseconds(-int64Magnitude - 1n), TypeError);
  assert.throws(() => epochMicroseconds(int64Magnitude), TypeError);
  assert.throws(
    () => Reflect.apply(epochMicroseconds, undefined, [0]),
    TypeError,
  );

  const uint64Maximum = uint64Modulus - 1n;
  for (const createToken of [hostBootGeneration, microseconds]) {
    assert.equal(createToken(0n).value, 0n);
    assert.equal(createToken(uint64Maximum).value, uint64Maximum);
    assert.throws(() => createToken(-1n), TypeError);
    assert.throws(() => createToken(uint64Modulus), TypeError);
  }

  assert.equal(hostProtocolVersion(1n).value, 1n);
  assert.equal(hostProtocolVersion(uint64Maximum).value, uint64Maximum);
  assert.throws(() => hostProtocolVersion(0n), TypeError);
  assert.throws(() => hostProtocolVersion(uint64Modulus), TypeError);
});
