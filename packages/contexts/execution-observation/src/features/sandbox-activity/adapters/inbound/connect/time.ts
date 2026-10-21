import { create } from '@bufbuild/protobuf';
import { TimestampSchema } from '@bufbuild/protobuf/wkt';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import { Code, ConnectError } from '@connectrpc/connect';

export function timestampToMicros(timestamp: Timestamp | undefined): string {
  if (timestamp === undefined || timestamp.seconds < -62_135_596_800n || timestamp.seconds > 253_402_300_799n || !Number.isInteger(timestamp.nanos) || timestamp.nanos < 0 ||
    timestamp.nanos > 999_999_999 || timestamp.nanos % 1000 !== 0) {
    throw new ConnectError('INVALID_ARGUMENT', Code.InvalidArgument);
  }
  return String(timestamp.seconds * 1_000_000n + BigInt(timestamp.nanos / 1000));
}

export function microsToTimestamp(value: string): Timestamp {
  if (!/^(?:0|-?[1-9][0-9]*)$/.test(value)) {
    throw new ConnectError('UNAVAILABLE', Code.Unavailable);
  }
  const micros = BigInt(value);
  const seconds = micros >= 0n ? micros / 1_000_000n : (micros - 999_999n) / 1_000_000n;
  if (seconds < -62_135_596_800n || seconds > 253_402_300_799n) { throw new ConnectError('UNAVAILABLE', Code.Unavailable); }
  return create(TimestampSchema, { seconds, nanos: Number((micros - seconds * 1_000_000n) * 1000n) });
}
