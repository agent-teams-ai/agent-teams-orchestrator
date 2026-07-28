import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const sourceExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const excludedDirectories = new Set([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "fixtures",
  "node_modules",
]);
const protectedRules = new Set([
  "boundaries/dependencies",
  "boundaries/no-unknown-dependencies",
  "no-restricted-globals",
  "no-restricted-properties",
]);
const directiveName = ["oxlint", "disable", "next", "line"].join("-");
const directivePattern = new RegExp(
  `^\\s*//\\s*${directiveName}\\s+([a-z0-9@/_-]+(?:\\s*,\\s*[a-z0-9@/_-]+)*)\\s*$`,
  "u",
);
const eslintDirectivePattern = new RegExp(
  `\\b${["eslint", "(?:disable|enable)"].join("-")}`,
  "u",
);
const oxlintDirectivePattern = new RegExp(
  `\\b${["oxlint", "(?:disable|enable)"].join("-")}`,
  "u",
);
const explanationPattern = /^\s*\/\/\s+(?!oxlint-|eslint-)(.{20,})$/u;

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

async function collectSourceFiles(target, files) {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    if (sourceExtensions.has(path.extname(target))) {
      files.push(target);
    }
    return;
  }
  if (!targetStat.isDirectory()) {
    return;
  }

  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await collectSourceFiles(entryPath, files);
    } else if (
      entry.isFile() &&
      sourceExtensions.has(path.extname(entry.name))
    ) {
      files.push(entryPath);
    }
  }
}

function validateFile(filePath, source) {
  const errors = [];
  const lines = source.split(/\r?\n/u);
  for (const [lineIndex, line] of lines.entries()) {
    if (eslintDirectivePattern.test(line)) {
      errors.push(
        `${filePath}:${lineIndex + 1}: eslint suppression directives are disabled; use a governed Oxlint exception`,
      );
    }

    if (!oxlintDirectivePattern.test(line)) {
      continue;
    }

    const match = directivePattern.exec(line);
    if (!match) {
      errors.push(
        `${filePath}:${lineIndex + 1}: only a rule-scoped next-line Oxlint directive is allowed`,
      );
      continue;
    }

    const rules = match[1].split(",").map((rule) => rule.trim());
    const protectedRule = rules.find((rule) => protectedRules.has(rule));
    if (protectedRule) {
      errors.push(
        `${filePath}:${lineIndex + 1}: architecture rule ${protectedRule} cannot be suppressed locally`,
      );
    }

    const explanation = lines[lineIndex - 1] ?? "";
    if (!explanationPattern.test(explanation)) {
      errors.push(
        `${filePath}:${lineIndex + 1}: suppression requires a preceding explanatory comment of at least 20 characters`,
      );
    }
  }

  return errors;
}

async function main() {
  const cliArguments = process.argv.slice(2);
  const requestedTargets =
    cliArguments.length > 0
      ? cliArguments.map((target) => path.resolve(repositoryRoot, target))
      : ["apps", "packages", "scripts", "tooling"].map((target) =>
          path.join(repositoryRoot, target),
        );
  const targets = [];
  for (const target of requestedTargets) {
    if (await exists(target)) {
      targets.push(target);
    } else if (cliArguments.length > 0) {
      throw new Error(`suppression validation target does not exist: ${target}`);
    }
  }

  const files = [];
  for (const target of targets) {
    await collectSourceFiles(target, files);
  }

  const errors = [];
  for (const filePath of files.toSorted((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    errors.push(
      ...validateFile(
        path.relative(repositoryRoot, filePath),
        await readFile(filePath, "utf8"),
      ),
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR ${error}`);
    }
    console.error(
      `\nSuppression validation failed with ${errors.length} error(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Suppression validation passed: ${files.length} source file(s) inspected.`,
  );
}

await main();
