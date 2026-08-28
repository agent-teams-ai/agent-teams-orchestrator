import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import { loadResourceBoundedPackageCatalog } from "./package-catalog-resource-guards.mjs";

export const acceptedOwnerStatuses = new Set(["accepted", "active"]);

export function relative(repositoryRoot, filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

export async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walk(directory, predicate, options = {}) {
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (
      entry.isDirectory() &&
      (options.skipDirectories ?? []).includes(entry.name)
    ) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath, predicate, options)));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

export function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    throw new Error(`${filePath}: missing YAML frontmatter`);
  }
  return YAML.parse(match[1]);
}

export async function loadDocuments(repositoryRoot) {
  const docsRoot = path.join(repositoryRoot, "docs");
  const markdownFiles = await walk(
    docsRoot,
    (filePath) => path.extname(filePath) === ".md",
  );
  const documents = new Map();

  for (const filePath of markdownFiles) {
    const metadata = parseFrontmatter(
      await readFile(filePath, "utf8"),
      relative(repositoryRoot, filePath),
    );
    documents.set(metadata.id, {
      filePath,
      metadata,
    });
  }

  return documents;
}

export async function loadPackageCatalog(repositoryRoot) {
  return loadResourceBoundedPackageCatalog(repositoryRoot);
}

export async function loadPackageMaterializationPolicy(repositoryRoot) {
  const policyPath = path.join(
    repositoryRoot,
    "architecture/package-materialization-policy.yaml",
  );
  return YAML.parse(await readFile(policyPath, "utf8"));
}

export async function loadSourceDependencyPolicy(repositoryRoot) {
  const policyPath = path.join(
    repositoryRoot,
    "architecture/source-dependency-policy.yaml",
  );
  return YAML.parse(await readFile(policyPath, "utf8"));
}
