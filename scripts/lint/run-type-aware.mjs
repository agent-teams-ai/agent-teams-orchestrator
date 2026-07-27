import { spawnSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const oxlintBinary = path.join(repositoryRoot, "node_modules/.bin/oxlint");
const defaultTargets = [
  path.join(repositoryRoot, "apps"),
  path.join(repositoryRoot, "packages"),
  path.join(
    repositoryRoot,
    "tooling/architecture-conformance/fixtures/valid",
  ),
];
const typeScriptExtensions = new Set([".cts", ".mts", ".ts", ".tsx"]);
const excludedDirectories = new Set([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
]);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function countTypeScriptFiles(target) {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    return typeScriptExtensions.has(path.extname(target)) ? 1 : 0;
  }
  if (!targetStat.isDirectory()) {
    return 0;
  }

  let count = 0;
  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      count += await countTypeScriptFiles(entryPath);
    } else if (
      entry.isFile() &&
      typeScriptExtensions.has(path.extname(entry.name))
    ) {
      count += 1;
    }
  }
  return count;
}

async function resolveTargets(arguments_) {
  const requested =
    arguments_.length > 0
      ? arguments_.map((target) => path.resolve(repositoryRoot, target))
      : defaultTargets;
  const targets = [];
  for (const target of requested) {
    if (await exists(target)) {
      targets.push(target);
    } else if (arguments_.length > 0) {
      throw new Error(`type-aware lint target does not exist: ${target}`);
    }
  }
  return targets;
}

async function main() {
  const targets = await resolveTargets(process.argv.slice(2));
  let fileCount = 0;
  for (const target of targets) {
    fileCount += await countTypeScriptFiles(target);
  }

  if (fileCount === 0) {
    console.error("type-aware lint refused to pass without TypeScript inputs");
    process.exitCode = 1;
    return;
  }

  console.log(`Type-aware lint inputs: ${fileCount} TypeScript file(s).`);
  const result = spawnSync(
    oxlintBinary,
    [
      "--config",
      path.join(repositoryRoot, ".oxlintrc.type-aware.json"),
      "--deny-warnings",
      ...targets,
    ],
    {
      cwd: repositoryRoot,
      stdio: "inherit",
    },
  );
  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
}

await main();
