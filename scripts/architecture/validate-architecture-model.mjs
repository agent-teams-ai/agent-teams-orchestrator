import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolRepositoryRoot = path.resolve(scriptDirectory, "../..");
const defaultRepositoryRoot = toolRepositoryRoot;
const requiredRelationshipMetadata = [
  "authority",
  "integration_style",
  "status",
];

function parseArguments(argv) {
  const options = {
    modelDirectory: null,
    repositoryRoot: defaultRepositoryRoot,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--root" || argument === "--model-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${argument} requires a path`);
      }
      if (argument === "--root") {
        options.repositoryRoot = path.resolve(value);
      } else {
        options.modelDirectory = path.resolve(value);
      }
      index += 1;
      continue;
    }
    throw new Error(`unexpected argument ${argument}`);
  }
  options.modelDirectory ??= path.join(
    options.repositoryRoot,
    "architecture/likec4",
  );
  return options;
}

function runLikeC4(arguments_, cwd) {
  const executable = path.join(
    toolRepositoryRoot,
    "node_modules/.bin",
    process.platform === "win32" ? "likec4.cmd" : "likec4",
  );
  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 120_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error("LikeC4 timed out after 120 seconds"));
        return;
      }
      if (code === 0) {
        resolve({ stderr, stdout });
      } else {
        reject(
          new Error(
            [stdout.trim(), stderr.trim()]
              .filter(Boolean)
              .join("\n") ||
              `LikeC4 exited with status ${String(code)}`,
          ),
        );
      }
    });
  });
}

function validateBoundedContexts(project, catalog, errors) {
  const catalogContexts = (catalog.packages ?? []).filter(
    (entry) => entry.role === "bounded-context",
  );
  const modelContexts = Object.values(project.elements ?? {}).filter(
    (element) => element.kind === "boundedContext",
  );
  const byPackageId = new Map();

  for (const element of modelContexts) {
    const packageId = element.metadata?.package_id;
    const documentId = element.metadata?.document_id;
    if (typeof packageId !== "string" || !packageId) {
      errors.push(`LikeC4 element ${element.id} is missing metadata.package_id`);
      continue;
    }
    if (byPackageId.has(packageId)) {
      errors.push(`LikeC4 package_id ${packageId} is used by multiple elements`);
    } else {
      byPackageId.set(packageId, element);
    }
    if (typeof documentId !== "string" || !documentId) {
      errors.push(`LikeC4 element ${element.id} is missing metadata.document_id`);
    }
  }

  const catalogIds = new Set(catalogContexts.map((entry) => entry.id));
  for (const entry of catalogContexts) {
    const element = byPackageId.get(entry.id);
    if (!element) {
      errors.push(
        `LikeC4 model is missing bounded context package ${entry.id}`,
      );
    } else if (element.metadata.document_id !== entry.owner_document) {
      errors.push(
        `LikeC4 element ${element.id} document_id must be ${entry.owner_document}`,
      );
    }
  }
  for (const [packageId, element] of byPackageId) {
    if (!catalogIds.has(packageId)) {
      errors.push(
        `LikeC4 element ${element.id} references unknown bounded context package ${packageId}`,
      );
    }
  }
}

function validateRelationships(project, errors) {
  const relations = Object.values(project.relations ?? {});
  if (relations.length === 0) {
    errors.push("LikeC4 strategic model must contain relationships");
    return;
  }

  for (const relation of relations) {
    if (typeof relation.title !== "string" || !relation.title.trim()) {
      errors.push(`LikeC4 relationship ${relation.id} is missing a title`);
    }
    for (const field of requiredRelationshipMetadata) {
      if (
        typeof relation.metadata?.[field] !== "string" ||
        !relation.metadata[field].trim()
      ) {
        errors.push(
          `LikeC4 relationship ${relation.id} is missing metadata.${field}`,
        );
      }
    }
    if (
      relation.metadata?.status &&
      !["accepted", "proposed"].includes(relation.metadata.status)
    ) {
      errors.push(
        `LikeC4 relationship ${relation.id} has unsupported status ${relation.metadata.status}`,
      );
    }
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "agent-teams-likec4-"),
  );
  const exportPath = path.join(temporaryDirectory, "model.json");
  const errors = [];
  const relativeModelDirectory = path.relative(
    options.repositoryRoot,
    options.modelDirectory,
  );
  const modelArgument =
    relativeModelDirectory !== ".." &&
    !relativeModelDirectory.startsWith(`..${path.sep}`)
      ? relativeModelDirectory
      : options.modelDirectory;

  try {
    const config = JSON.parse(
      await readFile(
        path.join(options.modelDirectory, "likec4.config.json"),
        "utf8",
      ),
    );
    if (typeof config.name !== "string" || !config.name) {
      throw new Error("LikeC4 configuration requires a project name");
    }
    await runLikeC4(
      ["format", "--check", modelArgument],
      options.repositoryRoot,
    );
    await runLikeC4(
      ["validate", "--no-layout", modelArgument],
      options.repositoryRoot,
    );
    await runLikeC4(
      [
        "export",
        "json",
        "--project",
        config.name,
        "-o",
        exportPath,
        "--pretty",
        "--skip-layout",
        modelArgument,
      ],
      options.repositoryRoot,
    );

    const [exported, catalog] = await Promise.all([
      readFile(exportPath, "utf8").then(JSON.parse),
      readFile(
        path.join(options.repositoryRoot, "architecture/package-catalog.yaml"),
        "utf8",
      ).then(YAML.parse),
    ]);
    if (
      !exported ||
      Array.isArray(exported) ||
      exported.projectId !== config.name
    ) {
      errors.push(`LikeC4 export must contain project ${config.name}`);
    } else {
      const project = exported;
      if (!project.views?.strategicContextMap) {
        errors.push("LikeC4 model is missing the strategicContextMap view");
      }
      validateBoundedContexts(project, catalog, errors);
      validateRelationships(project, errors);
    }
  } catch (error) {
    errors.push(error.message);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }

  if (errors.length > 0) {
    for (const error of errors.sort()) {
      console.error(`ERROR ${error}`);
    }
    console.error(
      `\nArchitecture model validation failed with ${errors.length} error(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Architecture model validation passed: LikeC4 syntax, relationships, and bounded-context catalog are consistent.",
  );
}

await main();
