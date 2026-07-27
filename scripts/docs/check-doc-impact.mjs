import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  matchesCodeAnchor,
  normalizeRepositoryPath,
  validateCodeAnchorPattern,
} from "./code-anchors.mjs";
import { discoverGovernedMarkdown } from "./document-files.mjs";
import { parseFrontmatter, parseMarkdown } from "./document-parser.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDirectory, "../..");

function usage() {
  console.log(`Usage: pnpm docs:impact -- [options]

Options:
  --base <git-ref>   Inspect committed changes from the merge base to HEAD.
  --path <path>      Inspect one changed path; repeat for multiple paths.
  --strict           Fail when a required impacted document is unchanged.
  --json             Emit machine-readable output.
  --root <path>      Override repository root for fixtures or tooling.
  --help             Show this help.`);
}

function parseArguments(argv) {
  const options = {
    base: null,
    explicitPaths: [],
    help: false,
    json: false,
    repositoryRoot: process.env.DOCS_REPOSITORY_ROOT
      ? path.resolve(process.env.DOCS_REPOSITORY_ROOT)
      : defaultRepositoryRoot,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--strict") {
      options.strict = true;
      continue;
    }
    if (["--base", "--path", "--root"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--base") {
        options.base = value;
      } else if (argument === "--path") {
        options.explicitPaths.push(value);
      } else {
        options.repositoryRoot = path.resolve(value);
      }
      index += 1;
      continue;
    }
    throw new Error(`unexpected argument ${argument}`);
  }

  if (options.base && options.explicitPaths.length > 0) {
    throw new Error("--base and --path cannot be combined");
  }
  return options;
}

function run(command, arguments_, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            stderr.trim() || `${command} exited with status ${String(code)}`,
          ),
        );
      }
    });
  });
}

function splitPaths(output) {
  return output
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeChangedPath(repositoryRoot, value) {
  const absolute = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(repositoryRoot, value);
  const repositoryPath = path.relative(repositoryRoot, absolute);
  if (
    repositoryPath === ".." ||
    repositoryPath.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`changed path escapes repository root: ${value}`);
  }
  return normalizeRepositoryPath(repositoryPath);
}

async function discoverChangedPaths(options) {
  if (options.explicitPaths.length > 0) {
    return options.explicitPaths.map((value) =>
      normalizeChangedPath(options.repositoryRoot, value),
    );
  }

  if (options.base) {
    return splitPaths(
      await run(
        "git",
        [
          "diff",
          "--name-only",
          "--diff-filter=ACMRTUXB",
          `${options.base}...HEAD`,
        ],
        options.repositoryRoot,
      ),
    ).map(normalizeRepositoryPath);
  }

  const [tracked, untracked] = await Promise.all([
    run(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"],
      options.repositoryRoot,
    ),
    run(
      "git",
      ["ls-files", "--others", "--exclude-standard"],
      options.repositoryRoot,
    ),
  ]);
  return [...splitPaths(tracked), ...splitPaths(untracked)].map(
    normalizeRepositoryPath,
  );
}

async function loadAnchoredDocuments(repositoryRoot) {
  const { governedMarkdownFiles } =
    await discoverGovernedMarkdown(repositoryRoot);
  const documents = [];

  for (const filePath of governedMarkdownFiles) {
    const source = await readFile(filePath, "utf8");
    const { error, metadata } = parseFrontmatter(parseMarkdown(source));
    if (error || !Array.isArray(metadata?.code_anchors)) {
      continue;
    }
    for (const anchor of metadata.code_anchors) {
      const patternError = validateCodeAnchorPattern(anchor?.pattern);
      if (patternError) {
        throw new Error(
          `${normalizeRepositoryPath(path.relative(repositoryRoot, filePath))}: invalid code anchor: ${patternError}`,
        );
      }
    }
    documents.push({
      anchors: metadata.code_anchors,
      id: metadata.id,
      path: normalizeRepositoryPath(path.relative(repositoryRoot, filePath)),
    });
  }
  return documents;
}

function calculateImpacts(documents, changedPaths) {
  const changed = new Set(changedPaths);
  const impacts = [];

  for (const document of documents) {
    const matchedAnchors = document.anchors
      .map((anchor) => ({
        enforcement: anchor.enforcement,
        matchedPaths: changedPaths.filter((changedPath) =>
          matchesCodeAnchor(changedPath, anchor.pattern),
        ),
        pattern: anchor.pattern,
      }))
      .filter((anchor) => anchor.matchedPaths.length > 0);
    if (matchedAnchors.length === 0) {
      continue;
    }

    impacts.push({
      documentChanged: changed.has(document.path),
      enforcement: matchedAnchors.some(
        (anchor) => anchor.enforcement === "required",
      )
        ? "required"
        : "advisory",
      id: document.id,
      matchedAnchors,
      path: document.path,
    });
  }

  return impacts.sort((left, right) => left.id.localeCompare(right.id));
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    usage();
    return;
  }

  try {
    const changedPaths = [...new Set(await discoverChangedPaths(options))].sort();
    const documents = await loadAnchoredDocuments(options.repositoryRoot);
    const impacts = calculateImpacts(documents, changedPaths);
    const missingRequired = impacts.filter(
      (impact) => impact.enforcement === "required" && !impact.documentChanged,
    );
    const result = { changedPaths, impacts, missingRequired };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (impacts.length === 0) {
      console.log("No documentation code anchors matched the changed paths.");
    } else {
      for (const impact of impacts) {
        const matchedPaths = [
          ...new Set(
            impact.matchedAnchors.flatMap((anchor) => anchor.matchedPaths),
          ),
        ].sort();
        console.log(
          `${impact.enforcement.toUpperCase()} ${impact.id} ${impact.path} <- ${matchedPaths.join(", ")}${impact.documentChanged ? " (document updated)" : ""}`,
        );
      }
    }

    if (options.strict && missingRequired.length > 0) {
      console.error(
        `Documentation impact check failed: ${missingRequired.length} required document(s) were not updated.`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Documentation impact check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
