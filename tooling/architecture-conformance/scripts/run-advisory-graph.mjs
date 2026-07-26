import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolingRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(toolingRoot, "../..");
const graphConfig = path.join(
  toolingRoot,
  "dependency-cruiser.config.cjs",
);
const dependencyCruiserBin = path.join(
  toolingRoot,
  "node_modules/.bin/dependency-cruiser",
);
const sourceRoots = ["apps", "packages"]
  .map((directory) => path.join(repositoryRoot, directory))
  .filter(existsSync)
  .map((directory) => path.relative(repositoryRoot, directory));

if (sourceRoots.length === 0) {
  console.log("Advisory dependency graph skipped: no production source roots.");
  process.exit(0);
}

const result = spawnSync(
  dependencyCruiserBin,
  [
    "--config",
    graphConfig,
    "--output-type",
    "err",
    ...sourceRoots,
  ],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
  },
);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
if (output.trim()) {
  process.stdout.write(output);
}

if (result.status !== 0) {
  console.warn(
    "Advisory dependency graph found violations; this does not block the build yet.",
  );
}

process.exit(0);
