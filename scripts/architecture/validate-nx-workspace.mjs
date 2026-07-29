import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { relative, walk } from "./package-catalog-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const executableExtension = process.platform === "win32" ? ".cmd" : "";
const ignoredDirectories = [
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
];

function run(commandPath, arguments_) {
  const result = spawnSync(commandPath, arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NX_DAEMON: "false",
      NX_NO_CLOUD: "true",
    },
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${path.basename(commandPath)} ${arguments_.join(" ")} failed:\n${output}`,
    );
  }

  return result.stdout;
}

function parseJson(output, commandName) {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(
      `${commandName} returned invalid JSON: ${error.message}`,
      { cause: error },
    );
  }
}

const nxPath = path.join(
  repositoryRoot,
  "node_modules",
  ".bin",
  `nx${executableExtension}`,
);

const nxProjects = parseJson(
  run(nxPath, ["show", "projects", "--json"]),
  "nx show projects",
);
const workspace = YAML.parse(
  await readFile(
    path.join(repositoryRoot, "pnpm-workspace.yaml"),
    "utf8",
  ),
);

if (!Array.isArray(nxProjects) || !Array.isArray(workspace.packages)) {
  throw new TypeError("Nx projects and pnpm workspace patterns must be arrays");
}

const packageJsonFiles = await walk(
  repositoryRoot,
  (filePath) => path.basename(filePath) === "package.json",
  { skipDirectories: ignoredDirectories },
);
const expectedProjects = [];

for (const filePath of packageJsonFiles.toSorted()) {
  const packageDirectory = relative(
    repositoryRoot,
    path.dirname(filePath),
  );
  if (!packageDirectory) {
    continue;
  }

  const included = workspace.packages
    .filter((pattern) => !pattern.startsWith("!"))
    .some((pattern) => path.matchesGlob(packageDirectory, pattern));
  const excluded = workspace.packages
    .filter((pattern) => pattern.startsWith("!"))
    .some((pattern) =>
      path.matchesGlob(packageDirectory, pattern.slice(1)),
    );
  if (!included || excluded) {
    continue;
  }

  const manifest = JSON.parse(await readFile(filePath, "utf8"));
  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    throw new Error(
      `${relative(repositoryRoot, filePath)}: package name is required`,
    );
  }
  expectedProjects.push(manifest.name);
}

expectedProjects.sort();
const discoveredProjects = nxProjects.toSorted();

if (
  expectedProjects.length !== discoveredProjects.length ||
  expectedProjects.some(
    (projectName, index) => projectName !== discoveredProjects[index],
  )
) {
  throw new Error(
    [
      "Nx project discovery differs from the pnpm workspace.",
      `Expected: ${JSON.stringify(expectedProjects)}`,
      `Discovered: ${JSON.stringify(discoveredProjects)}`,
    ].join("\n"),
  );
}

console.log(
  `Nx workspace validation passed: ${discoveredProjects.length} workspace project(s), no root or sibling repositories.`,
);
