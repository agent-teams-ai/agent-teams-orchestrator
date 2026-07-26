import { readdir, stat } from "node:fs/promises";
import path from "node:path";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walk(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath, predicate)));
    } else if (predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function discoverColocatedMarkdown(repositoryRoot) {
  const candidateRoots = ["apps", "packages", "tooling"].map((directory) =>
    path.join(repositoryRoot, directory),
  );
  const markdownFiles = [];

  for (const root of candidateRoots) {
    if (!(await exists(root))) {
      continue;
    }
    markdownFiles.push(
      ...(await walk(
        root,
        (filePath) =>
          path.basename(filePath) === "README.md" &&
          !filePath.includes(`${path.sep}fixtures${path.sep}`),
      )),
    );
  }

  const governed = [];
  for (const filePath of markdownFiles) {
    const repositoryPath = path
      .relative(repositoryRoot, filePath)
      .split(path.sep)
      .join("/");
    const isFeatureDocumentation = /\/src\/features\/.+\/README\.md$/.test(
      repositoryPath,
    );
    const isPackageIndex = await exists(
      path.join(path.dirname(filePath), "package.json"),
    );

    if (isFeatureDocumentation || isPackageIndex) {
      governed.push(filePath);
    }
  }

  return governed;
}

export async function discoverGovernedMarkdown(repositoryRoot) {
  const docsRoot = path.join(repositoryRoot, "docs");
  const docsMarkdownFiles = await walk(
    docsRoot,
    (filePath) => path.extname(filePath) === ".md",
  );
  const colocatedMarkdownFiles =
    await discoverColocatedMarkdown(repositoryRoot);

  return {
    colocatedMarkdownFiles,
    docsMarkdownFiles,
    governedMarkdownFiles: [
      ...docsMarkdownFiles,
      ...colocatedMarkdownFiles,
    ].sort(),
  };
}
