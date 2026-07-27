import { readdir } from "node:fs/promises";
import path from "node:path";

const excludedDirectoryNames = new Set([
  ".git",
  ".nx",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
]);

export function normalizeRepositoryPath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

export function validateCodeAnchorPattern(pattern) {
  if (typeof pattern !== "string" || pattern.length === 0) {
    return "pattern must be a non-empty string";
  }
  if (pattern.includes("\\")) {
    return "pattern must use forward slashes";
  }
  if (path.posix.isAbsolute(pattern) || /^[A-Za-z]:\//.test(pattern)) {
    return "pattern must be repository-relative";
  }
  if (pattern.split("/").includes("..")) {
    return "pattern must not escape the repository root";
  }
  if (pattern.startsWith("!")) {
    return "negated patterns are not supported";
  }
  if (
    pattern === "docs" ||
    pattern.startsWith("docs/") ||
    pattern === ".agents" ||
    pattern.startsWith(".agents/")
  ) {
    return "code anchors must target implementation or machine-readable sources, not governed prose or skills";
  }
  return null;
}

export function matchesCodeAnchor(repositoryPath, pattern) {
  return path.matchesGlob(normalizeRepositoryPath(repositoryPath), pattern);
}

export async function listRepositoryFiles(repositoryRoot) {
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) {
        continue;
      }

      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        files.push(
          normalizeRepositoryPath(path.relative(repositoryRoot, entryPath)),
        );
      }
    }
  }

  await visit(repositoryRoot);
  return files;
}

export function matchingCodeAnchorFiles(pattern, repositoryFiles) {
  return repositoryFiles.filter((filePath) =>
    matchesCodeAnchor(filePath, pattern),
  );
}
