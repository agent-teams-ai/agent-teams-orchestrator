import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  openedBoundedFileDescriptorCheckpoint,
  readOpenedBoundedFile,
} from "./opened-bounded-file.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "opened-bounded-file-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const filePath = path.join(root, "authority.json");
  return { filePath, root };
}

function descriptorBarrier() {
  let release;
  let signalReady;
  const ready = new Promise((resolve) => {
    signalReady = resolve;
  });
  return {
    checkpoint: () =>
      new Promise((resolve) => {
        release = resolve;
        signalReady();
      }),
    ready,
    release: () => release(),
  };
}

test("enforces the exact byte cap and closes rejected descriptors", async (t) => {
  const { filePath, root } = await fixture(t);
  await writeFile(filePath, "12345");
  assert.equal(
    (await readOpenedBoundedFile({ filePath, maximumBytes: 5, rootPath: root }))
      .toString("utf8"),
    "12345",
  );
  await writeFile(filePath, "123456");
  await assert.rejects(
    readOpenedBoundedFile({ filePath, maximumBytes: 5, rootPath: root }),
    /bounded regular file|byte budget/u,
  );
  await rename(filePath, path.join(root, "closed-after-byte-rejection.json"));
});

test("rejects direct symlinks and reparse-style directory links", async (t) => {
  const { filePath, root } = await fixture(t);
  const target = path.join(root, "target.json");
  await writeFile(target, "{}\n");
  let fileSymlinkAvailable = true;
  try {
    await symlink(target, filePath, "file");
  } catch (error) {
    if (process.platform === "win32" && error?.code === "EPERM") {
      fileSymlinkAvailable = false;
    } else {
      throw error;
    }
  }
  if (fileSymlinkAvailable) {
    await assert.rejects(
      readOpenedBoundedFile({ filePath, maximumBytes: 16, rootPath: root }),
    );
    await rm(filePath);
  }

  const targetDirectory = path.join(root, "target-directory");
  await mkdir(targetDirectory);
  await symlink(
    targetDirectory,
    filePath,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    readOpenedBoundedFile({ filePath, maximumBytes: 16, rootPath: root }),
  );
});

test("opens FIFOs nonblocking and rejects them as authority files", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX FIFO coverage is not available on Windows");
    return;
  }
  const { filePath, root } = await fixture(t);
  const created = spawnSync("/usr/bin/mkfifo", [filePath], {
    encoding: "utf8",
  });
  assert.equal(created.status, 0, `${created.error ?? ""}${created.stderr}`);
  const moduleUrl = pathToFileURL(
    path.join(import.meta.dirname, "opened-bounded-file.mjs"),
  ).href;
  const script = `
    import { readOpenedBoundedFile } from ${JSON.stringify(moduleUrl)};
    try {
      await readOpenedBoundedFile({ filePath: ${JSON.stringify(filePath)}, maximumBytes: 16, rootPath: ${JSON.stringify(root)} });
      process.exitCode = 2;
    } catch {
      process.stderr.write("rejected-fifo\\n");
    }
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    timeout: 2_000,
  });
  assert.equal(result.error?.code, undefined, String(result.error));
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /rejected-fifo/u);
  await rename(filePath, path.join(root, "closed-after-fifo-rejection"));
});

test("rejects concurrent content mutation and closes the descriptor", async (t) => {
  const { filePath, root } = await fixture(t);
  await writeFile(filePath, "start");
  const barrier = descriptorBarrier();
  const read = readOpenedBoundedFile({
    filePath,
    maximumBytes: 32,
    rootPath: root,
    [openedBoundedFileDescriptorCheckpoint]: barrier.checkpoint,
  });
  await barrier.ready;
  await writeFile(filePath, "mutated");
  barrier.release();
  await assert.rejects(read, /changed|identity|bounded/u);
  await rename(filePath, path.join(root, "closed-after-mutation.json"));
});

test("rejects path replacement after open without leaking a descriptor", async (t) => {
  const { filePath, root } = await fixture(t);
  const displaced = path.join(root, "displaced.json");
  await writeFile(filePath, "start");
  const barrier = descriptorBarrier();
  const read = readOpenedBoundedFile({
    filePath,
    maximumBytes: 32,
    rootPath: root,
    [openedBoundedFileDescriptorCheckpoint]: barrier.checkpoint,
  });
  await barrier.ready;
  await rename(filePath, displaced);
  await writeFile(filePath, "replacement");
  barrier.release();
  await assert.rejects(read, /changed|identity/u);
  await rm(displaced);
  await rename(filePath, path.join(root, "closed-after-replacement.json"));
});
