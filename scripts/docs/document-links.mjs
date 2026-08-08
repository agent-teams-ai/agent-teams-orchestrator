import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

import { parseMarkdown } from "./document-parser.mjs";

export function headingAnchors(tree) {
  const anchors = new Set();
  const slugger = new GithubSlugger();
  visit(tree, "heading", (node) => {
    anchors.add(slugger.slug(toString(node)));
  });
  return anchors;
}

export function markdownLinks(tree) {
  const links = [];
  visit(tree, (node) => {
    if (
      (node.type === "link" ||
        node.type === "image" ||
        node.type === "definition") &&
      typeof node.url === "string"
    ) {
      links.push(node.url);
    }
  });
  return links;
}

export function resolveMarkdownTarget(
  repositoryRoot,
  sourcePath,
  rawTarget,
) {
  if (
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawTarget) ||
    rawTarget.startsWith("/")
  ) {
    return null;
  }
  const [rawPath, rawAnchor = ""] = rawTarget.split("#", 2);
  const targetPath = rawPath
    ? path.resolve(path.dirname(sourcePath), decodeURIComponent(rawPath))
    : sourcePath;
  const repositoryRelative = path.relative(repositoryRoot, targetPath);
  return {
    anchor: decodeURIComponent(rawAnchor).toLowerCase(),
    escapedRepository:
      repositoryRelative === ".." ||
      repositoryRelative.startsWith(`..${path.sep}`),
    targetPath,
  };
}

export async function normalizeExistingTarget(targetPath) {
  try {
    const targetStat = await stat(targetPath);
    return targetStat.isDirectory()
      ? path.join(targetPath, "README.md")
      : targetPath;
  } catch {
    return targetPath;
  }
}

export async function validateLocalLinks(context) {
  const {
    allMarkdownFiles,
    documents,
    documentsByPath,
    entrypoint,
    errors,
    markdownTrees,
    relative,
    repositoryRoot,
  } = context;
  const localGraph = new Map();
  for (const filePath of allMarkdownFiles) {
    const targets = new Set();
    for (const rawTarget of markdownLinks(markdownTrees.get(filePath))) {
      const resolved = resolveMarkdownTarget(
        repositoryRoot,
        filePath,
        rawTarget,
      );
      if (!resolved) {
        continue;
      }
      if (resolved.escapedRepository) {
        errors.push(
          `${relative(filePath)}: local link escapes repository root: ${rawTarget}`,
        );
        continue;
      }
      const targetPath = await normalizeExistingTarget(resolved.targetPath);
      try {
        const targetStat = await stat(targetPath);
        if (!targetStat.isFile()) {
          throw new Error("not a file");
        }
      } catch {
        errors.push(`${relative(filePath)}: broken local link ${rawTarget}`);
        continue;
      }
      if (path.extname(targetPath) === ".md") {
        targets.add(targetPath);
      }
      if (resolved.anchor && path.extname(targetPath) === ".md") {
        const targetTree =
          markdownTrees.get(targetPath) ??
          parseMarkdown(await readFile(targetPath, "utf8"));
        if (!headingAnchors(targetTree).has(resolved.anchor)) {
          errors.push(
            `${relative(filePath)}: missing anchor #${resolved.anchor} in ${relative(targetPath)}`,
          );
        }
      }
    }
    localGraph.set(filePath, targets);
  }

  const reachable = new Set([entrypoint]);
  const queue = [entrypoint];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const target of localGraph.get(current) ?? []) {
      if (documentsByPath.has(target) && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  for (const document of documents) {
    if (!reachable.has(document.filePath)) {
      errors.push(
        `${relative(document.filePath)}: unreachable from docs/README.md`,
      );
    }
  }
}
