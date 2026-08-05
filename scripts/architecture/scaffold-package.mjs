import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  acceptedOwnerStatuses,
  exists,
  loadDocuments,
  loadPackageCatalog,
  relative,
} from "./package-catalog-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");
const validatorPath = path.join(
  scriptDirectory,
  "validate-package-topology.mjs",
);

function parseArguments(argv) {
  const values = {
    dryRun: argv.includes("--dry-run"),
    id: undefined,
    repositoryRoot: defaultRepositoryRoot,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--id") {
      values.id = argv[index + 1];
      index += 1;
    } else if (argument === "--root") {
      const root = argv[index + 1];
      if (!root) {
        throw new Error("--root requires a path");
      }
      values.repositoryRoot = path.resolve(root);
      index += 1;
    } else if (argument !== "--dry-run") {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  if (!values.id) {
    throw new Error("--id requires a catalog package ID");
  }

  return values;
}

function validateRepository(repositoryRoot) {
  const result = spawnSync(
    process.execPath,
    [validatorPath, "--root", repositoryRoot],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `package topology must be valid before scaffolding:\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
}

function packageFiles(repositoryRoot, entry) {
  const packageRoot = path.join(repositoryRoot, entry.path);
  const rootTsconfig = relative(packageRoot, path.join(repositoryRoot, "tsconfig.json"));
  const manifest = {
    name: entry.package_name,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      build: "tsc --project tsconfig.json --pretty false",
      check:
        "pnpm run clean && pnpm run typecheck && pnpm run build && pnpm run test",
      clean:
        "node -e \"const fs=require('node:fs'); for (const path of ['dist','.cache']) fs.rmSync(path, { recursive: true, force: true })\"",
      prepack: "pnpm run clean && pnpm run build",
      test: "node --test --test-concurrency=1",
      typecheck: "tsc --project tsconfig.json --noEmit --pretty false",
    },
    agentTeamsArchitecture: {
      role: entry.role,
      ownerDocument: entry.owner_document,
    },
  };

  if (entry.role !== "app") {
    manifest.files = ["dist"];
    manifest.exports = {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    };
  }

  return new Map([
    ["package.json", `${JSON.stringify(manifest, null, 2)}\n`],
    [
      "tsconfig.json",
      `${JSON.stringify(
        {
          extends: rootTsconfig,
          compilerOptions: {
            composite: true,
            declaration: true,
            declarationMap: true,
            noEmit: false,
            outDir: "dist",
            rootDir: "src",
            tsBuildInfoFile: ".cache/tsconfig.tsbuildinfo",
          },
          include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.mts", "src/**/*.cts"],
        },
        null,
        2,
      )}\n`,
    ],
    ["src/index.ts", "export {};\n"],
  ]);
}

async function writeAtomically(targetRoot, files) {
  const parent = path.dirname(targetRoot);
  await mkdir(parent, { recursive: true });
  const stagingRoot = await mkdtemp(
    path.join(parent, `.${path.basename(targetRoot)}.tmp-`),
  );

  try {
    for (const [fileRelative, source] of files) {
      const filePath = path.join(stagingRoot, fileRelative);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, source);
    }
    await rename(stagingRoot, targetRoot);
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const { dryRun, id, repositoryRoot } = parseArguments(
    process.argv.slice(2),
  );
  validateRepository(repositoryRoot);

  const [catalog, documents] = await Promise.all([
    loadPackageCatalog(repositoryRoot),
    loadDocuments(repositoryRoot),
  ]);
  const entry = catalog.packages.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(`${id}: package ID is not registered in the catalog`);
  }

  const owner = documents.get(entry.owner_document);
  if (!owner || !acceptedOwnerStatuses.has(owner.metadata.status)) {
    throw new Error(
      `${id}: owner ${entry.owner_document} must be accepted or active before scaffolding`,
    );
  }

  const targetRoot = path.join(repositoryRoot, entry.path);
  if (await exists(targetRoot)) {
    throw new Error(`${entry.path}: target already exists`);
  }

  const files = packageFiles(repositoryRoot, entry);
  if (dryRun) {
    console.log(`Would scaffold ${id} at ${entry.path}:`);
    for (const filePath of files.keys()) {
      console.log(`- ${filePath}`);
    }
    return;
  }

  await writeAtomically(targetRoot, files);
  console.log(`Scaffolded ${id} at ${entry.path}.`);
  console.log(
    "Add the accepted first feature slice in the same change; the scaffolder does not invent DDD artifacts.",
  );
}

await main();
