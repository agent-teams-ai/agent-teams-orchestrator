import { readdir } from "node:fs/promises";
import path from "node:path";

import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

import { markdownLinks, resolveMarkdownTarget } from "./document-links.mjs";

const deferredCollectionIndexes = new Set([
  "docs/contracts",
  "docs/operations",
]);

function isDeferredSingleDocumentCollection(context, directory) {
  const repositoryPath = context.relative(directory);
  if (!deferredCollectionIndexes.has(repositoryPath)) {
    return false;
  }
  const descendants = context.markdownFiles.filter((filePath) =>
    filePath.startsWith(`${directory}${path.sep}`),
  );
  return (
    descendants.length === 1 && path.dirname(descendants[0]) === directory
  );
}

function childNavigationTarget(context, childDirectory) {
  const indexPath = path.join(childDirectory, "README.md");
  if (context.documentsByPath.has(indexPath)) {
    return indexPath;
  }
  if (isDeferredSingleDocumentCollection(context, childDirectory)) {
    return context.markdownFiles.find((filePath) =>
      filePath.startsWith(`${childDirectory}${path.sep}`),
    );
  }
  return indexPath;
}

function linkedLocalMarkdownPaths(context, indexDocument) {
  return new Set(
    markdownLinks(indexDocument.tree)
      .map((target) =>
        resolveMarkdownTarget(
          context.repositoryRoot,
          indexDocument.filePath,
          target,
        ),
      )
      .filter((target) => target && !target.escapedRepository)
      .map(({ targetPath }) => path.normalize(targetPath)),
  );
}

async function validateDirectoryIndexes(context) {
  const { docsRoot, documentsByPath, errors, markdownFiles, relative } = context;
  const directories = new Set([docsRoot]);
  for (const filePath of markdownFiles) {
    let directory = path.dirname(filePath);
    while (
      directory === docsRoot ||
      directory.startsWith(`${docsRoot}${path.sep}`)
    ) {
      directories.add(directory);
      if (directory === docsRoot) {
        break;
      }
      directory = path.dirname(directory);
    }
  }

  for (const directory of [...directories].toSorted()) {
    const entries = await readdir(directory, { withFileTypes: true });
    const directDocuments = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          path.extname(entry.name) === ".md" &&
          entry.name !== "README.md",
      )
      .map((entry) => path.join(directory, entry.name));
    const childIndexes = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .filter((childDirectory) =>
        markdownFiles.some((filePath) =>
          filePath.startsWith(`${childDirectory}${path.sep}`),
        ),
      )
      .map((childDirectory) => childNavigationTarget(context, childDirectory));
    const requiredTargets = [...directDocuments, ...childIndexes];
    const indexPath = path.join(directory, "README.md");
    const indexDocument = documentsByPath.get(indexPath);
    if (
      !indexDocument &&
      isDeferredSingleDocumentCollection(context, directory)
    ) {
      continue;
    }
    if (requiredTargets.length > 0 && !indexDocument) {
      errors.push(
        `${relative(directory)}: documentation directory requires README.md`,
      );
      continue;
    }
    if (!indexDocument) {
      continue;
    }
    if (requiredTargets.length > 0 && indexDocument.metadata?.type !== "index") {
      errors.push(
        `${relative(indexPath)}: collection README.md must have type index`,
      );
    }
    const linked = linkedLocalMarkdownPaths(context, indexDocument);
    for (const targetPath of requiredTargets) {
      if (!documentsByPath.has(targetPath)) {
        errors.push(
          `${relative(targetPath)}: child documentation directory requires README.md`,
        );
      } else if (!linked.has(path.normalize(targetPath))) {
        errors.push(
          `${relative(targetPath)}: not directly listed in ${relative(indexPath)}`,
        );
      }
    }
  }
}

function tableColumns(table) {
  const [headerRow] = table.children;
  const headers = (headerRow?.children ?? []).map((cell) =>
    toString(cell).trim().toLowerCase(),
  );
  return {
    blocker: headers.indexOf("primary gate"),
    id: headers.indexOf("id"),
    owner: headers.indexOf("owner"),
    status: Math.max(headers.indexOf("status"), headers.indexOf("readiness")),
  };
}

function expectedDocumentStatus(target) {
  return target.metadata.type === "open-decision" &&
    target.metadata.status === "resolved"
    ? `resolved by ${target.metadata.resolved_by}`.toLowerCase()
    : target.metadata.status;
}

function validateTableTarget(context, document, cells, columns, target) {
  const { errors, relative } = context;
  if (columns.id >= 0 && toString(cells[columns.id]).trim() !== target.metadata.id) {
    errors.push(
      `${relative(document.filePath)}: table id for ${relative(target.filePath)} must be ${target.metadata.id}`,
    );
  }
  if (
    columns.owner >= 0 &&
    toString(cells[columns.owner]).trim() !== target.metadata.owner
  ) {
    errors.push(
      `${relative(document.filePath)}: table owner for ${target.metadata.id} must be ${target.metadata.owner}`,
    );
  }
  if (columns.blocker >= 0) {
    const rendered = toString(cells[columns.blocker])
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .toSorted();
    const expected = [...(target.metadata.blocked_by ?? [])].toSorted();
    if (JSON.stringify(rendered) !== JSON.stringify(expected)) {
      errors.push(
        `${relative(document.filePath)}: primary gate for ${target.metadata.id} must match blocked_by metadata`,
      );
    }
  }
  if (columns.status >= 0) {
    const rendered = toString(cells[columns.status]).trim().toLowerCase();
    const expected = expectedDocumentStatus(target);
    if (rendered !== expected) {
      errors.push(
        `${relative(document.filePath)}: table status for ${target.metadata.id} must be ${expected}`,
      );
    }
  }
}

function validateIndexTables(context) {
  const { documentsByPath, repositoryRoot } = context;
  for (const document of documentsByPath.values()) {
    if (document.metadata?.type !== "index") {
      continue;
    }
    visit(document.tree, "table", (table) => {
      const [, ...rows] = table.children;
      const columns = tableColumns(table);
      for (const row of rows) {
        const cells = row.children ?? [];
        for (const rawTarget of cells.flatMap((cell) => markdownLinks(cell))) {
          const resolved = resolveMarkdownTarget(
            repositoryRoot,
            document.filePath,
            rawTarget,
          );
          if (!resolved || resolved.escapedRepository) {
            continue;
          }
          const target = documentsByPath.get(path.normalize(resolved.targetPath));
          if (target?.metadata) {
            validateTableTarget(context, document, cells, columns, target);
          }
        }
      }
    });
  }
}

function validateAdrLifecycleIndex(context) {
  const { docsRoot, documentsByPath, errors, relative, repositoryRoot } = context;
  const indexPath = path.join(docsRoot, "decisions/README.md");
  const indexDocument = documentsByPath.get(indexPath);
  if (!indexDocument) {
    errors.push(`${relative(indexPath)}: ADR index is missing`);
    return;
  }
  const linksBySection = new Map();
  let section = "";
  for (const node of indexDocument.tree.children) {
    if (node.type === "heading" && node.depth === 2) {
      section = toString(node).trim().toLowerCase();
      continue;
    }
    for (const rawTarget of markdownLinks(node)) {
      const resolved = resolveMarkdownTarget(repositoryRoot, indexPath, rawTarget);
      if (!resolved || resolved.escapedRepository) {
        continue;
      }
      const target = documentsByPath.get(path.normalize(resolved.targetPath));
      if (target?.metadata?.type !== "adr") {
        continue;
      }
      const sections = linksBySection.get(target.metadata.id) ?? new Set();
      sections.add(section);
      linksBySection.set(target.metadata.id, sections);
    }
  }
  const expectedSectionByStatus = {
    accepted: "accepted decisions",
    proposed: "proposed decisions",
    superseded: "superseded decisions",
  };
  const lifecycleSections = Object.values(expectedSectionByStatus);
  for (const document of documentsByPath.values()) {
    if (document.metadata?.type !== "adr") {
      continue;
    }
    const expectedSection = expectedSectionByStatus[document.metadata.status];
    const sections = linksBySection.get(document.metadata.id) ?? new Set();
    if (!sections.has(expectedSection)) {
      errors.push(
        `${relative(document.filePath)}: ${document.metadata.status} ADR must be listed under "${expectedSection}" in ${relative(indexPath)}`,
      );
    }
    for (const lifecycleSection of lifecycleSections) {
      if (lifecycleSection !== expectedSection && sections.has(lifecycleSection)) {
        errors.push(
          `${relative(document.filePath)}: ADR is also listed under incorrect lifecycle section "${lifecycleSection}"`,
        );
      }
    }
  }
}

export async function validateDocumentIndexes(context) {
  await validateDirectoryIndexes(context);
  validateIndexTables(context);
  validateAdrLifecycleIndex(context);
}
