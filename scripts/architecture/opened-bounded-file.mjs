import { constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import path from "node:path";

function isWithin(parent, candidate) {
  const relation = path.relative(parent, candidate);
  return (
    relation === "" ||
    (relation !== ".." &&
      !relation.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relation))
  );
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameSnapshot(left, right) {
  return (
    sameIdentity(left, right) &&
    left.size === right.size &&
    left.ctimeNs === right.ctimeNs &&
    left.mtimeNs === right.mtimeNs
  );
}

async function assertRootIdentity(rootPath, canonicalRoot, expectedIdentity) {
  const currentRoot = await realpath(rootPath);
  const currentIdentity = await stat(currentRoot, { bigint: true });
  if (
    currentRoot !== canonicalRoot ||
    !currentIdentity.isDirectory() ||
    !sameIdentity(currentIdentity, expectedIdentity)
  ) {
    throw new Error("bounded file authority root changed during inspection");
  }
}

async function assertPathIdentity(
  filePath,
  canonicalRoot,
  canonicalPath,
  expectedIdentity,
) {
  const [entry, currentPath] = await Promise.all([
    lstat(filePath, { bigint: true }),
    realpath(filePath),
  ]);
  if (
    entry.isSymbolicLink() ||
    !entry.isFile() ||
    currentPath !== canonicalPath ||
    !isWithin(canonicalRoot, currentPath)
  ) {
    throw new Error("bounded file path is not a safe regular-file authority");
  }
  const currentIdentity = await stat(currentPath, { bigint: true });
  if (!sameIdentity(currentIdentity, expectedIdentity)) {
    throw new Error("bounded file path changed identity during inspection");
  }
}

async function assertSafeRequestedAncestry(filePath, canonicalRoot) {
  const requestedPath = path.resolve(filePath);
  if (!isWithin(canonicalRoot, requestedPath)) {
    throw new Error("bounded file request is outside its authority root");
  }
  const segments = path
    .relative(canonicalRoot, path.dirname(requestedPath))
    .split(path.sep)
    .filter(Boolean);
  let current = canonicalRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    const entry = await lstat(current, { bigint: true });
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      throw new Error("bounded file request has unsafe authority ancestry");
    }
  }
}

async function readAtMost(handle, maximumBytes) {
  const buffer = Buffer.alloc(maximumBytes + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(
      buffer,
      total,
      buffer.length - total,
      total,
    );
    if (bytesRead === 0) {
      break;
    }
    total += bytesRead;
  }
  if (total > maximumBytes) {
    throw new Error("bounded file exceeds its operational byte budget");
  }
  return buffer.subarray(0, total);
}

function safeReadFlags() {
  return (
    constants.O_RDONLY |
    (constants.O_NOFOLLOW ?? 0) |
    (constants.O_NONBLOCK ?? 0)
  );
}

export const openedBoundedFileDescriptorCheckpoint = Symbol(
  "openedBoundedFileDescriptorCheckpoint",
);

export async function readOpenedBoundedFile(options) {
  const { expectedRootIdentity, filePath, maximumBytes, rootPath } = options;
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    throw new TypeError("maximumBytes must be a non-negative safe integer");
  }
  const canonicalRoot = await realpath(rootPath);
  const rootIdentity = await stat(canonicalRoot, { bigint: true });
  if (
    !rootIdentity.isDirectory() ||
    (expectedRootIdentity !== undefined &&
      !sameIdentity(rootIdentity, expectedRootIdentity))
  ) {
    throw new Error("bounded file authority root is not a directory");
  }
  await assertSafeRequestedAncestry(filePath, canonicalRoot);

  const handle = await open(filePath, safeReadFlags());
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size > BigInt(maximumBytes)) {
      throw new Error("bounded file must be a bounded regular file");
    }
    const descriptorCheckpoint =
      options[openedBoundedFileDescriptorCheckpoint];
    if (descriptorCheckpoint !== undefined) {
      if (typeof descriptorCheckpoint !== "function") {
        throw new TypeError("descriptor checkpoint must be a function");
      }
      await descriptorCheckpoint();
    }
    const canonicalPath = await realpath(filePath);
    if (!isWithin(canonicalRoot, canonicalPath)) {
      throw new Error("bounded file resolves outside its authority root");
    }
    await assertSafeRequestedAncestry(filePath, canonicalRoot);
    await assertPathIdentity(
      filePath,
      canonicalRoot,
      canonicalPath,
      before,
    );
    await assertRootIdentity(rootPath, canonicalRoot, rootIdentity);

    const source = await readAtMost(handle, maximumBytes);
    const after = await handle.stat({ bigint: true });
    if (!sameSnapshot(before, after)) {
      throw new Error("bounded file changed while it was being read");
    }
    await assertSafeRequestedAncestry(filePath, canonicalRoot);
    await assertPathIdentity(
      filePath,
      canonicalRoot,
      canonicalPath,
      after,
    );
    await assertRootIdentity(rootPath, canonicalRoot, rootIdentity);
    return source;
  } finally {
    await handle.close();
  }
}
