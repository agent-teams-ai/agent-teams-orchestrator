import { spawnSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const foundationCli = path.join(
  repositoryRoot,
  "node_modules",
  "@agent-teams",
  "engineering-foundation",
  "dist",
  "cli.js",
);
const protectedFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
];

function runFoundation(args, { expectSuccess = true } = {}) {
  const result = spawnSync(process.execPath, [foundationCli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.error) {
    throw result.error;
  }
  if (expectSuccess && result.status !== 0) {
    throw new Error(
      `Foundation command failed (${args.join(" ")}):\n${output}`,
    );
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error(
      `Foundation command unexpectedly succeeded (${args.join(" ")}):\n${output}`,
    );
  }
  return { output, status: result.status };
}

function parseStatus(result, command) {
  try {
    return JSON.parse(result.output);
  } catch (error) {
    throw new Error(`Invalid JSON from ${command}:\n${result.output}`, {
      cause: error,
    });
  }
}

async function snapshotProtectedFiles() {
  return new Map(
    await Promise.all(
      protectedFiles.map(async (relativePath) => [
        relativePath,
        await readFile(path.join(repositoryRoot, relativePath)),
      ]),
    ),
  );
}

async function assertProtectedFilesUnchanged(before) {
  for (const [relativePath, expected] of before) {
    const actual = await readFile(path.join(repositoryRoot, relativePath));
    if (!actual.equals(expected)) {
      throw new Error(`Local mode changed protected file: ${relativePath}`);
    }
  }
}

const rawArguments = process.argv.slice(2);
const argumentsWithoutSeparator =
  rawArguments[0] === "--" ? rawArguments.slice(1) : rawArguments;
const targetArgument = argumentsWithoutSeparator[0];
if (!targetArgument || argumentsWithoutSeparator.length !== 1) {
  throw new Error(
    "Usage: pnpm foundation:e2e -- /absolute/path/to/engineering-foundation",
  );
}

const targetRoot = await realpath(path.resolve(targetArgument));
const before = await snapshotProtectedFiles();
let attached = false;
let primaryError;

try {
  runFoundation(["assert-dev-only"]);
  const registryBefore = parseStatus(
    runFoundation(["assert-registry", "--json"]),
    "assert-registry",
  );
  if (registryBefore.mode !== "REGISTRY") {
    throw new Error(`Expected REGISTRY before attach, got ${registryBefore.mode}`);
  }

  runFoundation(["attach", targetRoot, "--json"]);
  attached = true;

  const local = parseStatus(
    runFoundation(["status", "--json"]),
    "status",
  );
  if (local.mode !== "LOCAL") {
    throw new Error(`Expected LOCAL after attach, got ${local.mode}`);
  }
  const actualTarget = await realpath(local.linkState.targetPackageRoot);
  const possibleTargets = [
    targetRoot,
    path.join(targetRoot, "packages", "engineering-foundation"),
  ];
  const matchesTarget = await Promise.all(
    possibleTargets.map(async (candidate) => {
      try {
        return actualTarget === (await realpath(candidate));
      } catch {
        return false;
      }
    }),
  );
  if (!matchesTarget.some(Boolean)) {
    throw new Error(`Attached target mismatch: ${actualTarget}`);
  }

  runFoundation(["assert-dev-only"]);
  const rejected = runFoundation(["assert-registry"], {
    expectSuccess: false,
  });
  if (!rejected.output.includes("REGISTRY_MODE_REQUIRED")) {
    throw new Error(
      `Local registry assertion failed for the wrong reason:\n${rejected.output}`,
    );
  }
  await assertProtectedFilesUnchanged(before);
} catch (error) {
  primaryError = error;
} finally {
  if (attached) {
    try {
      runFoundation(["detach", "--json"]);
    } catch (cleanupError) {
      primaryError = primaryError
        ? new AggregateError(
            [primaryError, cleanupError],
            "Foundation E2E and detach cleanup failed.",
          )
        : cleanupError;
    }
  }
}

if (primaryError) {
  throw primaryError;
}

const registryAfter = parseStatus(
  runFoundation(["assert-registry", "--json"]),
  "assert-registry",
);
if (registryAfter.mode !== "REGISTRY") {
  throw new Error(`Expected REGISTRY after detach, got ${registryAfter.mode}`);
}
await assertProtectedFilesUnchanged(before);

process.stdout.write(
  `Foundation local-mode E2E passed: REGISTRY -> LOCAL -> REGISTRY (${targetRoot})\n`,
);
